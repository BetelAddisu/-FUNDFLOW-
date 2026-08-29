/**
 * Shortlist engine. Deterministic and configurable.
 *   shortlist_size = final_slots * 2
 * Only eligible applications with a confirmable score belong to the
 * shortlist. The result is a defensible ranked shortlist prepared for the
 * human verification stage — nothing more.
 */
import type { RankEntry, ShortlistResult } from "@/lib/rules/types";

export function buildShortlist(
  ranked: RankEntry[],
  finalSlots = 5
): ShortlistResult {
  const shortlistSize = finalSlots * 2;
  const shortlistable = ranked.filter(
    (r) =>
      r.eligibility.status === "eligible" &&
      r.evaluation.status === "scored" &&
      r.score !== null
  );
  return {
    finalSlots,
    shortlistSize,
    entries: shortlistable.slice(0, shortlistSize),
    generatedAt: new Date().toISOString(),
  };
}

export function defaultFinalSlots(): number {
  const fromEnv = Number(process.env.FUNDFLOW_FINAL_SLOTS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 5;
}