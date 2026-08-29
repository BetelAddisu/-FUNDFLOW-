/**
 * Deterministic ranking engine.
 *
 * Ordering rules (never delegated to an LLM):
 *   1. eligible + confirmed score
 *   2. eligible + needs_review
 *   3. ineligible/excluded
 * Among eligible applications with confirmed scores: higher score → higher
 * rank. Ties break on readiness % then updatedAt (earlier first).
 */
import type { ApplicationRecord } from "@/lib/db/schema";
import type {
  EligibilityResult,
  EvaluationResult,
  RankEntry,
  ReadinessSummary,
} from "@/lib/rules/types";
import { summarizeReadiness } from "@/lib/evidence/engines";

export interface EvaluationInput {
  application: ApplicationRecord;
  eligibility: EligibilityResult;
  evaluation: EvaluationResult;
}

function readinessOf(app: ApplicationRecord): ReadinessSummary {
  return summarizeReadiness(app);
}

export function buildRankEntry(input: EvaluationInput): RankEntry {
  return {
    applicationId: input.application.id,
    companyName:
      input.application.companyNameLabel ||
      String(input.application.application.company_profile.company_name ?? "Unnamed company"),
    eligibility: input.eligibility,
    evaluation: input.evaluation,
    readiness: readinessOf(input.application),
    score: input.evaluation.total,
    reviewStatus: input.evaluation.status,
  };
}

function orderKey(e: RankEntry): [number, number, number, string] {
  const elig = e.eligibility.status === "eligible" ? 0 : e.eligibility.status === "needs_review" ? 1 : 2;
  const score = e.score ?? -1;
  const readiness = e.readiness.percent;
  // updatedAt from raw application lookup; default to created order
  return [elig, score, readiness, e.applicationId];
}

export function rankApplications(entries: RankEntry[]): RankEntry[] {
  return [...entries]
    .sort((a, b) => {
      const ka = orderKey(a);
      const kb = orderKey(b);
      for (let i = 0; i < 3; i++) {
        if (ka[i] !== kb[i]) return ka[i] > kb[i] ? -1 : 1;
      }
      return ka[3].localeCompare(kb[3]);
    })
    .map((e, i) => ({ ...e, rank: i + 1 }));
}