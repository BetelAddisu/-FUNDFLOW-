/**
 * Interview state machine. The state reflects real application coverage,
 * not a fixed list of questions. A turn that contributes evidence for one
 * area moves the interview toward completeness; gaps drive the next
 * question.
 */
import type { Application, GrowthYear } from "@/lib/db/schema";
import type { EvidenceMap, EvidenceField } from "@/lib/evidence/types";
import type { QuestionId } from "@/lib/knowledge/languages/en";

export type InterviewStateName =
  | "consent"
  | "company_profile"
  | "growth"
  | "market"
  | "management"
  | "intervention"
  | "impact"
  | "review"
  | "complete";

export type InterviewState = {
  name: InterviewStateName;
  /** applicability of each question based on evidence + task knowledge */
  coverage: Record<string, "required" | "established" | "not_applicable">;
};

const stateOrder: InterviewStateName[] = [
  "consent",
  "company_profile",
  "growth",
  "market",
  "management",
  "intervention",
  "impact",
  "review",
  "complete",
];

function firstOpen(covered: Record<string, boolean>, order: string[]): string | null {
  return order.find((k) => !covered[k]) ?? null;
}

function growthRowEstablished(row: GrowthYear | undefined): boolean {
  if (!row) return false;
  return (
    (row.sales_etb !== null && row.sales_etb !== undefined) ||
    (row.total_employees !== null && row.total_employees !== undefined)
  );
}

export function computeCoverage(app: Application, evidence: EvidenceMap): Record<string, boolean> {
  const cp = app.company_profile;
  const g = app.growth;
  const covered: Record<string, boolean> = {
    consent: true,
    company_name: !!cp.company_name,
    registration_number: !!cp.business_registration_number,
    business_type: !!cp.business_type,
    years_operating: cp.years_in_operation !== null && cp.years_in_operation !== undefined,
    ownership: (cp.ownership_percentage?.women_pct !== null && cp.ownership_percentage?.women_pct !== undefined) ||
      (cp.ownership_percentage?.men_pct !== null && cp.ownership_percentage?.men_pct !== undefined),
    overview: !!cp.company_name || !!app.company_overview.company_overview,
    sales_2023: growthRowEstablished(g["2023"]),
    sales_2024: growthRowEstablished(g["2024"]),
    employees_2024: g["2024"]?.total_employees !== null && g["2024"]?.total_employees !== undefined,
    female_employees: g["2024"]?.female_employees !== null && g["2024"]?.female_employees !== undefined,
    youth_employees: g["2024"]?.youth_employees_18_24 !== null && g["2024"]?.youth_employees_18_24 !== undefined,
    market: !!app.products.rows.find((r) => r.market_served) || !!app.motivation.market_overview,
    uniqueness: !!app.products.product_service_uniqueness || !!evidence["products.product_service_uniqueness"],
    sourcing: app.sourcing.local_raw_material_percentage !== null && app.sourcing.local_raw_material_percentage !== undefined,
    management: app.management.members.filter((m) => !!m.name).length > 0,
    job_creation: app.job_creation.projected_new_jobs !== null && app.job_creation.projected_new_jobs !== undefined,
    expected_results: !!app.intervention.expected_results,
    impact: !!app.impact.social_environmental_impact_osh,
    osh: !!app.impact.occupational_safety_health_standards,
  };
  return covered;
}

/**
 * Pick the highest-value uncovered field to ask about next. This is the
 * adaptive questioning logic — one targeted question per turn.
 */
export function computeState(
  app: Application,
  evidence: EvidenceMap
): InterviewState {
  const covered = computeCoverage(app, evidence);

  const profile = ["company_name", "registration_number", "business_type", "years_operating", "ownership"];
  const growth = ["sales_2023", "sales_2024", "employees_2024", "female_employees", "youth_employees"];
  const market = ["market", "uniqueness", "sourcing"];
  const management = ["management"];
  const intervention = ["job_creation", "expected_results"];
  const impact = ["impact", "osh"];

  const open = (keys: string[]) => firstOpen(
    keys.reduce<Record<string, boolean>>((acc, k) => { acc[k] = covered[k]; return acc; }, {}),
    keys
  );

  let name: InterviewStateName;
  if (open(profile)) name = "company_profile";
  else if (open(growth)) name = "growth";
  else if (open(market)) name = "market";
  else if (open(management)) name = "management";
  else if (open(intervention)) name = "intervention";
  else if (open(impact)) name = "impact";
  else name = "complete";

  return { name, coverage: covered as unknown as Record<string, "required" | "established" | "not_applicable"> };
}

/**
 * Map the next missing field to a question template id. Kept explicit so
 * the interview never asks already-established questions.
 */
export function nextQuestionId(state: InterviewState, evidence: EvidenceMap): QuestionId | "complete" {
  const c = state.coverage as unknown as Record<string, boolean>;
  const pick = (keys: QuestionId[]): QuestionId | null =>
    keys.find((k) => {
      const map: Record<string, keyof typeof c> = {
        consent: "consent",
        company_intro: "company_name",
        registration_number: "registration_number",
        years_operating: "years_operating",
        business_type: "business_type",
        ownership: "ownership",
        sales_2023: "sales_2023",
        sales_2024: "sales_2024",
        employees_2024: "employees_2024",
        female_employees: "female_employees",
        youth_employees: "youth_employees",
        market: "market",
        uniqueness: "uniqueness",
        sourcing: "sourcing",
        management: "management",
        job_creation: "job_creation",
        expected_results: "expected_results",
        impact: "impact",
        photo_license: "registration_number",
        photo_workshop: "overview",
        anything_else: "anything_else",
        complete: "complete",
        acknowledge_contradiction: "consent",
      };
      return !c[map[k] ?? k];
    }) ?? null;

  // Contradictions take priority over the next field.
  for (const f of Object.values(evidence)) {
    if (f.status === "contradicted") return "acknowledge_contradiction";
  }

  const order: QuestionId[] = [
    "company_intro",
    "registration_number",
    "business_type",
    "years_operating",
    "ownership",
    "sales_2023",
    "sales_2024",
    "employees_2024",
    "female_employees",
    "youth_employees",
    "market",
    "uniqueness",
    "sourcing",
    "management",
    "job_creation",
    "expected_results",
    "impact",
    "photo_license",
    "photo_workshop",
    "anything_else",
  ];
  return pick(order) ?? "complete";
}

export function isCompleteState(state: InterviewState): boolean {
  return state.name === "complete";
}

export function stateProgressLabel(state: InterviewStateName): string {
  return stateOrder.indexOf(state) >= 0 ? `${stateOrder.indexOf(state) + 1}/${stateOrder.length}` : "-";
}