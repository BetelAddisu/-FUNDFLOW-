import { z } from "zod";
import type { EvidenceMap } from "@/lib/evidence/types";

/**
 * Canonical application schema. Mirrors the supplied SME Support Scheme
 * form. The evidence-backed shape stores the plain structural value plus a
 * parallel evidence map keyed by dotted field path. Channel-agnostic.
 */

const zYear = z.object({
  sales_etb: z.number().nullable().optional(),
  total_employees: z.number().nullable().optional(),
  female_employees: z.number().nullable().optional(),
  youth_employees_18_24: z.number().nullable().optional(),
});

export const companyProfileSchema = z.object({
  company_name: z.string().nullable(),
  business_registration_number: z.string().nullable(),
  address: z
    .object({
      city: z.string().nullable(),
      region: z.string().nullable(),
    })
    .default({ city: null, region: null }),
  mobile_number: z.string().nullable(),
  email: z.string().nullish(),
  business_organization_form: z.string().nullish(),
  years_in_operation: z.number().nullable(),
  business_type: z.string().nullish(),
  ownership_percentage: z
    .object({
      women_pct: z.number().nullable().optional(),
      men_pct: z.number().nullable().optional(),
    })
    .default({ women_pct: null, men_pct: null }),
});

export const overviewSchema = z.object({
  company_overview: z.string().nullable(),
});

export const growthSchema = z.object({
  2022: zYear.default({ sales_etb: null, total_employees: null, female_employees: null, youth_employees_18_24: null }),
  2023: zYear.default({ sales_etb: null, total_employees: null, female_employees: null, youth_employees_18_24: null }),
  2024: zYear.default({ sales_etb: null, total_employees: null, female_employees: null, youth_employees_18_24: null }),
  "2025_projection": zYear.default({ sales_etb: null, total_employees: null, female_employees: null, youth_employees_18_24: null }),
  "2026_projection": zYear.default({ sales_etb: null, total_employees: null, female_employees: null, youth_employees_18_24: null }),
});

export const motivationSchema = z.object({
  motivation_to_apply: z.string().nullable(),
  business_goals: z.string().nullable(),
  market_overview: z.string().nullable(),
});

export const productSchema = z.object({
  product_or_service: z.string().nullable(),
  market_served: z.string().nullable(),
  distribution_channels: z.string().nullable(),
});

export const productsSchema = z.object({
  rows: z.array(productSchema).max(4).default([]),
  product_service_uniqueness: z.string().nullable(),
});

export const sourcingSchema = z.object({
  local_raw_material_percentage: z.number().nullable(),
  sourcing_applicable: z.boolean().default(true),
});

export const managementMemberSchema = z.object({
  name: z.string().nullable(),
  position: z.string().nullable(),
  gender: z.enum(["male", "female", "unknown"]).default("unknown"),
});

export const managementSchema = z.object({
  members: z.array(managementMemberSchema).max(5).default([]),
  organogram_file_ref: z.string().nullable(),
});

export const machinerySchema = z.object({
  description: z.string().nullable(),
  quantity: z.number().nullable(),
  estimated_total_price_etb: z.number().nullable(),
  purpose: z.string().nullable(),
});

export const consultantsSchema = z.object({
  problem_description: z.string().nullable(),
  technical_expertise_requested: z.string().nullable(),
});

export const interventionSchema = z.object({
  machinery_equipment: z.array(machinerySchema).max(4).default([]),
  consultants: z.array(consultantsSchema).max(3).default([]),
  expected_results: z.string().nullable(),
  priority_areas: z.array(z.string()).default([]),
  intervention_requested: z.boolean().default(false),
});

export const jobPositionSchema = z.object({
  job_position: z.string().nullable(),
  number_of_new_jobs: z.number().nullable(),
});

export const jobCreationSchema = z.object({
  job_creation_explanation: z.string().nullable(),
  positions: z.array(jobPositionSchema).max(6).default([]),
  projected_new_jobs: z.number().nullable(),
  total_future_employees: z.number().nullable(),
});

export const impactSchema = z.object({
  social_environmental_impact_osh: z.string().nullable(),
  occupational_safety_health_standards: z.string().nullable(),
});

export const applicationSchema = z.object({
  company_profile: companyProfileSchema,
  company_overview: overviewSchema,
  growth: growthSchema,
  motivation: motivationSchema,
  products: productsSchema,
  sourcing: sourcingSchema,
  management: managementSchema,
  intervention: interventionSchema,
  job_creation: jobCreationSchema,
  impact: impactSchema,
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export type Overview = z.infer<typeof overviewSchema>;
export type GrowthYear = z.infer<typeof zYear>;
export type GrowthIndicators = z.infer<typeof growthSchema>;
export type Motivation = z.infer<typeof motivationSchema>;
export type Products = z.infer<typeof productsSchema>;
export type Sourcing = z.infer<typeof sourcingSchema>;
export type Management = z.infer<typeof managementSchema>;
export type Intervention = z.infer<typeof interventionSchema>;
export type JobCreation = z.infer<typeof jobCreationSchema>;
export type Impact = z.infer<typeof impactSchema>;
export type Application = z.infer<typeof applicationSchema>;

export function emptyApplication(): Application {
  const emptyYear = { sales_etb: null, total_employees: null, female_employees: null, youth_employees_18_24: null };
  const app: Application = {
    company_profile: {
      company_name: null,
      business_registration_number: null,
      address: { city: null, region: null },
      mobile_number: null,
      email: null,
      business_organization_form: null,
      years_in_operation: null,
      business_type: null,
      ownership_percentage: { women_pct: null, men_pct: null },
    },
    company_overview: { company_overview: null },
    growth: {
      2022: { ...emptyYear },
      2023: { ...emptyYear },
      2024: { ...emptyYear },
      "2025_projection": { ...emptyYear },
      "2026_projection": { ...emptyYear },
    },
    motivation: { motivation_to_apply: null, business_goals: null, market_overview: null },
    products: { rows: [], product_service_uniqueness: null },
    sourcing: { local_raw_material_percentage: null, sourcing_applicable: true },
    management: { members: [], organogram_file_ref: null },
    intervention: {
      machinery_equipment: [],
      consultants: [],
      expected_results: null,
      priority_areas: [],
      intervention_requested: false,
    },
    job_creation: {
      job_creation_explanation: null,
      positions: [],
      projected_new_jobs: null,
      total_future_employees: null,
    },
    impact: { social_environmental_impact_osh: null, occupational_safety_health_standards: null },
  };
  return applicationSchema.parse(app);
}

/** One recorded channel turn (chat message) inside an interview session. */
export type ChannelKind = "web" | "telegram";

export interface MessageTurn {
  id: string;
  channel: ChannelKind;
  role: "applicant" | "assistant";
  type: "text" | "audio" | "image" | "system";
  text?: string;
  language: "en" | "am" | "om" | "unknown";
  evidenceRef?: string;
  createdAt: string;
  /** e.g. telegram file id or local upload url */
  fileRef?: string;
}

export interface InterviewSession {
  id: string;
  applicationId: string;
  channel: ChannelKind;
  language: "en" | "am" | "om";
  state: string;
  consentEstablished: boolean;
  startedAt: string;
  updatedAt: string;
  turns: MessageTurn[];
  lastAgentMessage?: string;
}

export interface ReviewerDecisions {
  /** Human reviewer resolution of the pending C7a/C7b routing rule. */
  c7Route?: "C7a" | "C7b";
  decidedBy?: string;
  decidedAt?: string;
}

export interface ApplicationRecord {
  id: string;
  companyNameLabel: string;
  channel: ChannelKind;
  language: "en" | "am" | "om" | "unknown";
  status: "in_progress" | "submitted";
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  isSynthetic?: boolean;
  syntheticLabel?: string;
  application: Application;
  evidence: EvidenceMap;
  interviewSessionId?: string;
  reviewerDecisions?: ReviewerDecisions;
}

/** Standalone document/evidence record (photo, audio, upload). */
export interface EvidenceRecord {
  id: string;
  applicationId: string;
  kind: "photo" | "audio" | "document";
  label: string;
  storagePath: string;
  createdAt: string;
  description?: string;
  extractionSummary?: string;
  preview?: string;
}

export function defaultEvidenceMap(): EvidenceMap {
  return {};
}