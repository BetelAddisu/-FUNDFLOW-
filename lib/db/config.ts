/**
 * Typed access to the official challenge config (source of truth).
 * All scoring/eligibility logic reads bands from here; nothing is
 * hard-coded in the scoring functions themselves except structural
 * mapping to application fields.
 */
import official from "@/config/official-criteria.json";

export interface Band {
  band: string;
  score: number;
  low?: number;
  high?: number;
  label?: string;
}

export interface CriterionComponent {
  id: string;
  name: string;
  maxScore: number;
  bands?: Band[];
  notes?: string;
}

export interface CriterionDef {
  id: string;
  name: string;
  maxScore: number;
  status: string;
  bands?: Band[];
  components?: CriterionComponent[];
  variants?: CriterionComponent[];
  notes?: string;
  greenModelExamples?: string[];
}

export const GRID_VERSION =
  (official as { schemaVersion?: string }).schemaVersion ?? "official-v1-partial";

export const TOTAL_MAX = (official as { grid?: { totalMax?: number } }).grid
  ?.totalMax ?? 100;

export const CRITERIA: CriterionDef[] = (official as {
  grid?: { criteria?: CriterionDef[] };
}).grid?.criteria ?? [];

export const ELIGIBILITY_DEFS = (official as {
  eligibility?: {
    requirements?: Array<{ id: string; name: string; status: string; rule?: string; notes?: string }>;
  };
}).eligibility?.requirements ?? [];

export function criterionById(id: string): CriterionDef | undefined {
  return CRITERIA.find((c) => c.id === id);
}

export function componentById(
  criterionId: string,
  componentId: string
): CriterionComponent | undefined {
  const c = criterionById(criterionId);
  return c?.components?.find((x) => x.id === componentId);
}

export function variantById(
  criterionId: string,
  variantId: string
): CriterionComponent | undefined {
  const c = criterionById(criterionId);
  return c?.variants?.find((x) => x.id === variantId);
}

export function bandLabel(c: CriterionDef, score: number): string | undefined {
  const band = c.bands?.find((b) => b.score === score);
  return band?.band ?? band?.label;
}