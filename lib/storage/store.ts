/**
 * Data access layer. Singleton per-process JSON stores behind a store
 * interface that mirrors the suggested PostgreSQL tables
 * (applications, application_fields/evidence, interview_sessions,
 * interview_messages, evidence/documents, contradictions, gaps,
 * evaluation_results, shortlists, audit_events, provider_events).
 */
import { JsonStore } from "@/lib/storage/json-store";
import type {
  ApplicationRecord,
  EvidenceRecord,
  InterviewSession,
} from "@/lib/db/schema";
import type {
  Contradiction,
  Gap,
} from "@/lib/evidence/engines";
import type { EvaluationResult, EligibilityResult, ShortlistResult } from "@/lib/rules/types";

/** Persisted result rows carry an `id` for the JSON store. */
export type StoredEvaluation = EvaluationResult & { id: string };
export type StoredEligibility = EligibilityResult & { id: string };
export type StoredShortlist = ShortlistResult & { id: string };

export interface AuditEvent {
  id: string;
  event: string;
  applicationId?: string;
  actor: "applicant" | "system" | "interview_agent" | "extraction_agent" | "rules_engine" | "reviewer" | "synthetic_seed";
  details: Record<string, unknown>;
  gridVersion?: string;
  timestamp: string;
}

export interface ProviderEvent {
  id: string;
  applicationId?: string;
  provider: string;
  capability: "stt" | "vision" | "reasoning" | "tts";
  outcome: "success" | "failure" | "fallback";
  error?: string;
  latencyMs?: number;
  timestamp: string;
}

export interface GapRecord extends Gap {
  id: string;
  applicationId: string;
}

export const stores = {
  applications: new JsonStore<ApplicationRecord>("applications"),
  sessions: new JsonStore<InterviewSession>("sessions"),
  evidence: new JsonStore<EvidenceRecord>("evidence"),
  contradictions: new JsonStore<Contradiction>("contradictions"),
  gaps: new JsonStore<GapRecord>("gaps"),
  evaluations: new JsonStore<StoredEvaluation>("evaluations"),
  eligibilities: new JsonStore<StoredEligibility>("eligibilities"),
  shortlists: new JsonStore<StoredShortlist>("shortlists"),
  audit: new JsonStore<AuditEvent>("audit"),
  providers: new JsonStore<ProviderEvent>("provider_events"),
};

export function listApplications(): ApplicationRecord[] {
  return [...stores.applications.all()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function getApplication(id: string): ApplicationRecord | undefined {
  return stores.applications.byId(id);
}

export function listSessions(): InterviewSession[] {
  return stores.sessions.all();
}

export function listEvidenceForApplication(applicationId: string): EvidenceRecord[] {
  return stores.evidence.all().filter((e) => e.applicationId === applicationId);
}

export function listEvaluations(): EvaluationResult[] {
  return stores.evaluations.all();
}

export function getEvaluation(applicationId: string): EvaluationResult | undefined {
  return stores.evaluations.all().find((e) => e.applicationId === applicationId);
}

export function getEligibility(applicationId: string): EligibilityResult | undefined {
  return stores.eligibilities.all().find((e) => e.applicationId === applicationId);
}

export function listContradictions(applicationId: string): Contradiction[] {
  return stores.contradictions
    .all()
    .filter((c) => c.applicationId === applicationId);
}

export function listGaps(applicationId: string): GapRecord[] {
  return stores.gaps
    .all()
    .filter((g) => g.applicationId === applicationId);
}

export function recordAudit(event: Omit<AuditEvent, "id" | "timestamp">): void {
  stores.audit.insert({
    ...event,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  });
}

export function recordProviderEvent(
  event: Omit<ProviderEvent, "id" | "timestamp">
): void {
  stores.providers.insert({
    ...event,
    id: `prov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  });
}

export function listAuditForApplication(applicationId: string): AuditEvent[] {
  return stores.audit
    .all()
    .filter((a) => a.applicationId === applicationId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function allData(): Record<string, unknown> {
  return {
    applications: stores.applications.all(),
    sessions: stores.sessions.all(),
    evidence: stores.evidence.all(),
    contradictions: stores.contradictions.all(),
    gaps: stores.gaps.all(),
    evaluations: stores.evaluations.all(),
    eligibilities: stores.eligibilities.all(),
    shortlists: stores.shortlists.all(),
    audit: stores.audit.all(),
    provider_events: stores.providers.all(),
  };
}

export function clearAllData(): void {
  for (const s of Object.values(stores)) s.clear();
}