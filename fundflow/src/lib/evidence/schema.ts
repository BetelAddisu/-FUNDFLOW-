import { z } from 'zod';
import { EvidenceState, EvidenceValue, EvidenceRecord, Gap, Contradiction, SDGSuggestion, ApplicationPack, DeclarationStatus } from './types';

// Evidence value schema
export const EvidenceValueSchema = z.object({
  value: z.unknown(),
  state: z.enum(['self_reported', 'document_supported', 'visually_observed', 'verified', 'not_established', 'contradicted']),
  confidence: z.number().min(0).max(1),
  sourceTurnIds: z.array(z.string().uuid()),
  contradictionNote: z.string().optional(),
  updatedAt: z.string().datetime(),
});

export type EvidenceValueSchemaType = z.infer<typeof EvidenceValueSchema>;

export const EvidenceRecordSchema = z.record(EvidenceValueSchema);

export const GapSchema = z.object({
  fieldKey: z.string(),
  fieldName: z.string(),
  message: z.string(),
  severity: z.enum(['critical', 'warning']),
  suggestedAction: z.string(),
});

export type GapSchemaType = z.infer<typeof GapSchema>;

export const ContradictionSchema = z.object({
  fieldKey: z.string(),
  fieldName: z.string(),
  message: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  conflictingValues: z.array(z.unknown()),
});

export type ContradictionSchemaType = z.infer<typeof ContradictionSchema>;

export const SDGSuggestionSchema = z.object({
  sdgId: z.number().int().min(1).max(17),
  title: z.string(),
  reason: z.string(),
  evidenceSource: z.string(),
  alignmentStatus: z.literal('potential_alignment'),
});

export type SDGSuggestionSchemaType = z.infer<typeof SDGSuggestionSchema>;

export const DeclarationStatusSchema = z.object({
  id: z.string(),
  text: z.string(),
  explained: z.boolean(),
  explainedLanguage: z.enum(['en', 'am', 'om']).optional(),
  understandingConfirmed: z.boolean(),
  systemTicked: z.boolean(),
});

export type DeclarationStatusSchemaType = z.infer<typeof DeclarationStatusSchema>;

export const ApplicationPackSchema = z.object({
  sessionId: z.string().uuid(),
  evidence: EvidenceRecordSchema,
  gaps: z.array(GapSchema),
  contradictions: z.array(ContradictionSchema),
  sdgSuggestions: z.array(SDGSuggestionSchema),
  readinessScore: z.number().min(0).max(100),
  programmeScore: z.number().min(0).max(100).optional(),
  declarations: z.array(DeclarationStatusSchema),
  generatedAt: z.string().datetime(),
});

export type ApplicationPackSchemaType = z.infer<typeof ApplicationPackSchema>;

// Field mapping for the real application form
export const ApplicationFieldSchema = z.object({
  // Section 1.1 Company Profile
  company_name: EvidenceValueSchema,
  business_registration_number: EvidenceValueSchema,
  address: EvidenceValueSchema,
  mobile_number: EvidenceValueSchema,
  email: EvidenceValueSchema.optional(),
  business_organization_form: EvidenceValueSchema,
  years_in_operation: EvidenceValueSchema,
  business_type: EvidenceValueSchema,
  ownership_percentage_women: EvidenceValueSchema,
  ownership_percentage_men: EvidenceValueSchema,
  
  // Growth Indicators (structured as nested objects)
  sales_etb_2022: EvidenceValueSchema.optional(),
  sales_etb_2023: EvidenceValueSchema.optional(),
  sales_etb_2024: EvidenceValueSchema.optional(),
  sales_etb_2025_projection: EvidenceValueSchema.optional(),
  sales_etb_2026_projection: EvidenceValueSchema.optional(),
  total_employees_2022: EvidenceValueSchema.optional(),
  total_employees_2023: EvidenceValueSchema.optional(),
  total_employees_2024: EvidenceValueSchema.optional(),
  total_employees_2025_projection: EvidenceValueSchema.optional(),
  total_employees_2026_projection: EvidenceValueSchema.optional(),
  female_employees_2022: EvidenceValueSchema.optional(),
  female_employees_2023: EvidenceValueSchema.optional(),
  female_employees_2024: EvidenceValueSchema.optional(),
  female_employees_2025_projection: EvidenceValueSchema.optional(),
  female_employees_2026_projection: EvidenceValueSchema.optional(),
  youth_employees_18_24_2022: EvidenceValueSchema.optional(),
  youth_employees_18_24_2023: EvidenceValueSchema.optional(),
  youth_employees_18_24_2024: EvidenceValueSchema.optional(),
  youth_employees_18_24_2025_projection: EvidenceValueSchema.optional(),
  youth_employees_18_24_2026_projection: EvidenceValueSchema.optional(),
  
  // Section 1.2 Company Overview
  development_since_start: EvidenceValueSchema,
  motivation_to_apply: EvidenceValueSchema,
  business_goals: EvidenceValueSchema,
  market_overview: EvidenceValueSchema,
  product_service_1: EvidenceValueSchema,
  market_served_1: EvidenceValueSchema,
  distribution_channels_1: EvidenceValueSchema,
  product_service_uniqueness: EvidenceValueSchema,
  raw_material_sourcing_pct: EvidenceValueSchema.optional(),
  
  // Section 1.8 Management Structure
  management_name_1: EvidenceValueSchema,
  management_position_1: EvidenceValueSchema,
  management_gender_1: EvidenceValueSchema,
  
  // Section 2.1
  problem_to_be_addressed: EvidenceValueSchema,
  
  // Section 2.2 Machinery
  machinery_description_1: EvidenceValueSchema,
  machinery_quantity_1: EvidenceValueSchema,
  machinery_price_1: EvidenceValueSchema,
  machinery_purpose_1: EvidenceValueSchema,
  
  // Section 2.3 Consultants
  consultant_problem_1: EvidenceValueSchema,
  consultant_expertise_1: EvidenceValueSchema,
  
  // Section 2.4 Expected Results
  expected_results: EvidenceValueSchema,
  priority_area_1: EvidenceValueSchema,
  priority_area_2: EvidenceValueSchema,
  priority_area_3: EvidenceValueSchema,
  
  // Section 2.5 Job Creation
  job_creation_explanation: EvidenceValueSchema,
  job_position_1: EvidenceValueSchema,
  job_count_1: EvidenceValueSchema,
  
  // Section 2.6/2.7
  social_env_impact_osh: EvidenceValueSchema,
  osh_standards: EvidenceValueSchema,
});

export type ApplicationFieldSchemaType = z.infer<typeof ApplicationFieldSchema>;

// Required fields for readiness calculation
export const REQUIRED_FIELDS = [
  'company_name',
  'business_registration_number',
  'address',
  'mobile_number',
  'business_organization_form',
  'years_in_operation',
  'business_type',
  'ownership_percentage_women',
  'ownership_percentage_men',
  'development_since_start',
  'motivation_to_apply',
  'business_goals',
  'market_overview',
  'product_service_1',
  'market_served_1',
  'distribution_channels_1',
  'product_service_uniqueness',
  'management_name_1',
  'management_position_1',
  'management_gender_1',
  'problem_to_be_addressed',
  'machinery_description_1',
  'machinery_quantity_1',
  'machinery_price_1',
  'machinery_purpose_1',
  'consultant_problem_1',
  'consultant_expertise_1',
  'expected_results',
  'priority_area_1',
  'priority_area_2',
  'priority_area_3',
  'job_creation_explanation',
  'job_position_1',
  'job_count_1',
  'social_env_impact_osh',
  'osh_standards',
] as const;

export const GROWTH_INDICATOR_FIELDS = [
  'sales_etb_2022', 'sales_etb_2023', 'sales_etb_2024', 'sales_etb_2025_projection', 'sales_etb_2026_projection',
  'total_employees_2022', 'total_employees_2023', 'total_employees_2024', 'total_employees_2025_projection', 'total_employees_2026_projection',
  'female_employees_2022', 'female_employees_2023', 'female_employees_2024', 'female_employees_2025_projection', 'female_employees_2026_projection',
  'youth_employees_18_24_2022', 'youth_employees_18_24_2023', 'youth_employees_18_24_2024', 'youth_employees_18_24_2025_projection', 'youth_employees_18_24_2026_projection',
] as const;