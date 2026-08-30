import { z } from 'zod';

export const EvidenceFieldSchema = z.object({
  state: z.enum([
    'self_reported',
    'document_supported',
    'visually_observed',
    'verified',
    'not_established',
    'contradicted',
  ]),
  value: z.any().optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export type EvidenceField = z.infer<typeof EvidenceFieldSchema>;

const TableRowSchema = z.record(z.string(), z.any());

export const CompanyProfileSchema = z.object({
  company_name: EvidenceFieldSchema,
  business_registration_number: EvidenceFieldSchema,
  license_issue_date: EvidenceFieldSchema.optional(),
  address: EvidenceFieldSchema,
  mobile_number: EvidenceFieldSchema,
  email: EvidenceFieldSchema.optional(),
  business_organization_form: EvidenceFieldSchema,
  years_in_operation: EvidenceFieldSchema,
  business_type: EvidenceFieldSchema,
  ownership_percentage: z.object({
    women_pct: EvidenceFieldSchema,
    men_pct: EvidenceFieldSchema,
  }),
});

export const GrowthIndicatorsSchema = z.object({
  sales_etb: z.object({
    '2022': EvidenceFieldSchema,
    '2023': EvidenceFieldSchema,
    '2024': EvidenceFieldSchema,
    '2025_projection': EvidenceFieldSchema,
    '2026_projection': EvidenceFieldSchema,
  }),
  total_employees: z.object({
    '2022': EvidenceFieldSchema,
    '2023': EvidenceFieldSchema,
    '2024': EvidenceFieldSchema,
    '2025_projection': EvidenceFieldSchema,
    '2026_projection': EvidenceFieldSchema,
  }),
  female_employees: z.object({
    '2022': EvidenceFieldSchema,
    '2023': EvidenceFieldSchema,
    '2024': EvidenceFieldSchema,
    '2025_projection': EvidenceFieldSchema,
    '2026_projection': EvidenceFieldSchema,
  }),
  youth_employees_18_24: z.object({
    '2022': EvidenceFieldSchema,
    '2023': EvidenceFieldSchema,
    '2024': EvidenceFieldSchema,
    '2025_projection': EvidenceFieldSchema,
    '2026_projection': EvidenceFieldSchema,
  }),
});

export const CompanyOverviewSchema = z.object({
  development_since_start: EvidenceFieldSchema,
  motivation_to_apply: EvidenceFieldSchema,
  business_goals: EvidenceFieldSchema,
  market_overview: EvidenceFieldSchema,
  main_products_services: z.object({
    product_service: EvidenceFieldSchema,
    market_served: EvidenceFieldSchema,
    distribution_channels: EvidenceFieldSchema,
  }).array(),
  product_service_uniqueness: EvidenceFieldSchema,
  raw_material_sourcing_pct_local: EvidenceFieldSchema.optional(),
});

export const ManagementSchema = z.object({
  core_management_team: z.object({
    name: EvidenceFieldSchema,
    position: EvidenceFieldSchema,
    gender: EvidenceFieldSchema,
  }).array(),
  organogram: EvidenceFieldSchema.optional(),
});

export const InterventionRequestedSchema = z.object({
  problem_to_be_addressed: EvidenceFieldSchema,
  requested_support_machinery: z.object({
    equipment_description: EvidenceFieldSchema,
    quantity: EvidenceFieldSchema,
    estimated_total_price_etb: EvidenceFieldSchema,
    purpose: EvidenceFieldSchema,
  }).array(),
  requested_support_consultants: z.object({
    problem_description: EvidenceFieldSchema,
    technical_expertise_requested: EvidenceFieldSchema,
  }).array(),
  expected_results: EvidenceFieldSchema,
  priority_areas: EvidenceFieldSchema.array(),
  job_creation: z.object({
    explanation: EvidenceFieldSchema,
    positions_table: z.object({
      job_position: EvidenceFieldSchema,
      number_of_new_jobs: EvidenceFieldSchema,
    }).array(),
  }),
  social_environmental_impact_osh: EvidenceFieldSchema,
  occupational_safety_health_standards: EvidenceFieldSchema,
});

export const EvidenceSchema = z.object({
  company_profile: CompanyProfileSchema,
  company_overview: CompanyOverviewSchema,
  growth_indicators: GrowthIndicatorsSchema,
  management: ManagementSchema,
  intervention_requested: InterventionRequestedSchema,
});

export type Evidence = z.infer<typeof EvidenceSchema>;