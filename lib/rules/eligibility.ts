/**
 * Deterministic eligibility engine.
 *
 * Confirmed checks from the supplied form:
 *   E1  legally registered
 *   E2  SME or parent organization more than two years old
 *   (private ownership + not state-owned). The exact wording of the third
 *   exclusion factor remains pending; a state-owned flag is handled as a
 *   documented exclusion on the form, and an unresolved factor is surfaced
 *   as `needs_review`, never silently dropped.
 */
import { ELIGIBILITY_DEFS } from "@/lib/db/config";
import type { ApplicationRecord } from "@/lib/db/schema";
import type { EligibilityCheck, EligibilityResult } from "@/lib/rules/types";

export const CURRENT_YEAR = new Date().getFullYear();

export function evaluateEligibility(app: ApplicationRecord): EligibilityResult {
  const checks: EligibilityCheck[] = [];
  const a = app.application;

  // E1 — legally registered
  const registered =
    !!a.company_profile.business_registration_number;
  checks.push({
    id: "E1",
    name: "Legal registration",
    status: registered ? "pass" : "needs_review",
    note: registered
      ? "Business registration number provided."
      : "Registration number not established.",
    sourceField: "company_profile.business_registration_number",
  });

  // E2 — more than two years old
  const years = a.company_profile.years_in_operation;
  let e2: EligibilityCheck["status"];
  let e2Note: string;
  if (years === null || years === undefined) {
    e2 = "needs_review";
    e2Note = "Years in operation not established.";
  } else if (years > 2) {
    e2 = "pass";
    e2Note = `Company reports ${years} years in operation (> 2).`;
  } else {
    e2 = "fail";
    e2Note = `Company reports ${years} years in operation (not more than 2).`;
  }
  checks.push({
    id: "E2",
    name: "Company age (more than 2 years)",
    status: e2,
    note: e2Note,
    sourceField: "company_profile.years_in_operation",
  });

  // Ownership/exclusion — documented form fields
  const womenOwned = a.company_profile.ownership_percentage?.women_pct;
  const menOwned = a.company_profile.ownership_percentage?.men_pct;
  const stateOwned = a.company_profile.business_organization_form?.toLowerCase().includes("state") ?? false;

  // 3rd factor (private ownership): the form asks for ownership but the
  // exact official exclusion wording is pending. Only a documented
  // state-owned business form is treated as an exclusion.
  if (stateOwned) {
    checks.push({
      id: "E3",
      name: "Not state-owned",
      status: "fail",
      note: "Business organization form indicates state ownership.",
      sourceField: "company_profile.business_organization_form",
    });
  } else {
    checks.push({
      id: "E3",
      name: "Not state-owned",
      status: (womenOwned ?? null) !== null || (menOwned ?? null) !== null
        ? "pass"
        : "needs_review",
      note:
        (womenOwned ?? null) !== null || (menOwned ?? null) !== null
          ? "Ownership percentages provided; no state ownership indicated."
          : "Ownership not established — exclusion factor unresolved.",
      sourceField: "company_profile.ownership_percentage",
    });
  }

  // Pending official factors
  const pending = ELIGIBILITY_DEFS.filter((d) => d.status === "pending");
  for (const p of pending) {
    checks.push({
      id: p.id,
      name: p.name,
      status: "pending",
      note: "Official rule pending — surfaced for reviewer.",
    });
  }

  const failures = checks.filter((c) => c.status === "fail");
  const unresolved = checks.filter((c) => c.status === "needs_review");

  let status: EligibilityResult["status"] = "eligible";
  if (failures.length > 0) status = "ineligible";
  else if (unresolved.length > 0) status = "needs_review";

  const reasons = [
    ...failures.map((f) => `${f.name}: ${f.note}`),
    ...unresolved.map((u) => `${u.name}: ${u.note}`),
  ];

  return { applicationId: app.id, status, checks, reasons };
}