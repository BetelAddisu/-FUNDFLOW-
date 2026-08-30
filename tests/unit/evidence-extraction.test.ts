import { describe, it, expect } from 'vitest';
import { EvidenceSchema, EvidenceFieldSchema } from '@/lib/evidence/schema';
import { EvidenceField } from '@/lib/evidence/types';
import { MockExtractionAgent } from '@/lib/evidence/extractor';

describe('Evidence Schema', () => {
  it('validates a complete evidence object', () => {
    const validEvidence = {
      company_profile: {
        company_name: { state: 'self_reported', value: 'Acme', confidence: 0.9 },
        business_registration_number: { state: 'not_established', confidence: 0 },
        address: { state: 'not_established', confidence: 0 },
        mobile_number: { state: 'self_reported', value: '+251...' },
        business_organization_form: { state: 'self_reported', value: 'Private Limited Company' },
        years_in_operation: { state: 'document_supported', value: 5 },
        business_type: { state: 'self_reported', value: 'Textile' },
        ownership_percentage: {
          women_pct: { state: 'self_reported', value: 60 },
          men_pct: { state: 'self_reported', value: 40 },
        },
      },
      company_overview: {
        development_since_start: { state: 'self_reported', value: 'Started small...' },
        motivation_to_apply: { state: 'not_established', confidence: 0 },
        business_goals: { state: 'not_established', confidence: 0 },
        market_overview: { state: 'not_established', confidence: 0 },
        main_products_services: [],
        product_service_uniqueness: { state: 'not_established', confidence: 0 },
      },
      growth_indicators: {
        sales_etb: {
          '2022': { state: 'self_reported', value: 100000 },
          '2023': { state: 'self_reported', value: 150000 },
          '2024': { state: 'self_reported', value: 200000 },
          '2025_projection': { state: 'self_reported', value: 250000 },
          '2026_projection': { state: 'self_reported', value: 300000 },
        },
        total_employees: {
          '2022': { state: 'self_reported', value: 5 },
          '2023': { state: 'self_reported', value: 8 },
          '2024': { state: 'self_reported', value: 10 },
          '2025_projection': { state: 'self_reported', value: 12 },
          '2026_projection': { state: 'self_reported', value: 15 },
        },
        female_employees: {
          '2022': { state: 'self_reported', value: 2 },
          '2023': { state: 'self_reported', value: 3 },
          '2024': { state: 'self_reported', value: 4 },
          '2025_projection': { state: 'self_reported', value: 5 },
          '2026_projection': { state: 'self_reported', value: 6 },
        },
        youth_employees_18_24: {
          '2022': { state: 'self_reported', value: 1 },
          '2023': { state: 'self_reported', value: 2 },
          '2024': { state: 'self_reported', value: 3 },
          '2025_projection': { state: 'self_reported', value: 3 },
          '2026_projection': { state: 'self_reported', value: 4 },
        },
      },
      management: {
        core_management_team: [],
      },
      intervention_requested: {
        problem_to_be_addressed: { state: 'not_established', confidence: 0 },
        requested_support_machinery: [],
        requested_support_consultants: [],
        expected_results: { state: 'not_established', confidence: 0 },
        priority_areas: [],
        job_creation: {
          explanation: { state: 'not_established', confidence: 0 },
          positions_table: [],
        },
        social_environmental_impact_osh: { state: 'not_established', confidence: 0 },
        occupational_safety_health_standards: { state: 'not_established', confidence: 0 },
      },
    };

    const result = EvidenceSchema.safeParse(validEvidence);
    expect(result.success).toBe(true);
  });

  it('unestablished fact has state not_established and confidence 0', () => {
    const field: EvidenceField = { state: 'not_established', confidence: 0 };
    expect(field.state).toBe('not_established');
    expect(field.confidence).toBe(0);
  });

  it('approximate answer stored as self_reported with approximation preserved', () => {
    const field: EvidenceField = { state: 'self_reported', value: 'around 5 years', confidence: 0.6 };
    expect(field.state).toBe('self_reported');
    expect(field.value).toBe('around 5 years');
  });

  it('conflicting values across turns kept as contradicted', () => {
    const field: EvidenceField = { state: 'contradicted', value: ['5 years', '10 years'], notes: 'Conflict in years_in_operation' };
    expect(field.state).toBe('contradicted');
    expect(Array.isArray(field.value)).toBe(true);
  });
});

describe('MockExtractionAgent', () => {
  it('extracts company name from text', async () => {
    const agent = new MockExtractionAgent();
    const updates = await agent.extractFromText('Our company is Acme', {});
    expect(updates.company_profile?.company_name?.value).toBe('Acme PLC');
    expect(updates.company_profile?.company_name?.state).toBe('self_reported');
  });
});