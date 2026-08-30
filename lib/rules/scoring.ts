import { ScoringInput, ScoringResult, CriterionScore } from './types';
import config from '@/config/official-criteria.json';
import { checkEligibility } from './eligibility';

function matchBand(value: number, bands: Array<{ label: string; points: number }>): number | undefined {
  for (const band of bands) {
    const label = band.label;
    if (label.includes('>=')) {
      const threshold = parseFloat(label.replace('>=', '').replace('%', ''));
      if (!isNaN(threshold) && value >= threshold) return band.points;
    } else if (label.includes('>')) {
      const threshold = parseFloat(label.replace('>', '').replace('%', ''));
      if (!isNaN(threshold) && value > threshold) return band.points;
    } else if (label.includes('-')) {
      const [min, max] = label.split('-').map((s) => parseFloat(s.replace('%', '').trim()));
      if (!isNaN(min) && !isNaN(max) && value >= min && value <= max) return band.points;
    } else if (label.startsWith('<')) {
      const threshold = parseFloat(label.replace('<', '').replace('%', ''));
      if (!isNaN(threshold) && value < threshold) return band.points;
    }
  }
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
  if (result.eligible === false) {
    return result;
  }

  const addScore = (criterionId: string, points: number | undefined, maxPoints: number, name: string) => {
    if (points === undefined) {
      result.criterionScores.push({
        criterionId,
        name,
        points: 0,
        maxPoints,
        reviewFlag: 'needs_review',
      });
      result.reviewFlags.push(criterionId);
    } else {
      result.criterionScores.push({
        criterionId,
        name,
        points,
        maxPoints,
      });
    }
  };

  // C1.1
  const c1_1Bands = config.criteria.find((c) => c.id === 'C1')!.subcriteria![0].bands!;
  let c1_1Points: number | undefined;
  if (input.sales_growth_pct !== undefined) c1_1Points = matchBand(input.sales_growth_pct, c1_1Bands);
  addScore('C1.1', c1_1Points, 5, 'Sales growth');

  // C1.2
  const c1_2Bands = config.criteria.find((c) => c.id === 'C1')!.subcriteria![1].bands!;
  let c1_2Points: number | undefined;
  if (input.total_employees !== undefined) c1_2Points = matchBand(input.total_employees, c1_2Bands);
  addScore('C1.2', c1_2Points, 5, 'Employment');

  // C2
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
  addScore('C2', c2Points, 5, 'Level of uniqueness');

  // C3
  const c3Bands = config.criteria.find((c) => c.id === 'C3')!.bands!;
  let c3Points: number | undefined;
  if (input.market_served) {
    const labelMap: Record<string, string> = {
      international: 'Reachable to international market',
      import_substituting: 'Import-substituting product/service',
      local_only: 'Reachable to local market only',
    };
    c3Points = c3Bands.find((b) => b.label === labelMap[input.market_served])?.points;
  }
  addScore('C3', c3Points, 5, 'Market served');

  // C4
  const c4Bands = config.criteria.find((c) => c.id === 'C4')!.bands!;
  let c4Points: number | undefined;
  if (input.local_sourcing_pct !== undefined) c4Points = matchBand(input.local_sourcing_pct, c4Bands);
  addScore('C4', c4Points, 5, 'Supply chain');

  // C5.1
  const c5_1Bands = config.criteria.find((c) => c.id === 'C5')!.subcriteria![0].bands!;
  let c5_1Points: number | undefined;
  if (input.ownership) {
    const labelMap: Record<string, string> = {
      women_owned: 'Women owned (partly or fully)',
      women_managed: 'Not women-owned but women-managed',
      neither: 'Neither',
    };
    c5_1Points = c5_1Bands.find((b) => b.label === labelMap[input.ownership])?.points;
  }
  addScore('C5.1', c5_1Points, 5, 'Ownership/management');

  // C5.2
  const c5_2Bands = config.criteria.find((c) => c.id === 'C5')!.subcriteria![1].bands!;
  let c5_2Points: number | undefined;
  if (input.women_employee_pct !== undefined) c5_2Points = matchBand(input.women_employee_pct, c5_2Bands);
  addScore('C5.2', c5_2Points, 5, '% women employees');

  // C5.3
  const c5_3Bands = config.criteria.find((c) => c.id === 'C5')!.subcriteria![2].bands!;
  let c5_3Points: number | undefined;
  if (input.youth_employee_pct !== undefined) c5_3Points = matchBand(input.youth_employee_pct, c5_3Bands);
  addScore('C5.3', c5_3Points, 5, '% youth employees');

  // C6
  const c6Bands = config.criteria.find((c) => c.id === 'C6')!.bands!;
  let c6Points: number | undefined;
  if (input.expected_results_count !== undefined) c6Points = matchBand(input.expected_results_count, c6Bands);
  addScore('C6', c6Points, 20, 'Expected result');

  // C8
  const c8Bands = config.criteria.find((c) => c.id === 'C8')!.bands!;
  let c8Points: number | undefined;
  if (input.management_team_size !== undefined) c8Points = matchBand(input.management_team_size, c8Bands);
  addScore('C8', c8Points, 5, 'Management capacity');

  // C9
  const c9Bands = config.criteria.find((c) => c.id === 'C9')!.bands!;
  let c9Points: number | undefined;
  if (input.impact_category) {
    const labelMap: Record<string, string> = {
      green_business_model: 'Green business model',
      both_social_env: 'Both positive social AND environmental impact',
      either_social_or_env: 'Either positive social OR environmental impact',
      neither: 'Neither',
    };
    c9Points = c9Bands.find((b) => b.label === labelMap[input.impact_category])?.points;
  }
  addScore('C9', c9Points, 10, 'Positive social/environmental impact');

  // C7a
  const c7aBands = config.criteria.find((c) => c.id === 'C7')!.variants![0].bands!;
  let c7aPoints: number | undefined;
  if (input.job_count !== undefined) c7aPoints = matchBand(input.job_count, c7aBands);
  addScore('C7a', c7aPoints, 25, 'Employability (job count)');

  // C7b
  const c7bBands = config.criteria.find((c) => c.id === 'C7')!.variants![1].bands!;
  let c7bPoints: number | undefined;
  if (input.investment_readiness !== undefined) c7bPoints = matchBand(input.investment_readiness, c7bBands);
  addScore('C7b', c7bPoints, 25, 'Investment readiness');

  const nonC7Sum = result.criterionScores
    .filter((c) => c.criterionId !== 'C7a' && c.criterionId !== 'C7b')
    .reduce((sum, c) => sum + c.points, 0);

  const c7aScore = result.criterionScores.find((c) => c.criterionId === 'C7a')?.points ?? 0;
  const c7bScore = result.criterionScores.find((c) => c.criterionId === 'C7b')?.points ?? 0;

  result.totalPointsVariantA = nonC7Sum + c7aScore;
  result.totalPointsVariantB = nonC7Sum + c7bScore;

  return result;
}