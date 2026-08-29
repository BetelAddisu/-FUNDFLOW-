/**
 * InterviewSessionService — the single shared engine for the web chatbot
 * and the Telegram bot. Both channels feed identical evidence into the same
 * canonical application and reviewer pipeline.
 *
 * Flow per input: normalize → (audio? STT) → extract → detect
 * contradictions → update gaps → next question (state machine) → reply.
 */
import { randomUUID } from "node:crypto";
import { emptyApplication, type Application, type ApplicationRecord, type InterviewSession, type MessageTurn } from "@/lib/db/schema";
import type { EvidenceMap, EvidenceRef } from "@/lib/evidence/types";
import { detectContradictions, detectGaps, summarizeReadiness } from "@/lib/evidence/engines";
import { extractFromTurn } from "@/lib/evidence/extractor";
import { defaultVisionManager } from "@/lib/ai/vision/manager";
import { evaluateEligibility } from "@/lib/rules/eligibility";
import { calculateEvaluation } from "@/lib/rules/scoring";
import { recordAudit, recordProviderEvent, stores } from "@/lib/storage/store";
import { computeState, nextQuestionId, type InterviewState } from "@/lib/interview/state-machine";
import { languagePack, detectLanguage } from "@/lib/knowledge/languages";
import type { ChannelInput, ChannelResponse, ChannelContext } from "@/lib/channels/types";
import { defaultVoiceManager } from "@/lib/ai/speech/manager";
import { draftSdgAlignments } from "@/lib/knowledge/sdgs";

export interface TurnResult {
  reply: string;
  session: InterviewSession;
  application: ApplicationRecord;
  state: InterviewState;
  transcript?: string;
  provider?: string;
  applied?: ExtractResultSummary[];
}

interface ExtractResultSummary {
  field: string;
  status: string;
  note: string;
}

let turnCounter = 0;

function evidenceRefFor(turn: MessageTurn, kind: EvidenceRef["kind"]): EvidenceRef {
  return { kind, id: turn.evidenceRef ?? `${kind}_${turn.id.split("_")[1] ?? turn.id}` };
}

function upsertApplicationRecord(
  channel: "web" | "telegram",
  language: "en" | "am" | "om" | "unknown",
  existing?: ApplicationRecord,
  idOverride?: string
): ApplicationRecord {
  if (existing) {
    existing.updatedAt = new Date().toISOString();
    return stores.applications.update(existing.id, { updatedAt: existing.updatedAt }) ?? existing;
  }
  const id = idOverride ?? `app_${randomUUID().slice(0, 8)}`;
  const record: ApplicationRecord = {
    id,
    companyNameLabel: "",
    channel,
    language,
    status: "in_progress",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    application: emptyApplication(),
    evidence: {},
  };
  stores.applications.insert(record);
  return record;
}

function upsertSession(
  applicationId: string,
  channel: "web" | "telegram",
  language: "en" | "am" | "om",
  existingSession?: InterviewSession,
  sessionIdOverride?: string
): InterviewSession {
  if (existingSession) {
    existingSession.updatedAt = new Date().toISOString();
    return stores.sessions.update(existingSession.id, {
      updatedAt: existingSession.updatedAt,
      language,
      lastAgentMessage: existingSession.lastAgentMessage,
    }) ?? existingSession;
  }
  const id = sessionIdOverride ?? `sess_${randomUUID().slice(0, 8)}`;
  const session: InterviewSession = {
    id,
    applicationId,
    channel,
    language,
    state: "consent",
    consentEstablished: false,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    turns: [],
  };
  stores.sessions.insert(session);
  return session;
}

function appendTurn(session: InterviewSession, turn: MessageTurn): InterviewSession {
  session.turns.push(turn);
  session.updatedAt = new Date().toISOString();
  return stores.sessions.update(session.id, {
    turns: session.turns,
    updatedAt: session.updatedAt,
  }) ?? session;
}

function rebuildApplication(record: ApplicationRecord, app: Application, evidence: EvidenceMap): ApplicationRecord {
  const updated = stores.applications.update(record.id, {
    application: app,
    evidence,
    companyNameLabel: String(app.company_profile.company_name ?? record.companyNameLabel ?? ""),
    updatedAt: new Date().toISOString(),
  });
  return updated ?? record;
}

function refreshRules(record: ApplicationRecord): void {
  // Deterministic engines: eligibility, evaluation, contradictions, gaps.
  const eligibility = evaluateEligibility(record);
  const evaluation = calculateEvaluation(record);
  const contradictions = detectContradictions(record);
  const gaps = detectGaps(record);

  stores.eligibilities.upsert({ ...eligibility, applicationId: record.id, id: `elig_${record.id}` });
  stores.evaluations.upsert({ ...evaluation, applicationId: record.id, id: `eval_${record.id}` });
  const existingContraIds = new Set(
    stores.contradictions.all().filter((c) => c.applicationId === record.id).map((c) => c.id)
  );
  for (const contra of contradictions) {
    if (!existingContraIds.has(contra.id)) stores.contradictions.insert(contra);
  }
  for (const gap of gaps) {
    const gapId = `gap_${record.id}_${gap.field.replace(/[^a-zA-Z0-9]/g, "_")}`;
    if (!stores.gaps.byId(gapId)) {
      stores.gaps.insert({ ...gap, id: gapId, applicationId: record.id });
    }
  }

  recordAudit({
    event: "rules_recalculated",
    applicationId: record.id,
    actor: "rules_engine",
    details: {
      eligibility: eligibility.status,
      evaluationStatus: evaluation.status,
      total: evaluation.total,
      contradictionCount: contradictions.length,
      gapCount: gaps.length,
      sdgDrafts: draftSdgAlignments([
        { text: String(appText(record)), evidenceRef: null },
      ]).map((d) => d.sdg),
    },
  });
}

function appText(record: ApplicationRecord): string {
  const a = record.application;
  return [
    a.company_overview.company_overview,
    a.products.product_service_uniqueness,
    a.impact.social_environmental_impact_osh,
    a.intervention.expected_results,
  ].filter(Boolean).join(" ");
}

/**
 * Process one channel input. Non-blocking design: returns a pending
 * response string so the applicant always gets a graceful message even
 * while providers are slow or down.
 */
export async function processTurn(
  input: ChannelInput,
  context: ChannelContext
): Promise<TurnResult> {
  turnCounter += 1;
  const language = context.language ?? detectLanguage(input.type === "text" ? input.text : (input as { caption?: string }).caption ?? "");
  const sessionLanguage: "en" | "am" | "om" =
    language === "am" || language === "om" ? language : "en";

  const existingApp = context.applicationId ? stores.applications.byId(context.applicationId) : undefined;
  const existingSession = context.sessionId ? stores.sessions.byId(context.sessionId) : undefined;

  const record = upsertApplicationRecord(context.channel, sessionLanguage, existingApp);
  const session = upsertSession(record.id, context.channel, sessionLanguage, existingSession);

  const turnId = `turn_${Date.now()}_${turnCounter}`;
  const turn: MessageTurn = {
    id: turnId,
    channel: context.channel,
    role: "applicant",
    type: input.type,
    text: input.type === "text" ? input.text : undefined,
    language: detectLanguage(input.type === "text" ? input.text : ""),
    evidenceRef: turnId,
    createdAt: new Date().toISOString(),
    fileRef: input.type !== "text" ? input.fileRef : undefined,
  };
  appendTurn(session, turn);

  // Transcribe audio if needed.
  let text = input.type === "text" ? input.text : "";
  let transcript: string | undefined;
  let provider: string | undefined;
  let audioError: string | undefined;

  if (input.type === "audio") {
    if (input.transcriptOverride) {
      transcript = input.transcriptOverride;
      provider = "fixture";
      recordProviderEvent({
        provider: "fixture",
        capability: "stt",
        outcome: "success",
        applicationId: record.id,
      });
    } else {
      const sttResult = await defaultVoiceManager.transcribe({
        data: input.fileRef,
        mimeType: input.mimeType,
        durationSeconds: input.durationSeconds,
      });
      if (sttResult.status === "ok" && sttResult.text) {
        transcript = sttResult.text;
        provider = sttResult.provider;
      } else {
        audioError = sttResult.error ?? "speech_recognition_failed";
        recordProviderEvent({
          provider: "stt",
          capability: "stt",
          outcome: "failure",
          error: audioError,
          applicationId: record.id,
        });
      }
    }
    if (transcript) text = transcript;
  }

  // Vision on images (only legible document details become evidence).
  let documentExtractions: Array<{ field: string; value: string; source: "document_supported" }> = [];
  let visionNote: string | undefined;
  if (input.type === "image") {
    const vision = await defaultVisionManager.analyze({
      data: input.fileRef,
      mimeType: input.mimeType,
      documentKind: input.documentKind ?? "workshop",
    });
    if (input.documentExtractions) {
      visionNote = "Document details extracted from the uploaded photo (fixture).";
      documentExtractions = input.documentExtractions.map((d) => ({
        field: d.field,
        value: d.value,
        source: "document_supported" as const,
      }));
    } else if (vision.status === "established") {
      visionNote = vision.description;
      documentExtractions = vision.extractedFields?.map((f) => ({
        field: f.field,
        value: f.value,
        source: "document_supported" as const,
      })) ?? [];
    } else {
      // Unreadable / no vision model → not_established, never invented OCR.
      visionNote = vision.reason ?? "Image saved; details not established.";
      const f = structuredClone(record.evidence);
      f[`document.${input.fileRef}`] = makeNotEstablished(vision.reason ?? "image_unreadable");
      record.evidence = f;
    }
  }

  // Extract evidence.
  const extractResult = extractFromTurn({
    text,
    language,
    evidenceRef: evidenceRefFor(turn, input.type === "image" ? "photo" : input.type === "audio" ? "audio" : "turn"),
    documentExtractions: documentExtractions.length > 0 ? documentExtractions : undefined,
    currentApplication: record.application ?? emptyApplication(),
    currentEvidence: record.evidence ?? {},
  });

  const updatedRecord = rebuildApplication(record, extractResult.application, extractResult.evidence);

  // Store evidence record if the input carried a file.
  if (input.type !== "text") {
    stores.evidence.insert({
      id: `doc_${turnCounter}_${Date.now()}`,
      applicationId: record.id,
      kind: input.type === "audio" ? "audio" : "photo",
      label: input.type === "audio" ? "Voice message" : input.caption ?? "Uploaded photo",
      storagePath: input.fileRef,
      createdAt: new Date().toISOString(),
      description: visionNote ?? (input.type === "audio" ? (transcript ?? "Audio received") : "Photo received"),
      extractionSummary: documentExtractions.length > 0
        ? documentExtractions.map((d) => `${d.field}: ${d.value}`).join("; ")
        : undefined,
    });
  }

  // Refresh deterministic rules.
  refreshRules(updatedRecord);

  recordAudit({
    event: "applicant_turn_processed",
    applicationId: record.id,
    actor: "interview_agent",
    details: {
      channel: context.channel,
      inputType: input.type,
      provider,
      transcript: transcript?.slice(0, 200),
      applied: (extractResult.applied as unknown as ExtractResultSummary[]).slice(0, 20),
    },
  });

  // Build the reply + next question.
  const state = computeState(updatedRecord.application, updatedRecord.evidence);
  const pack = languagePack(sessionLanguage);
  const question = nextQuestionId(state, updatedRecord.evidence);
  const questionText = question === "complete" ? pack.questions.complete : pack.questions[question];

  let prefix = "";
  if (audioError) {
    prefix = `${pack.helpers.audio_failed} `;
  } else if (input.type === "image") {
    prefix = `${pack.helpers.attached_photo} ${visionNote ? `${visionNote} ` : ""}`;
  } else if (input.type === "audio" && transcript) {
    prefix = `I heard: "${transcript}". `;
  }

  const summary = summarizeReadiness({ ...updatedRecord, application: updatedRecord.application });
  const reply = `${prefix}${questionText}`;

  const agentTurn: MessageTurn = {
    id: `turn_${Date.now()}_${turnCounter}_ai`,
    channel: context.channel,
    role: "assistant",
    type: "text",
    text: reply,
    language: sessionLanguage,
    createdAt: new Date().toISOString(),
  };
  appendTurn(session, agentTurn);

  stores.sessions.update(session.id, {
    state: state.name,
    lastAgentMessage: reply,
    consentEstablished: session.consentEstablished,
  });

  return {
    reply,
    session,
    application: updatedRecord,
    state,
    transcript,
    provider,
    applied: extractResult.applied as unknown as ExtractResultSummary[],
  };
}

function makeNotEstablished(reason: string) {
  return {
    field: "document",
    value: null,
    source: "visually_observed" as const,
    status: "not_established" as const,
    confidence: null,
    precision: "unknown" as const,
    evidenceRef: null,
    language: "unknown" as const,
    reason,
    updatedAt: new Date().toISOString(),
  };
}

export interface ChannelReplyOptions {
  language: string;
}

/** Create a fresh session and return the welcome message. */
export async function startApplication(
  channel: "web" | "telegram",
  language: "en" | "am" | "om",
  sessionIdOverride?: string,
  applicationIdOverride?: string
): Promise<{ session: InterviewSession; record: ApplicationRecord; welcome: string; question: string }> {
  const record = upsertApplicationRecord(channel, language, undefined, applicationIdOverride);
  const session = upsertSession(record.id, channel, language, undefined, sessionIdOverride);
  const pack = languagePack(language);
  const welcome = pack.welcome;
  const firstQuestion = pack.questions.consent;

  const welcomeTurn: MessageTurn = {
    id: `turn_${Date.now()}_welcome`,
    channel,
    role: "assistant",
    type: "text",
    text: `${welcome} ${firstQuestion}`,
    language,
    createdAt: new Date().toISOString(),
  };
  appendTurn(session, welcomeTurn);
  recordAudit({
    event: "application_started",
    applicationId: record.id,
    actor: "applicant",
    details: { channel, language },
  });
  return { session, record, welcome, question: firstQuestion };
}