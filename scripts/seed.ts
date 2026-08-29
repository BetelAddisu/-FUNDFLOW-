/**
 * Seed script — replays labeled synthetic conversations through the real
 * interview pipeline (same extraction + rules + storage the API uses).
 *
 * Run: npx tsx scripts/seed.ts
 */
import fs from "node:fs";
import path from "node:path";
import { processTurn, startApplication } from "../lib/interview/session-service";
import { clearAllData, stores } from "../lib/storage/store";
import { evaluateEligibility } from "../lib/rules/eligibility";
import { calculateEvaluation } from "../lib/rules/scoring";

interface SeedApp {
  id: string;
  label: string;
  channel: "web" | "telegram";
  language: "en" | "am" | "om";
  status: string;
  scenario: string;
  shots: string[];
  reviewerDecisions?: { c7Route?: "C7a" | "C7b"; decidedBy?: string };
}

async function main(): Promise<void> {
  clearAllData();
  const file = path.join(process.cwd(), "fixtures", "applications", "synthetic-applications.json");
  const payload = JSON.parse(fs.readFileSync(file, "utf8")) as { applications: SeedApp[] };

  for (const seed of payload.applications) {
    await startApplication(seed.channel, seed.language, `sess_seed_${seed.id}`, seed.id);

    for (const shot of seed.shots) {
      await processTurn(
        { type: "text", text: shot },
        {
          channel: seed.channel,
          language: seed.language,
          sessionId: `sess_seed_${seed.id}`,
          applicationId: seed.id,
        }
      );
    }

    if (seed.reviewerDecisions?.c7Route) {
      const stored = stores.applications.byId(seed.id);
      if (stored) {
        stored.reviewerDecisions = {
          c7Route: seed.reviewerDecisions.c7Route,
          decidedBy: seed.reviewerDecisions.decidedBy ?? "reviewer-demo",
          decidedAt: new Date().toISOString(),
        };
        stores.applications.update(seed.id, { reviewerDecisions: stored.reviewerDecisions });
        // Recompute + persist eligibility/evaluation now that the C7 route is
        // set, so stored rules match the reviewer decision.
        const eligibility = evaluateEligibility(stored);
        const evaluation = calculateEvaluation(stored);
        stores.eligibilities.upsert({ ...eligibility, applicationId: seed.id, id: `elig_${seed.id}` });
        stores.evaluations.upsert({ ...evaluation, applicationId: seed.id, id: `eval_${seed.id}` });
      }
    }
    console.log(`Seeded ${seed.id} (${seed.label})`);
  }

  console.log(
    `Done. ${stores.applications.all().length} applications, ${stores.sessions.all().length} sessions, ` +
      `${stores.contradictions.all().length} contradictions recorded.`
  );
}

void main();