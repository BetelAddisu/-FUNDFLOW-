import { ScoringInput, ScoringResult, CriterionScore } from './types';
import config from '@/config/official-criteria.json';
import { checkEligibility } from './eligibility';

/**
 * Matches purely NUMERIC range bands like ">50%", "25-50%", "<24%", ">=75%", ">20", "6-10"
 * Returns undefined when the label is not a numeric range (prevents silent zeros on categorical criteria).
 */
function matchNumericBand(value: number, bands: Array<{ label: string; points: number }>): number | undefined {
  for (const band of bands) {
    const label = band.label.trim();
    // >=N
    if (label.startsWith('>=')) {
      const threshold = parseFloat(label.replace('>=', '').replace('%', '').trim());
      if (!isNaN(threshold) && value >= threshold) return band.points;
    // >N (but not >=)
    } else if (label.startsWith('>') && !label.startsWith('>=')) {
      const threshold = parseFloat(label.replace('>', '').replace('%', '').trim());
      if (!isNaN(threshold) && value > threshold) return band.points;
    // <N
    } else if (label.startsWith('<')) {
      const threshold = parseFloat(label.replace('<', '').replace('%', '').trim());
      if (!isNaN(threshold) && value < threshold) return band.points;
    // N-M range
    } else if (label.includes('-')) {
      const parts = label.split('-').map((s) => parseFloat(s.replace('%', '').trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && value >= parts[0] && value <= parts[1]) {
        return band.points;
      }
    }
  }
  return undefined; // out-of-band → caller must return needs_review
}

/**
 * Score C6: expected_results_count is 1, 2, or 3 (integer).
 */
function scoreC6(count: number): number | undefined {
  if (count >= 3) return 20;
  if (count === 2) return 15;
  if (count === 1) return 10;
  return undefined;
}

/**
 * Score C8: management_team_size by threshold with "4+" treated as >=4.
 */
function scoreC8(size: number): number | undefined {
  if (size >= 4) return 5;
  if (size === 3) return 3;
  if (size === 2) return 0;
  if (size < 2) return 0;
  return undefined;
}

export function scoreApplication(input: ScoringInput): ScoringResult {
  const result: ScoringResult = {
    eligible: true,
    exclusions: [],
    criterionScores: [],
    totalPointsVariantA: 0,
    totalPointsVariantB: 0,
    reviewFlags: [],
  };

  const elig = checkEligibility(input);
  result.eligible = elig.eligible;
  result.exclusions = elig.exclusions;

  const addScore = (
    criterionId: string,
    points: number | undefined,
    maxPoints: number,
    name: string,
    evidenceValue?: string
  ) => {
    if (points === undefined) {
      result.criterionScores.push({
        criterionId,
        name,
        points: 0,
        maxPoints,
        reviewFlag: 'needs_review',
        evidenceValue: evidenceValue ?? 'Not provided',
      });
      result.reviewFlags.push(criterionId);
    } else {
      result.criterionScores.push({
        criterionId,
        name,
        points,
        maxPoints,
        evidenceValue: evidenceValue ?? String(points),
      });
    }
  };

  // ── C1.1 Sales growth (numeric %) ──────────────────────────────────────────
  const c1_1Bands = config.criteria.find((c) => c.id === 'C1')!.subcriteria![0].bands!;
  let c1_1Points: number | undefined;
  if (input.sales_growth_pct !== undefined) {
    c1_1Points = matchNumericBand(input.sales_growth_pct, c1_1Bands);
  }
  addScore('C1.1', c1_1Points, 5, 'Sales growth', input.sales_growth_pct !== undefined ? `${input.sales_growth_pct}% growth` : undefined);

  // ── C1.2 Employment (numeric count) ───────────────────────────────────────
  const c1_2Bands = config.criteria.find((c) => c.id === 'C1')!.subcriteria![1].bands!;
  let c1_2Points: number | undefined;
  if (input.total_employees !== undefined) {
    c1_2Points = matchNumericBand(input.total_employees, c1_2Bands);
  }
  addScore('C1.2', c1_2Points, 5, 'Employment', input.total_employees !== undefined ? `${input.total_employees} employees` : undefined);

  // ── C2 Uniqueness (categorical label lookup) ───────────────────────────────
  const c2Bands = config.criteria.find((c) => c.id === 'C2')!.bands!;
  let c2Points: number | undefined;
  if (input.uniqueness) {
    const labelMap: Record<string, string> = {
      new_in_ethiopia: 'New product/service in Ethiopia',
      different_from_competitors: 'Not new to Ethiopia but different from competitors (unique feature)',
      essential: 'Essential product to Ethiopia',
      no_unique: 'No unique features',
    };
    const label = labelMap[input.uniqueness];
    c2Points = c2Bands.find((b) => b.label === label)?.points;
  }
  addScore('C2', c2Points, 5, 'Level of uniqueness', input.uniqueness);

  // ── C3 Market served (categorical label lookup) ────────────────────────────
  const c3Bands = config.criteria.find((c) => c.id === 'C3')!.bands!;
  let c3Points: number | undefined;
  if (input.market_served) {
    const labelMap: Record<string, string> = {
      international: 'Reachable to international market',
      import_substituting: 'Import-substituting product/service',
      local_only: 'Reachable to local market only',
    };
    c3Points = c3Bands.find((b) => b.label === labelMap[input.market_served!])?.points;
  }
  addScore('C3', c3Points, 5, 'Market served', input.market_served);

  // ── C4 Local sourcing (numeric %) ──────────────────────────────────────────
  const c4Bands = config.criteria.find((c) => c.id === 'C4')!.bands!;
  let c4Points: number | undefined;
  if (input.local_sourcing_pct !== undefined) {
    c4Points = matchNumericBand(input.local_sourcing_pct, c4Bands);
  }
  addScore('C4', c4Points, 5, 'Supply chain', input.local_sourcing_pct !== undefined ? `${input.local_sourcing_pct}% local` : undefined);

  // ── C5.1 Ownership (categorical) ──────────────────────────────────────────
  const c5_1Bands = config.criteria.find((c) => c.id === 'C5')!.subcriteria![0].bands!;
  let c5_1Points: number | undefined;
  if (input.ownership) {
    const labelMap: Record<string, string> = {
      women_owned: 'Women owned (partly or fully)',
      women_managed: 'Not women-owned but women-managed',
      neither: 'Neither',
    };
    c5_1Points = c5_1Bands.find((b) => b.label === labelMap[input.ownership!])?.points;
  }
  addScore('C5.1', c5_1Points, 5, 'Ownership/management', input.ownership);

  // ── C5.2 Women employees (numeric %) ──────────────────────────────────────
  const c5_2Bands = config.criteria.find((c) => c.id === 'C5')!.subcriteria![1].bands!;
  let c5_2Points: number | undefined;
  if (input.women_employee_pct !== undefined) {
    c5_2Points = matchNumericBand(input.women_employee_pct, c5_2Bands);
  }
  addScore('C5.2', c5_2Points, 5, '% women employees', input.women_employee_pct !== undefined ? `${input.women_employee_pct}%` : undefined);

  // ── C5.3 Youth employees (numeric %) ──────────────────────────────────────
  const c5_3Bands = config.criteria.find((c) => c.id === 'C5')!.subcriteria![2].bands!;
  let c5_3Points: number | undefined;
  if (input.youth_employee_pct !== undefined) {
    c5_3Points = matchNumericBand(input.youth_employee_pct, c5_3Bands);
  }
  addScore('C5.3', c5_3Points, 5, '% youth employees', input.youth_employee_pct !== undefined ? `${input.youth_employee_pct}%` : undefined);

  // ── C6 Expected results (count 1/2/3) ─────────────────────────────────────
  let c6Points: number | undefined;
  if (input.expected_results_count !== undefined) {
    c6Points = scoreC6(input.expected_results_count);
  }
  addScore('C6', c6Points, 20, 'Expected result', input.expected_results_count !== undefined ? `${input.expected_results_count} result(s)` : undefined);

  // ── C7a Employability / job count (numeric) ────────────────────────────────
  const c7aBands = config.criteria.find((c) => c.id === 'C7')!.variants![0].bands!;
  let c7aPoints: number | undefined;
  if (input.job_count !== undefined) {
    c7aPoints = matchNumericBand(input.job_count, c7aBands);
  }
  addScore('C7a', c7aPoints, 25, 'Employability (job count)', input.job_count !== undefined ? `${input.job_count} jobs` : undefined);

  // ── C7b Investment readiness (numeric) ────────────────────────────────────
  const c7bBands = config.criteria.find((c) => c.id === 'C7')!.variants![1].bands!;
  let c7bPoints: number | undefined;
  if (input.investment_readiness !== undefined) {
    c7bPoints = matchNumericBand(input.investment_readiness, c7bBands);
  }
  addScore('C7b', c7bPoints, 25, 'Investment readiness', input.investment_readiness !== undefined ? String(input.investment_readiness) : undefined);

  // ── C8 Management capacity (count with 4+ threshold) ──────────────────────
  let c8Points: number | undefined;
  if (input.management_team_size !== undefined) {
    c8Points = scoreC8(input.management_team_size);
  }
  addScore('C8', c8Points, 5, 'Management capacity', input.management_team_size !== undefined ? `${input.management_team_size} members` : undefined);

  // ── C9 Social/environmental impact (categorical) ───────────────────────────
  const c9Bands = config.criteria.find((c) => c.id === 'C9')!.bands!;
  let c9Points: number | undefined;
  if (input.impact_category) {
    const labelMap: Record<string, string> = {
      green_business_model: 'Green business model',
      both_social_env: 'Both positive social AND environmental impact',
      either_social_or_env: 'Either positive social OR environmental impact',
      neither: 'Neither',
    };
    c9Points = c9Bands.find((b) => b.label === labelMap[input.impact_category!])?.points;
  }
  addScore('C9', c9Points, 10, 'Positive social/environmental impact', input.impact_category);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const nonC7Sum = result.criterionScores
    .filter((c) => c.criterionId !== 'C7a' && c.criterionId !== 'C7b')
    .reduce((sum, c) => sum + c.points, 0);

  const c7aScore = result.criterionScores.find((c) => c.criterionId === 'C7a')?.points ?? 0;
  const c7bScore = result.criterionScores.find((c) => c.criterionId === 'C7b')?.points ?? 0;

  result.totalPointsVariantA = nonC7Sum + c7aScore;
  result.totalPointsVariantB = nonC7Sum + c7bScore;

  return result;
}