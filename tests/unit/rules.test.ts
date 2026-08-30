import { describe, it, expect } from 'vitest';
import { scoreApplication } from '@/lib/rules/scoring';
import { checkEligibility } from '@/lib/rules/eligibility';
import { ScoringInput } from '@/lib/rules/types';

function completeInput(): ScoringInput {
  return {
    sales_growth_pct: 60,
    total_employees: 25,
    uniqueness: 'new_in_ethiopia',
    market_served: 'international',
    local_sourcing_pct: 80,
    ownership: 'women_owned',
    women_employee_pct: 60,
    youth_employee_pct: 55,
    expected_results_count: 3,
    job_count: 450,
    investment_readiness: 30,
    management_team_size: 4,
    impact_category: 'green_business_model',
    legally_registered_and_years: true,
    privately_owned: true,
  };
}

describe('Scoring and eligibility', () => {
  it('produces exact scores for complete application', () => {
    const input = completeInput();
    const result = scoreApplication(input);

    expect(result.criterionScores.find((c) => c.criterionId === 'C1.1')!.points).toBe(5);
    expect(result.criterionScores.find((c) => c.criterionId === 'C1.2')!.points).toBe(5);
    expect(result.criterionScores.find((c) => c.criterionId === 'C2')!.points).toBe(5);
    expect(result.criterionScores.find((c) => c.criterionId === 'C3')!.points).toBe(5);
    expect(result.criterionScores.find((c) => c.criterionId === 'C4')!.points).toBe(5);
    expect(result.criterionScores.find((c) => c.criterionId === 'C5.1')!.points).toBe(5);
    expect(result.criterionScores.find((c) => c.criterionId === 'C5.2')!.points).toBe(5);
    expect(result.criterionScores.find((c) => c.criterionId === 'C5.3')!.points).toBe(5);
    expect(result.criterionScores.find((c) => c.criterionId === 'C6')!.points).toBe(20);
    expect(result.criterionScores.find((c) => c.criterionId === 'C8')!.points).toBe(5);
    expect(result.criterionScores.find((c) => c.criterionId === 'C9')!.points).toBe(10);
    expect(result.criterionScores.find((c) => c.criterionId === 'C7a')!.points).toBe(25);
    expect(result.criterionScores.find((c) => c.criterionId === 'C7b')!.points).toBe(25);

    expect(result.totalPointsVariantA).toBe(100);
    expect(result.totalPointsVariantB).toBe(100);
    expect(result.reviewFlags).toHaveLength(0);
  });

  it('computes both C7 variants for every application', () => {
    const input = completeInput();
    const result = scoreApplication(input);
    expect(result.criterionScores.some((c) => c.criterionId === 'C7a')).toBe(true);
    expect(result.criterionScores.some((c) => c.criterionId === 'C7b')).toBe(true);
  });

  it('out-of-band value resolves to needs_review', () => {
    const input = completeInput();
    input.sales_growth_pct = 24.5;
    const result = scoreApplication(input);
    const c1_1 = result.criterionScores.find((c) => c.criterionId === 'C1.1')!;
    expect(c1_1.reviewFlag).toBe('needs_review');
    expect(result.reviewFlags).toContain('C1.1');
    expect(c1_1.points).toBe(0);
  });

  it('exclusion E1 triggers ineligible', () => {
    const input = completeInput();
    input.legally_registered_and_years = false;
    const result = scoreApplication(input);
    expect(result.eligible).toBe(false);
    expect(result.exclusions.find((e) => e.id === 'E1')?.triggered).toBe(true);
  });

  it('exclusion E2 triggers ineligible', () => {
    const input = completeInput();
    input.privately_owned = false;
    const result = scoreApplication(input);
    expect(result.eligible).toBe(false);
    expect(result.exclusions.find((e) => e.id === 'E2')?.triggered).toBe(true);
  });

  it('E3 pending leads to needs_review eligibility', () => {
    const input = completeInput();
    const result = scoreApplication(input);
    expect(result.eligible).toBe('needs_review');
    expect(result.exclusions.find((e) => e.id === 'E3')?.status).toBe('pending');
  });

  it('readiness and programme score can diverge (missing field -> needs_review but score still computed)', () => {
    const input = completeInput();
    delete input.total_employees;
    const result = scoreApplication(input);
    const c1_2 = result.criterionScores.find((c) => c.criterionId === 'C1.2')!;
    expect(c1_2.reviewFlag).toBe('needs_review');
    expect(result.totalPointsVariantA).toBeLessThan(100);
    expect(result.totalPointsVariantA).toBeGreaterThan(0);
  });
});