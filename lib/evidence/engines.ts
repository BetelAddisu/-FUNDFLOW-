/**
 * Deterministic contradiction detection and gap analysis.
 *
 * Contradictions are first-class objects; values are never auto-corrected.
 * Gaps are semantic (missing/ambiguous/contradicted/out_of_band/
 * unreadable_document/pending_rule), each with a next action.
 */
import type { Application, ApplicationRecord } from "@/lib/db/schema";
import type { EvidenceField } from "@/lib/evidence/types";

export interface Contradiction {
  id: string;
  applicationId: string;
  type: string;
  field: string;
  description: string;
  detail: string;
  evidenceRefs: string[];
  status: "active" | "resolved";
  createdAt: string;
  resolvedAt?: string;
}

export type GapType =
  | "missing"
  | "ambiguous"
  | "contradicted"
  | "out_of_band"
  | "unreadable_document"
  | "pending_rule";

export interface Gap {
  field: string;
  type: GapType;
  detail: string;
  nextAction: string;
  severity: "low" | "medium" | "high";
}

const NUM_YEARS = ["2022", "2023", "2024", "2025_projection", "2026_projection"] as const;

function ev(arr: (string | number | null | undefined)[]): string[] {
  return arr.filter((x): x is string | number => x !== null && x !== undefined).map(String);
}

export function detectContradictions(app: ApplicationRecord): Contradiction[] {
  const c: Contradiction[] = [];
  const appId = app.id;
  const now = new Date().toISOString();
  const add = (
    type: string,
    field: string,
    description: string,
    detail: string,
    refs: string[]
  ) =>
    c.push({
      id: `contra_${appId}_${type.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${c.length + 1}`,
      applicationId: appId,
      type,
      field,
      description,
      detail,
      evidenceRefs: refs,
      status: "active",
      createdAt: now,
    });

  const a = app.application;

  // 1. Registration age vs years in operation
  const regYear = a.company_profile.business_registration_number;
  const yearsOp = a.company_profile.years_in_operation;
  if (yearsOp !== null && yearsOp !== undefined && regYear) {
    // Only flag when the registration number itself encodes a year (e.g. REG-2021).
    const m = String(regYear).match(/(19|20)\d{2}/);
    if (m) {
      const yr = parseInt(m[0], 10);
      const approx = new Date().getFullYear() - yr;
      if (Math.abs(approx - yearsOp) >= 2) {
        add(
          "registration_age",
          "company_profile.years_in_operation",
          "Registration date conflicts with stated years in operation.",
          `Registration number references ${yr}; applicant reports ${yearsOp} years in operation.`,
          ev([regYear])
        );
      }
    }
  }

  // 2. Ownership percentages exceed 100%
  const w = a.company_profile.ownership_percentage?.women_pct;
  const m2 = a.company_profile.ownership_percentage?.men_pct;
  if (w !== null && w !== undefined && m2 !== null && m2 !== undefined) {
    const sum = w + m2;
    if (sum > 100) {
      add(
        "ownership_sum",
        "company_profile.ownership_percentage",
        "Ownership percentages exceed 100%.",
        `Women ${w}% + Men ${m2}% = ${sum}%.`,
        ev([w, m2])
      );
    }
  }

  // 3. Female employees > total employees (per year)
  for (const y of NUM_YEARS) {
    const row = a.growth[y];
    if (!row) continue;
    const t = row.total_employees;
    const f = row.female_employees;
    if (
      t !== null && t !== undefined &&
      f !== null && f !== undefined &&
      f > t
    ) {
      add(
        "female_exceeds_total",
        `growth.${y}.female_employees`,
        "Female employees exceed total employees.",
        `${y}: ${f} female employees vs ${t} total.`,
        ev([f, t])
      );
    }
  }

  // 4. Youth employees > total employees
  for (const y of NUM_YEARS) {
    const row = a.growth[y];
    if (!row) continue;
    const t = row.total_employees;
    const yth = row.youth_employees_18_24;
    if (
      t !== null && t !== undefined &&
      yth !== null && yth !== undefined &&
      yth > t
    ) {
      add(
        "youth_exceeds_total",
        `growth.${y}.youth_employees_18_24`,
        "Youth employees exceed total employees.",
        `${y}: ${yth} youth employees vs ${t} total.`,
        ev([yth, t])
      );
    }
  }

  // 5. Projected jobs < 0
  for (const p of a.job_creation.positions) {
    if (p.number_of_new_jobs !== null && p.number_of_new_jobs !== undefined && p.number_of_new_jobs < 0) {
      add(
        "negative_jobs",
        "job_creation.job_position",
        "Projected new jobs are negative.",
        `Position "${p.job_position}" projects ${p.number_of_new_jobs} jobs.`,
        ev([p.number_of_new_jobs])
      );
    }
  }

  // 6. Impossible quantities/prices
  for (const m3 of a.intervention.machinery_equipment) {
    if (
      m3.quantity !== null && m3.quantity !== undefined && m3.quantity < 0
    ) {
      add(
        "negative_quantity",
        "intervention.machinery_equipment",
        "Machinery quantity is negative.",
        `Quantity ${m3.quantity} for "${m3.description}".`,
        ev([m3.quantity])
      );
    }
    if (
      m3.estimated_total_price_etb !== null &&
      m3.estimated_total_price_etb !== undefined &&
      m3.estimated_total_price_etb < 0
    ) {
      add(
        "negative_price",
        "intervention.machinery_equipment",
        "Price estimate is negative.",
        `Price ${m3.estimated_total_price_etb} ETB for "${m3.description}".`,
        ev([m3.estimated_total_price_etb])
      );
    }
  }

  // 7. Duplicate conflicting company names (evidence map level)
  const nameEvidence = Object.values(app.evidence ?? {}).filter((f: EvidenceField) =>
    f.field === "company_profile.company_name"
  );
  const distinctNames = new Set(
    nameEvidence
      .filter((f) => f.value !== null && f.value !== undefined)
      .map((f) => String(f.value).trim().toLowerCase())
  );
  if (distinctNames.size > 1) {
    add(
      "conflicting_company_names",
      "company_profile.company_name",
      "Duplicate conflicting company names.",
      [...distinctNames].join(" vs "),
      nameEvidence.map((f) => f.evidenceRef?.id ?? "?")
    );
  }

  // 8. Conflicting registration numbers
  const regEvidence = Object.values(app.evidence ?? {}).filter((f: EvidenceField) =>
    f.field === "company_profile.business_registration_number"
  );
  const distinctRegs = new Set(
    regEvidence
      .filter((f) => f.value !== null && f.value !== undefined)
      .map((f) => String(f.value).trim().toLowerCase())
  );
  if (distinctRegs.size > 1) {
    add(
      "conflicting_registration_numbers",
      "company_profile.business_registration_number",
      "Conflicting registration numbers.",
      [...distinctRegs].join(" vs "),
      regEvidence.map((f) => f.evidenceRef?.id ?? "?")
    );
  }

  // 9. Evidence map already marked a field contradicted (extractor caught it).
  for (const f of Object.values(app.evidence ?? {})) {
    if (f.status === "contradicted") {
      add(
        "field_level_conflict",
        f.field,
        "Conflicting statements recorded for a field.",
        f.reason ?? `Multiple distinct values captured for ${f.field}.`,
        (f.values ?? []).map((v) => v.evidenceRef?.id ?? "?")
      );
    }
  }

  return c;
}

export function detectContradictionsFromFields(
  app: Application,
  evidence: Record<string, EvidenceField>,
  applicationId: string,
  additional: Contradiction[] = []
): Contradiction[] {
  const rec: ApplicationRecord = {
    id: applicationId,
    companyNameLabel: String(app.company_profile.company_name ?? ""),
    channel: "web",
    language: "unknown",
    status: "in_progress",
    application: app,
    evidence,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return [...detectContradictions(rec), ...additional];
}

/** Numeric interpolation is never performed here; only labelled bands. */
export function detectGaps(app: ApplicationRecord): Gap[] {
  const gaps: Gap[] = [];
  const a = app.application;
  const push = (g: Omit<Gap, "severity"> & { severity?: Gap["severity"] }) =>
    gaps.push({ severity: "medium", ...g });

  // --- Required company profile ---
  if (!a.company_profile.company_name)
    push({ field: "company_profile.company_name", type: "missing", detail: "Company name not established.", nextAction: "Ask the applicant for the registered company name." });
  if (!a.company_profile.business_registration_number)
    push({ field: "company_profile.business_registration_number", type: "missing", detail: "Business registration number not established.", nextAction: "Ask for the registration number or a business license photo." });
  if (a.company_profile.years_in_operation === null || a.company_profile.years_in_operation === undefined)
    push({ field: "company_profile.years_in_operation", type: "missing", detail: "Years in operation not established.", nextAction: "Ask when the business began operating." });
  if (!a.company_profile.business_type)
    push({ field: "company_profile.business_type", type: "missing", detail: "Business type not established.", nextAction: "Ask what the business does." });
  const ow = a.company_profile.ownership_percentage;
  if (ow?.women_pct === null || ow?.women_pct === undefined || ow?.men_pct === null || ow?.men_pct === undefined)
    push({ field: "company_profile.ownership_percentage", type: "missing", detail: "Ownership percentages incomplete.", nextAction: "Confirm women and men ownership percentages." });

  // --- Growth indicators ---
  const g2024 = a.growth["2024"];
  if (g2024?.sales_etb === null || g2024?.sales_etb === undefined)
    push({ field: "growth.2024.sales_etb", type: "missing", detail: "2024 sales not established.", nextAction: "Ask for 2024 sales." });
  if (g2024?.total_employees === null || g2024?.total_employees === undefined)
    push({ field: "growth.2024.total_employees", type: "missing", detail: "2024 total employees not established.", nextAction: "Ask for total employees." });

  // --- Contradiction-derived gaps ---
  for (const contra of detectContradictions(app)) {
    push({
      field: contra.field,
      type: "contradicted",
      detail: contra.detail,
      nextAction: `Resolve contradiction: ${contra.description}`,
      severity: "high",
    });
  }

  // --- Pending rules ---
  push({
    field: "evaluation.C7",
    type: "pending_rule",
    detail: "C7a/C7b routing rule unresolved in official material.",
    nextAction: "Mark C7 routing as pending for the reviewer.",
    severity: "low",
  });

  return gaps;
}

export function summarizeReadiness(app: ApplicationRecord): {
  requiredFields: string[];
  establishedFields: string[];
  percent: number;
  gaps: string[];
} {
  const required = [
    "company_profile.company_name",
    "company_profile.business_registration_number",
    "company_profile.business_type",
    "company_profile.years_in_operation",
    "growth.2024.sales_etb",
    "growth.2024.total_employees",
    "growth.2023.sales_etb",
    "growth.2023.total_employees",
  ];
  const established: string[] = [];
  const a = app.application;
  const check: Array<[string, boolean]> = [
    ["company_profile.company_name", !!a.company_profile.company_name],
    ["company_profile.business_registration_number", !!a.company_profile.business_registration_number],
    ["company_profile.business_type", !!a.company_profile.business_type],
    ["company_profile.years_in_operation", a.company_profile.years_in_operation !== null && a.company_profile.years_in_operation !== undefined],
    ["growth.2024.sales_etb", a.growth["2024"]?.sales_etb !== null && a.growth["2024"]?.sales_etb !== undefined],
    ["growth.2024.total_employees", a.growth["2024"]?.total_employees !== null && a.growth["2024"]?.total_employees !== undefined],
    ["growth.2023.sales_etb", a.growth["2023"]?.sales_etb !== null && a.growth["2023"]?.sales_etb !== undefined],
    ["growth.2023.total_employees", a.growth["2023"]?.total_employees !== null && a.growth["2023"]?.total_employees !== undefined],
  ];
  for (const [f, ok] of check) {
    if (ok) established.push(f);
  }
  const percent = required.length === 0 ? 0 : Math.round((established.length / required.length) * 100);
  const gaps = required.filter((f) => !established.includes(f));
  return { requiredFields: required, establishedFields: established, percent, gaps };
}