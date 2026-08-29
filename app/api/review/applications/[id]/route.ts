import { NextRequest, NextResponse } from "next/server";
import {
  getApplication,
  listEvidenceForApplication,
  listContradictions,
  listGaps,
  getEvaluation,
  getEligibility,
  stores,
} from "@/lib/storage/store";
import { detectContradictions, detectGaps, summarizeReadiness } from "@/lib/evidence/engines";
import { draftSdgAlignments } from "@/lib/knowledge/sdgs";
import { evaluateEligibility } from "@/lib/rules/eligibility";
import { calculateEvaluation } from "@/lib/rules/scoring";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const app = getApplication(params.id);
  if (!app) {
    return NextResponse.json({ ok: false, error: "application not found" }, { status: 404 });
  }

  const eligibility = getEligibility(params.id) ?? evaluateEligibility(app);
  const evaluation = getEvaluation(params.id) ?? calculateEvaluation(app);
  const liveContradictions = detectContradictions(app);
  const liveGaps = detectGaps(app);
  const readiness = summarizeReadiness(app);
  const evidence = listEvidenceForApplication(params.id);
  const session = stores.sessions.all().find((s) => s.applicationId === app.id);
  const audit = stores.audit.all().filter((a) => a.applicationId === app.id);

  const sdgDrafts = draftSdgAlignments([
    {
      text: String(app.application.impact.social_environmental_impact_osh ?? ""),
      evidenceRef: null,
    },
    {
      text: `${app.application.job_creation.projected_new_jobs ?? 0} new jobs`,
      evidenceRef: null,
    },
  ]);

  return NextResponse.json({
    ok: true,
    application: app,
    eligibility,
    evaluation,
    contradictions: liveContradictions,
    persistedContradictions: listContradictions(params.id),
    gaps: liveGaps,
    persistedGaps: listGaps(params.id),
    readiness,
    evidence,
    session,
    audit,
    sdgDrafts,
  });
}