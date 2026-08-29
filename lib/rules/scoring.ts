/**
 * Deterministic evaluation engine.
 *
 * Every criterion is a pure function reading from the official grid config.
 * Undocumented bands produce `needs_review` with a reason — a score is
 * never invented. C7 exposes both variants (C7a employability, C7b
 * investment readiness) because the official routing rule is pending.
 */
import {
  GRID_VERSION,
  TOTAL_MAX,
  componentById,
  criterionById,
  variantById,
} from "@/lib/db/config";
import type { ApplicationRecord } from "@/lib/db/schema";
import type { CriterionResult, EvaluationResult } from "@/lib/rules/types";

export interface ScoreBand {
  lo?: number;
  hi?: number;
  score: number;
  label: string;
}

/** Match a numeric value against a band label such as ">50%", "41-50%", ">=25", ">400 jobs". */
function findBand(
  bands: Array<{ band: string; score: number }>,
  value: number
): { score: number; label: string } | null {
  for (const band of bands) {
    const label = band.band.trim();
    const clean = label.replace(/%|jobs?/gi, "").replace(/\s+/g, "");
    // Match a numeric op/range anywhere in the label, e.g. ">=75 local sourcing".
    const m = clean.match(/(?:^|[^0-9])((?:>=|>|<=|<|≤|=)?\d+(?:\.\d+)?(?:-(?:>=|>|<=|<|≤|=)?\d+(?:\.\d+)?)?)(?:$|[^0-9])/);
    if (!m) continue;
    const parts = m[1].match(/^(>=|>|<=|<|≤|=)?(\d+(?:\.\d+)?)(?:-((?:>=|>|<=|<|≤|=)?\d+(?:\.\d+)?))?$/);
    if (!parts) continue;
    const op = parts[1] ?? "=";
    const lo = parseFloat(parts[2]);
    const hi = parts[3] ? parseFloat(parts[3]) : NaN;

    let matched = false;
    if (op === ">" && value > lo) matched = true;
    else if (op === ">=" && value >= lo) matched = true;
    else if (op === "<" && value < lo) matched = true;
    else if (op === "<=" && value <= lo) matched = true;
    else if (op === "=" && !Number.isNaN(hi) && value >= lo && value <= hi) matched = true;
    else if (op === "=" && Number.isNaN(hi) && value === lo) matched = true;

    if (matched) return { score: band.score, label };
  }
  return null;
}

/** C1 Sales growth band. Value is percent (e.g. 30 for +30%). */
function scoreC1a(percent: number): CriterionResult {
  const def = componentById("C1", "C1a");
  const max = def?.maxScore ?? 5;
  const bands = def?.bands ?? [];
  const hit = findBand(bands, percent);
  if (!hit) {
    return {
      criterion: "C1a",
      name: "Sales growth",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: `Sales growth ${percent}% does not fall within a documented band (24–25% band omitted by source).`,
    };
  }
  return {
    criterion: "C1a",
    name: "Sales growth",
    score: hit.score,
    maxScore: max,
    status: "scored",
    basis: { field: "growth.sales_growth_pct", value: percent, source: "rules_engine", evidenceRef: null },
    reason: `Rule: ${hit.label} = ${hit.score}`,
  };
}

/** C1b Employment growth. Value is absolute change in employees. */
function scoreC1b(delta: number): CriterionResult {
  const def = componentById("C1", "C1b");
  const max = def?.maxScore ?? 5;
  const bands = def?.bands ?? [];
  const hit = findBand(bands, delta);
  if (!hit) {
    return {
      criterion: "C1b",
      name: "Employment growth",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: `Employment growth ${delta} does not fall within a documented band.`,
    };
  }
  return {
    criterion: "C1b",
    name: "Employment growth",
    score: hit.score,
    maxScore: max,
    status: "scored",
    basis: { field: "growth.employment_delta", value: delta, source: "rules_engine", evidenceRef: null },
    reason: `Rule: ${hit.label} = ${hit.score}`,
  };
}

/** C1 Success story = C1a + C1b when both scorable, else needs_review. */
function scoreC1(app: ApplicationRecord): CriterionResult {
  const source = app.application.growth;
  const s2023 = source["2023"]?.sales_etb;
  const s2024 = source["2024"]?.sales_etb;
  const e2023 = source["2023"]?.total_employees;
  const e2024 = source["2024"]?.total_employees;

  const c1a =
    s2023 !== null && s2023 !== undefined && s2023 > 0 && s2024 !== null && s2024 !== undefined
      ? scoreC1a(((s2024 - s2023) / s2023) * 100)
      : { ...scoreC1a(0), status: "needs_review" as const, reason: "Sales growth cannot be derived (missing baseline)." };

  let c1b: CriterionResult;
  if (e2023 !== null && e2023 !== undefined && e2024 !== null && e2024 !== undefined) {
    c1b = scoreC1b(e2024 - e2023);
  } else {
    c1b = {
      criterion: "C1b",
      name: "Employment growth",
      score: null,
      maxScore: 5,
      status: "needs_review",
      reason: "Employment growth cannot be derived (missing baseline).",
    };
  }

  if (c1a.status === "scored" && c1b.status === "scored") {
    return {
      criterion: "C1",
      name: "Success story",
      score: (c1a.score ?? 0) + (c1b.score ?? 0),
      maxScore: 10,
      status: "scored",
      reason: `${c1a.reason}; ${c1b.reason}`,
    };
  }
  return {
    criterion: "C1",
    name: "Success story",
    score: null,
    maxScore: 10,
    status: "needs_review",
    reason: [c1a.reason, c1b.reason].filter(Boolean).join("; ") || "Missing inputs.",
  };
}

/** C2 Uniqueness/USP — categorical; extractor supplies a typed value. */
function scoreC2(app: ApplicationRecord): CriterionResult {
  const def = criterionById("C2");
  const max = def?.maxScore ?? 5;
  const ev = app.evidence?.["products.product_service_uniqueness"];
  if (!ev || ev.value === null || ev.value === undefined) {
    return {
      criterion: "C2",
      name: "Uniqueness / USP",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: "Uniqueness not established.",
    };
  }
  const v = String(ev.value).toLowerCase();
  const bands = def?.bands ?? [];
  let score: number | null = null;
  let label = "";
  if (v.includes("new product") || v.includes("new service") || v.includes("new to ethiopia")) {
    score = 5; label = "New product/service in Ethiopia";
  } else if (v.includes("different from competitors")) {
    score = 3; label = "Not new but different from competitors";
  } else if (v.includes("essential") || v.includes("essen")) {
    score = 2; label = "Essential product to Ethiopia";
  } else if (v.includes("no unique")) {
    score = 1; label = "No unique features";
  }
  if (score === null) {
    return {
      criterion: "C2",
      name: "Uniqueness / USP",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: `Uniqueness "${v}" does not map to a documented category.`,
    };
  }
  const officialBand = bands.find((b) => b.score === score);
  return {
    criterion: "C2",
    name: "Uniqueness / USP",
    score,
    maxScore: max,
    status: "scored",
    basis: { field: "products.product_service_uniqueness", value: v, source: ev.source, evidenceRef: ev.evidenceRef?.id ?? null },
    reason: `Rule: ${officialBand?.band ?? label} = ${score}`,
  };
}

const MARKET_CATEGORIES: Array<{ keyword: string; score: number; label: string }> = [
  { keyword: "international", score: 5, label: "Reachable to international market" },
  { keyword: "import", score: 3, label: "Import-substituting product/service" },
  { keyword: "local", score: 2, label: "Local market only" },
];

/** C3 Market served — categorical. */
function scoreC3(app: ApplicationRecord): CriterionResult {
  const def = criterionById("C3");
  const max = def?.maxScore ?? 5;
  const ev = app.evidence?.["products.rows.market_served"] ?? app.evidence?.["motivation.market_overview"];
  if (!ev || ev.value === null || ev.value === undefined) {
    return {
      criterion: "C3",
      name: "Market served",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: "Market not established.",
    };
  }
  const v = String(ev.value).toLowerCase();
  const hit = MARKET_CATEGORIES.find((c) => v.includes(c.keyword));
  if (!hit) {
    return {
      criterion: "C3",
      name: "Market served",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: `Market "${v}" does not map to a documented category.`,
    };
  }
  return {
    criterion: "C3",
    name: "Market served",
    score: hit.score,
    maxScore: max,
    status: "scored",
    basis: { field: ev.field, value: v, source: ev.source, evidenceRef: ev.evidenceRef?.id ?? null },
    reason: `Rule: ${hit.label} = ${hit.score}`,
  };
}

/** C4 Supply chain — numeric local sourcing percentage; N/A → needs_review. */
function scoreC4(app: ApplicationRecord): CriterionResult {
  const def = criterionById("C4");
  const max = def?.maxScore ?? 5;
  const pct = app.application.sourcing.local_raw_material_percentage;
  if (pct === null || pct === undefined) {
    return {
      criterion: "C4",
      name: "Supply chain (local sourcing)",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: "Local sourcing percentage not established / not applicable.",
    };
  }
  const bands = def?.bands ?? [];
  const hit = findBand(bands, pct);
  if (!hit) {
    return {
      criterion: "C4",
      name: "Supply chain (local sourcing)",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: `Local sourcing ${pct}% does not fall within a documented band.`,
    };
  }
  return {
    criterion: "C4",
    name: "Supply chain (local sourcing)",
    score: hit.score,
    maxScore: max,
    status: "scored",
    basis: { field: "sourcing.local_raw_material_percentage", value: pct, source: "self_reported", evidenceRef: null },
    reason: `Rule: ${hit.label} = ${hit.score}`,
  };
}

function ownershipCategory(app: ApplicationRecord): { score: number; label: string } | null {
  const w = app.application.company_profile.ownership_percentage?.women_pct;
  const womenOwned = w !== null && w !== undefined && w > 0;
  // women-managed: management members include a female with a management position
  const womenManaged = app.application.management.members.some(
    (m) => m.gender === "female" && !!m.position
  );
  if (womenOwned) return { score: 5, label: "Women owned, partly or fully" };
  if (womenManaged) return { score: 3, label: "Not women-owned but women-managed" };
  if (w !== null && w !== undefined) return { score: 0, label: "Neither" };
  return null;
}

/** C5.1 Ownership/management. */
function scoreC51(app: ApplicationRecord): CriterionResult {
  const max = 5;
  const cat = ownershipCategory(app);
  if (!cat) {
    return {
      criterion: "C5.1",
      name: "Ownership/management",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: "Ownership not established.",
    };
  }
  return {
    criterion: "C5.1",
    name: "Ownership/management",
    score: cat.score,
    maxScore: max,
    status: "scored",
    basis: { field: "company_profile.ownership_percentage.women_pct", value: app.application.company_profile.ownership_percentage?.women_pct ?? null, source: "self_reported", evidenceRef: null },
    reason: `Rule: ${cat.label} = ${cat.score}`,
  };
}

/** Percentage derivation from female/total employees — nullable, never 0 by assumption. */
function derivePercent(female: number | null | undefined, total: number | null | undefined): number | null {
  if (female === null || female === undefined || total === null || total === undefined || total <= 0) return null;
  return (female / total) * 100;
}

function percentageCriterion(
  criterion: "C5.2" | "C5.3",
  name: string,
  percent: number | null,
  field: string,
  value: number | null,
  source: string
): CriterionResult {
  const max = 5;
  if (percent === null) {
    return {
      criterion,
      name,
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: `${name} percentage cannot be derived (female/total employees not established).`,
    };
  }
  const bands = componentById("C5", criterion)?.bands ?? [];
  const hit = findBand(bands, percent);
  if (!hit) {
    return {
      criterion,
      name,
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: `${percent.toFixed(0)}% does not fall within a documented band.`,
    };
  }
  return {
    criterion,
    name,
    score: hit.score,
    maxScore: max,
    status: "scored",
    basis: { field, value, source, evidenceRef: null },
    reason: `Rule: ${hit.label} = ${hit.score}`,
  };
}

function scoreC5(app: ApplicationRecord): CriterionResult {
  const c51 = scoreC51(app);
  const g2024 = app.application.growth["2024"];
  const female = g2024?.female_employees;
  const total = g2024?.total_employees;
  const youth = g2024?.youth_employees_18_24;
  const c52 = percentageCriterion(
    "C5.2",
    "Women employees",
    derivePercent(female, total),
    "growth.2024.female_employees",
    female ?? null,
    "self_reported"
  );
  const c53 = percentageCriterion(
    "C5.3",
    "Youth employees",
    derivePercent(youth, total),
    "growth.2024.youth_employees_18_24",
    youth ?? null,
    "self_reported"
  );

  if (c51.status === "scored" && c52.status === "scored" && c53.status === "scored") {
    return {
      criterion: "C5",
      name: "Ownership and demography",
      score: (c51.score ?? 0) + (c52.score ?? 0) + (c53.score ?? 0),
      maxScore: 15,
      status: "scored",
      reason: [c51.reason, c52.reason, c53.reason].filter(Boolean).join("; "),
    };
  }
  return {
    criterion: "C5",
    name: "Ownership and demography",
    score: null,
    maxScore: 15,
    status: "needs_review",
    reason: [c51.reason, c52.reason, c53.reason].filter(Boolean).join("; ") || "Missing inputs.",
  };
}

/** C6 Expected results — count of established expected results. */
function scoreC6(app: ApplicationRecord): CriterionResult {
  const max = 20;
  const ev = app.evidence?.["intervention.expected_results"];
  const expected = app.application.intervention.expected_results;
  const count = expected
    ? expected
        .split(/\n|\.\s+|;\s*|•/)
        .map((x) => x.trim())
        .filter((x) => x.length > 2).length
    : 0;
  const bands: Array<[number, number]> = [[1, 10], [2, 15], [3, 20]];

  if (!ev || ev.value === null || ev.value === undefined || count === 0) {
    return {
      criterion: "C6",
      name: "Expected result",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: "Expected results not established (no documented band for zero/unresolved).",
    };
  }
  const hit = bands.find(([n]) => n === count);
  if (!hit) {
    return {
      criterion: "C6",
      name: "Expected result",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: `${count} expected results do not fall within a documented band.`,
    };
  }
  return {
    criterion: "C6",
    name: "Expected result",
    score: hit[1],
    maxScore: max,
    status: "scored",
    basis: { field: "intervention.expected_results", value: expected, source: ev.source, evidenceRef: ev.evidenceRef?.id ?? null },
    reason: `Rule: ${count} expected results achieved = ${hit[1]}`,
  };
}

/** C7a Employability — total projected new jobs. */
function scoreC7a(app: ApplicationRecord): CriterionResult {
  const def = variantById("C7", "C7a");
  const max = def?.maxScore ?? 25;
  const jobs = app.application.job_creation.projected_new_jobs;
  const totalPositions = app.application.job_creation.positions.reduce(
    (acc, p) => acc + (p.number_of_new_jobs ?? 0),
    0
  );
  const value = jobs ?? totalPositions ?? null;
  if (value === null) {
    return {
      criterion: "C7a",
      name: "Job creation potential (Employability)",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: "Projected new jobs not established.",
    };
  }
  const bands = def?.bands ?? [];
  const hit = findBand(bands, value);
  if (!hit) {
    return {
      criterion: "C7a",
      name: "Job creation potential (Employability)",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: `${value} jobs does not fall within a documented band (no band below 200).`,
    };
  }
  return {
    criterion: "C7a",
    name: "Job creation potential (Employability)",
    score: hit.score,
    maxScore: max,
    status: "scored",
    basis: { field: "job_creation.projected_new_jobs", value, source: "self_reported", evidenceRef: null },
    reason: `Rule: ${hit.label} = ${hit.score}`,
  };
}

/** C7b Investment readiness — numeric "investment readiness" value 15+ (per grid). */
function scoreC7b(app: ApplicationRecord): CriterionResult {
  const def = variantById("C7", "C7b");
  const max = def?.maxScore ?? 25;
  const ev = app.evidence?.["intervention.investment_readiness"];
  const value = ev?.value !== null && ev?.value !== undefined ? Number(ev.value) : null;
  if (value === null || Number.isNaN(value)) {
    return {
      criterion: "C7b",
      name: "Job creation potential (Investment readiness)",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: "Investment readiness value not established.",
    };
  }
  const bands = def?.bands ?? [];
  const hit = findBand(bands, value);
  if (!hit) {
    return {
      criterion: "C7b",
      name: "Job creation potential (Investment readiness)",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: `${value} does not fall within a documented band (no band below 15).`,
    };
  }
  return {
    criterion: "C7b",
    name: "Job creation potential (Investment readiness)",
    score: hit.score,
    maxScore: max,
    status: "scored",
    basis: { field: "intervention.investment_readiness", value, source: ev.source, evidenceRef: ev.evidenceRef?.id ?? null },
    reason: `Rule: ${hit.label} = ${hit.score}`,
  };
}

/** C8 Management capacity — established core management members. */
function scoreC8(app: ApplicationRecord): CriterionResult {
  const max = 5;
  const members = app.application.management.members.filter((m) => !!m.name && !!m.position);
  const count = members.length;
  if (count === 0) {
    return {
      criterion: "C8",
      name: "Management capacity",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: "Core management members not established.",
    };
  }
  if (count === 1) {
    return {
      criterion: "C8",
      name: "Management capacity",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: `${count} member does not fall within a documented band (only 2, 3, 4+ documented).`,
    };
  }
  if (count === 2) {
    return {
      criterion: "C8",
      name: "Management capacity",
      score: 0,
      maxScore: max,
      status: "scored",
      basis: { field: "management.members", value: count, source: "self_reported", evidenceRef: null },
      reason: "Rule: 2 members = 0",
    };
  }
  if (count === 3) {
    return {
      criterion: "C8",
      name: "Management capacity",
      score: 3,
      maxScore: max,
      status: "scored",
      basis: { field: "management.members", value: count, source: "self_reported", evidenceRef: null },
      reason: "Rule: 3 members = 3",
    };
  }
  return {
    criterion: "C8",
    name: "Management capacity",
    score: 5,
    maxScore: max,
    status: "scored",
    basis: { field: "management.members", value: count, source: "self_reported", evidenceRef: null },
    reason: "Rule: 4+ members = 5",
  };
}

/** C9 Social/environmental impact — typed evidence from extractor. */
function scoreC9(app: ApplicationRecord): CriterionResult {
  const max = 10;
  const ev = app.evidence?.["impact.social_environmental_category"];
  const text =
    app.evidence?.["impact.social_environmental_impact_osh"]?.value ??
    app.application.impact.social_environmental_impact_osh;
  if ((!ev || ev.value === null || ev.value === undefined) && !text) {
    return {
      criterion: "C9",
      name: "Positive social/environmental impact",
      score: null,
      maxScore: max,
      status: "needs_review",
      reason: "Impact not established.",
    };
  }
  const v = String(ev?.value ?? text).toLowerCase();
  const green = [
    "renewable energy",
    "efficient construction",
    "electric mobility",
    "ev",
    "organic",
    "sustainable agriculture",
    "sustainable forestry",
    "recycling",
    "water-saving",
    "energy-saving",
    "eco-tourism",
    "green",
  ].some((k) => v.includes(k));
  const social = ["social", "job", "community", "women", "youth", "school", "health"].some((k) => v.includes(k));
  const environmental = ["environment", "solar", "energy", "waste", "recycl", "water", "forest", "emission"].some((k) => v.includes(k));

  let score: number | null = null;
  let label = "";
  if (green) { score = 10; label = "Green business model"; }
  else if (social && environmental) { score = 8; label = "Both positive social and environmental impact"; }
  else if (social || environmental) { score = 5; label = "Either social or environmental impact"; }
  else { score = 0; label = "Neither"; }

  return {
    criterion: "C9",
    name: "Positive social/environmental impact",
    score,
    maxScore: max,
    status: "scored",
    basis: { field: "impact.social_environmental_impact_osh", value: text, source: ev?.source ?? "self_reported", evidenceRef: ev?.evidenceRef?.id ?? null },
    reason: `Rule: ${label} = ${score}`,
  };
}

export function calculateEvaluation(app: ApplicationRecord): EvaluationResult {
  const c1 = scoreC1(app);
  const c2 = scoreC2(app);
  const c3 = scoreC3(app);
  const c4 = scoreC4(app);
  const c5 = scoreC5(app);
  const c6 = scoreC6(app);
  const c7a = scoreC7a(app);
  const c7b = scoreC7b(app);
  const c8 = scoreC8(app);
  const c9 = scoreC9(app);

  const baseScores: CriterionResult[] = [c1, c2, c3, c4, c5, c6, c8, c9];

  // The single "C7" slot (25 pts) stays needs_review while the official
  // routing rule between C7a and C7b is pending. The system never chooses a
  // variant. A human reviewer can set reviewerDecisions.c7Route on the
  // application; only then does C7 contribute to the scored total.
  const c7Route = app.reviewerDecisions?.c7Route;
  let c7Slot: CriterionResult;
  if (c7Route === "C7a" || c7Route === "C7b") {
    const chosen = c7Route === "C7a" ? c7a : c7b;
    c7Slot = {
      criterion: "C7",
      name: "Job creation potential",
      score: chosen.score,
      maxScore: 25,
      status: chosen.status,
      reason:
        chosen.status === "scored"
          ? `${chosen.criterion} selected by reviewer decision (routing rule pending). ${chosen.reason}`
          : chosen.reason,
      basis: chosen.basis,
    };
  } else {
    c7Slot = {
      criterion: "C7",
      name: "Job creation potential",
      score: null,
      maxScore: 25,
      status: "needs_review",
      reason: "C7a/C7b routing rule pending in official material; reviewer decision required.",
    };
  }

  const allForTotal: CriterionResult[] = [...baseScores, c7Slot];
  const scorableForTotal = allForTotal.filter((c) => c.status === "scored");

  const total =
    scorableForTotal.length === allForTotal.length
      ? scorableForTotal.reduce((acc, c) => acc + (c.score ?? 0), 0)
      : null;
  const unresolved = allForTotal.filter((c) => c.status === "needs_review");

  return {
    applicationId: app.id,
    gridVersion: GRID_VERSION,
    criteria: [...baseScores, c7Slot],
    total,
    maxTotal: TOTAL_MAX,
    status: total === null ? "needs_review" : "scored",
    reasons: unresolved.map((u) => `${u.criterion}: ${u.reason}`),
    c7: {
      routing: "pending",
      variants: { c7a, c7b },
    },
    calculatedAt: new Date().toISOString(),
  };
}