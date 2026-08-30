import { describe, it, expect } from 'vitest';
import { findGaps } from '@/lib/evidence/gaps';

function makeField(state: any, value?: any) {
  return { state, value };
}

describe('Gap Engine', () => {
  it('finds one gap for each not_established field', () => {
    const evidence: any = {
      company_profile: {
        company_name: makeField('self_reported', 'Acme'),
        business_registration_number: makeField('not_established'),
        address: makeField('not_established'),
        mobile_number: makeField('self_reported', '+251...'),
        business_organization_form: makeField('self_reported', 'Private Limited'),
        years_in_operation: makeField('self_reported', 5),
        business_type: makeField('self_reported', 'Textile'),
        ownership_percentage: {
          women_pct: makeField('self_reported', 60),
          men_pct: makeField('not_established'),
        },
      },
      company_overview: {
        development_since_start: makeField('not_established'),
        motivation_to_apply: makeField('not_established'),
        business_goals: makeField('not_established'),
        market_overview: makeField('not_established'),
        main_products_services: [],
        product_service_uniqueness: makeField('not_established'),
      },
      growth_indicators: {
        sales_etb: {
          '2022': makeField('not_established'),
          '2023': makeField('not_established'),
          '2024': makeField('not_established'),
          '2025_projection': makeField('not_established'),
          '2026_projection': makeField('not_established'),
        },
        total_employees: {
          '2022': makeField('not_established'),
          '2023': makeField('not_established'),
          '2024': makeField('not_established'),
          '2025_projection': makeField('not_established'),
          '2026_projection': makeField('not_established'),
        },
        female_employees: {
          '2022': makeField('not_established'),
          '2023': makeField('not_established'),
          '2024': makeField('not_established'),
          '2025_projection': makeField('not_established'),
          '2026_projection': makeField('not_established'),
        },
        youth_employees_18_24: {
          '2022': makeField('not_established'),
          '2023': makeField('not_established'),
          '2024': makeField('not_established'),
          '2025_projection': makeField('not_established'),
          '2026_projection': makeField('not_established'),
        },
      },
      management: {
        core_management_team: [],
      },
      intervention_requested: {
        problem_to_be_addressed: makeField('not_established'),
        requested_support_machinery: [],
        requested_support_consultants: [],
        expected_results: makeField('not_established'),
        priority_areas: [],
        job_creation: {
          explanation: makeField('not_established'),
          positions_table: [],
        },
        social_environmental_impact_osh: makeField('not_established'),
        occupational_safety_health_standards: makeField('not_established'),
      },
    };

    const gaps = findGaps(evidence);
    const fieldPaths = gaps.map((g) => g.field);
    expect(new Set(fieldPaths).size).toBe(fieldPaths.length); // no duplicates

    for (const gap of gaps) {
      expect(gap.action).not.toBe('');
      expect(gap.message).not.toBe('');
    }

    expect(fieldPaths).toContain('company_profile.business_registration_number');
    expect(fieldPaths).toContain('company_overview.main_products_services');
    expect(fieldPaths).toContain('management.core_management_team');
  });

  it('does not produce gaps for established fields', () => {
    const evidence: any = {
      company_profile: {
        company_name: makeField('self_reported', 'Acme'),
        business_registration_number: makeField('self_reported', '123'),
      },
    };
    const gaps = findGaps(evidence);
    expect(gaps).toHaveLength(0);
  });
});