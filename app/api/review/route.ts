import { NextRequest, NextResponse } from "next/server";
import { listApplications, stores } from "@/lib/storage/store";
import { evaluateEligibility } from "@/lib/rules/eligibility";
import { calculateEvaluation } from "@/lib/rules/scoring";
import { buildRankEntry, rankApplications } from "@/lib/rules/ranking";
import { buildShortlist, defaultFinalSlots } from "@/lib/rules/shortlist";
import { detectContradictions, detectGaps, summarizeReadiness } from "@/lib/evidence/engines";

export const runtime = "nodejs";

/** GET /api/review — reviewer dataset feed (dashboard + ranking + shortlist). */
export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get("view") ?? "dashboard";
  const apps = listApplications();

  const enriched = apps.map((app) => {
    const eligibility = evaluateEligibility(app);
    const evaluation = calculateEvaluation(app);
    return {
      application: app,
      eligibility,
      evaluation,
      readiness: summarizeReadiness(app),
      contradictions: detectContradictions(app).length,
      gapCount: detectGaps(app).length,
    };
  });

  const ranked = rankApplications(
    enriched.map((e) =>
      buildRankEntry({
        application: e.application,
        eligibility: e.eligibility,
        evaluation: e.evaluation,
      })
    )
  );

  if (view === "ranking") {
    return NextResponse.json({ ok: true, ranked });
  }

  if (view === "shortlist") {
    const slots = Number(req.nextUrl.searchParams.get("slots") ?? defaultFinalSlots());
    const shortlist = buildShortlist(ranked, slots);
    return NextResponse.json({ ok: true, shortlist, finalSlots: slots });
  }

  return NextResponse.json({ ok: true, applications: enriched, ranked });
}

/**
 * POST /api/review — reviewer decision endpoints.
 * actions:
 *   - set-c7-route { applicationId, route: "C7a"|"C7b"|null, decidedBy }
 *   - resolve-contradiction { applicationId, contradictionId }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action;

  if (action === "set-c7-route") {
    const app = stores.applications.byId(body.applicationId);
    if (!app) return NextResponse.json({ ok: false, error: "application not found" }, { status: 404 });
    const route = body.route === "C7a" || body.route === "C7b" ? body.route : undefined;
    app.reviewerDecisions = {
      c7Route: route,
      decidedBy: body.decidedBy ?? "reviewer-demo",
      decidedAt: new Date().toISOString(),
    };
    stores.applications.update(app.id, { reviewerDecisions: app.reviewerDecisions });
    const evaluation = calculateEvaluation(app);
    stores.evaluations.upsert({ ...evaluation, applicationId: app.id, id: `eval_${app.id}` });
    return NextResponse.json({ ok: true, evaluation });
  }

  if (action === "resolve-contradiction") {
    const contra = stores.contradictions.byId(body.contradictionId);
    if (!contra) return NextResponse.json({ ok: false, error: "contradiction not found" }, { status: 404 });
    stores.contradictions.update(contra.id, { status: "resolved", resolvedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}