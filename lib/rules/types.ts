import type { EvidenceMap } from "@/lib/evidence/types";
import type { Application } from "@/lib/db/schema";

export type CriterionStatus = "scored" | "needs_review" | "not_assessable";

export interface CriterionResult {
  criterion: string;
  name: string;
  score: number | null;
  maxScore: number;
  status: CriterionStatus;
  reason?: string;
  basis?: {
    field: string;
    value: unknown;
    source: string;
    evidenceRef: string | null;
    precision?: string;
  };
}

export interface EvaluationResult {
  applicationId: string;
  gridVersion: string;
  criteria: CriterionResult[];
  total: number | null;
  /** max reachable by the configured grid */
  maxTotal: number;
  status: "scored" | "needs_review";
  reasons?: string[];
  c7: {
    routing: "pending";
    variants: { c7a: CriterionResult | null; c7b: CriterionResult | null };
  };
  calculatedAt: string;
}

export interface EligibilityResult {
  applicationId: string;
  status: "eligible" | "ineligible" | "needs_review";
  checks: EligibilityCheck[];
  reasons: string[];
}

export interface EligibilityCheck {
  id: string;
  name: string;
  status: "pass" | "fail" | "pending" | "needs_review" | "not_established";
  note?: string;
  sourceField?: string;
}

export interface ReadinessSummary {
  requiredFields: string[];
  establishedFields: string[];
  percent: number;
  gaps: string[];
}

export interface RankEntry {
  applicationId: string;
  companyName: string;
  eligibility: EligibilityResult;
  evaluation: EvaluationResult;
  readiness: ReadinessSummary;
  score: number | null;
  reviewStatus: "scored" | "needs_review";
  rank?: number;
}

export interface ShortlistResult {
  finalSlots: number;
  shortlistSize: number;
  entries: RankEntry[];
  generatedAt: string;
}

export interface ApplicationPack {
  application: Application;
  evidence: EvidenceMap;
}