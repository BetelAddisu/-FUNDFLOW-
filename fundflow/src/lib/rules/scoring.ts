import { ScoringInput, ScoringResult, CriterionScore, Band } from './types';
import { loadOfficialCriteria } from '@/config';
import { checkEligibility } from './eligibility';

function parseBand(band: Band): { min?: number; max?: number; points: number; label: string } {
  const label = band.label;
  const points = band.points;
  
  // Parse labels like ">50%", "25-50%", "<24%", ">=75%", "40-74%", "20-39%", "<20%"
  // ">400 jobs", "300-399", "200-299"
  // ">=25", "20-24", "15-19"
  
  if (label.startsWith('>=')) {
    const min = parseFloat(label.replace('>=', '').replace('%', '').replace(' jobs', '').trim());
    return { min, points, label };
  }
  if (label.startsWith('>')) {
    const min = parseFloat(label.replace('>', '').replace('%', '').replace(' jobs', '').trim());
    return { min, points, label };
  }
  if (label.startsWith('<')) {
    const max = parseFloat(label.replace('<', '').replace('%', '').replace(' jobs', '').trim());
    return { max, points, label };
  }
  if (label.includes('-')) {
    const parts = label.split('-').map(p => parseFloat(p.replace('%', '').replace(' jobs', '').trim()));
    return { min: parts[0], max: parts[1], points, label };
  }
  
  return { points, label };
}

function matchBand(value: number, bands: Band[]): { points: number; matchedLabel: string } | null {
  for (const band of bands) {
    const parsed = parseBand(band);
    if (parsed.min !== undefined && parsed.max !== undefined) {
      if (value >= parsed.min && value <= parsed.max) {
        return { points: parsed.points, matchedLabel: parsed.label };
      }
    } else if (parsed.min !== undefined) {
      if (value >= parsed.min) {
        return { points: parsed.points, matchedLabel: parsed.label };
      }
    } else if (parsed.max !== undefined) {
      if (value <= parsed.max) {
        return { points: parsed.points, matchedLabel: parsed.label };
      }
    }
  }
  return null;
}

function scoreSubcriterion(
  criterionId: string,
  name: string,
  maxPoints: number,
  value: number | undefined,
  bands: Band[]
): CriterionScore {
  if (value === undefined) {
    return {
      criterionId,
      name,
      points: 0,
      maxPoints,
      reviewFlag: 'needs_review',
    };
  }

  const match = matchBand(value, bands);
  if (match) {
    return {
      criterionId,
      name,
      points: match.points,
      maxPoints,
      bandMatched: match.matchedLabel,
    };
  }

  // Value doesn't match any band
  return {
    criterionId,
    name,
    points: 0,
    maxPoints,
    reviewFlag: 'needs_review',
    bandMatched: `value ${value} out of range`,
  };
}

function scoreMainCriterion(
  criterionId: string,
  name: string,
  maxPoints: number,
  value: string | undefined,
  bands: Band[],
  valueMap: Record<string, string>
): CriterionScore {
  if (!value) {
    return {
      criterionId,
      name,
      points: 0,
      maxPoints,
      reviewFlag: 'needs_review',
    };
  }

  const label = valueMap[value];
  if (!label) {
    return {
      criterionId,
      name,
      points: 0,
      maxPoints,
      reviewFlag: 'needs_review',
      bandMatched: `unknown value: ${value}`,
    };
  }

  const band = bands.find(b => b.label === label);
  if (band) {
    return {
      criterionId,
      name,
      points: band.points,
      maxPoints,
      bandMatched: label,
    };
  }

  return {
    criterionId,
    name,
    points: 0,
    maxPoints,
    reviewFlag: 'needs_review',
    bandMatched: `label not found: ${label}`,
  };
}

export function scoreApplication(input: ScoringInput): ScoringResult {
  const criteria = loadOfficialCriteria();
  const reviewFlags: string[] = [];
  
  // Check eligibility first
  const eligibility = checkEligibility(input);
  if (!eligibility.eligible) {
    return {
      eligible: false,
      eligibilityStatus: 'ineligible',
      exclusions: eligibility.exclusions,
      criterionScores: [],
      totalPointsVariantA: 0,
      totalPointsVariantB: 0,
      reviewFlags: ['ineligible'],
      readinessScore: 0,
    };
  }

  const criterionScores: CriterionScore[] = [];

  // Helper to add review flags
  const addReviewFlag = (flag: string) => {
    if (!reviewFlags.includes(flag)) reviewFlags.push(flag);
  };

  // C1.1 Sales growth (subcriterion of C1)
  const c1 = criteria.criteria.find(c => c.id === 'C1');
  const c1_1 = c1?.subcriteria?.find(s => s.id === 'C1.1');
  if (c1_1) {
    const score = scoreSubcriterion('C1.1', 'Sales Growth', 5, input.sales_growth_pct, c1_1.bands || []);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C1.2 Employment
  const c1_2 = c1?.subcriteria?.find(s => s.id === 'C1.2');
  if (c1_2) {
    const score = scoreSubcriterion('C1.2', 'Employment', 5, input.total_employees, c1_2.bands || []);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C2 Uniqueness
  const c2 = criteria.criteria.find(c => c.id === 'C2');
  if (c2) {
    const valueMap = {
      'new_in_ethiopia': 'New product/service in Ethiopia',
      'different_from_competitors': 'Not new to Ethiopia but different from competitors (unique feature)',
      'essential': 'Essential product to Ethiopia',
      'no_unique': 'No unique features',
    };
    const score = scoreMainCriterion('C2', 'Level of uniqueness (USP) of product/service', 5, input.uniqueness, c2.bands || [], valueMap);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C3 Market served
  const c3 = criteria.criteria.find(c => c.id === 'C3');
  if (c3) {
    const valueMap = {
      'international': 'Reachable to international market',
      'import_substituting': 'Import-substituting product/service',
      'local_only': 'Reachable to local market only',
    };
    const score = scoreMainCriterion('C3', 'Market served', 5, input.market_served, c3.bands || [], valueMap);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C4 Supply chain
  const c4 = criteria.criteria.find(c => c.id === 'C4');
  if (c4) {
    const score = scoreSubcriterion('C4', 'Supply chain (raw material)', 5, input.local_sourcing_pct, c4.bands || []);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C5.1 Ownership/management
  const c5 = criteria.criteria.find(c => c.id === 'C5');
  const c5_1 = c5?.subcriteria?.find(s => s.id === 'C5.1');
  if (c5_1) {
    const valueMap = {
      'women_owned': 'Women owned (partly or fully)',
      'women_managed': 'Not women-owned but women-managed',
      'neither': 'Neither',
    };
    const score = scoreMainCriterion('C5.1', 'Ownership/management', 5, input.ownership, c5_1.bands || [], valueMap);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C5.2 Women employees %
  const c5_2 = c5?.subcriteria?.find(s => s.id === 'C5.2');
  if (c5_2) {
    const score = scoreSubcriterion('C5.2', '% women employees', 5, input.women_employee_pct, c5_2.bands || []);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C5.3 Youth employees %
  const c5_3 = c5?.subcriteria?.find(s => s.id === 'C5.3');
  if (c5_3) {
    const score = scoreSubcriterion('C5.3', '% youth employees', 5, input.youth_employee_pct, c5_3.bands || []);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C6 Expected results
  const c6 = criteria.criteria.find(c => c.id === 'C6');
  if (c6) {
    const score = scoreSubcriterion('C6', 'Expected result from the intervention', 20, input.expected_results_count, c6.bands || []);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C7a Employability (job count)
  const c7 = criteria.criteria.find(c => c.id === 'C7');
  const c7a = c7?.variants?.find(v => v.id === 'C7a');
  if (c7a) {
    const score = scoreSubcriterion('C7a', 'Employability (Job Creation Potential)', 25, input.job_count, c7a.bands || []);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C7b Investment readiness
  const c7b = c7?.variants?.find(v => v.id === 'C7b');
  if (c7b) {
    const score = scoreSubcriterion('C7b', 'Investment Readiness (Job Creation Potential)', 25, input.investment_readiness, c7b.bands || []);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C8 Management capacity
  const c8 = criteria.criteria.find(c => c.id === 'C8');
  if (c8) {
    const score = scoreSubcriterion('C8', 'Management capacity', 5, input.management_team_size, c8.bands || []);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // C9 Impact
  const c9 = criteria.criteria.find(c => c.id === 'C9');
  if (c9) {
    const valueMap = {
      'green_business_model': 'Green business model (renewables, efficient construction, EV/electric mobility, organic/sustainable agriculture or fisheries, sustainable forestry, recycling, water/energy-saving tech, eco-tourism)',
      'both_social_env': 'Both positive social AND environmental impact',
      'either_social_or_env': 'Either positive social OR environmental impact',
      'neither': 'Neither',
    };
    const score = scoreMainCriterion('C9', 'Positive social/environmental impact / green sector', 10, input.impact_category, c9.bands || [], valueMap);
    if (score.reviewFlag) addReviewFlag(score.reviewFlag);
    criterionScores.push(score);
  }

  // Calculate totals
  // Non-C7 criteria sum
  const nonC7Scores = criterionScores.filter(s => s.criterionId !== 'C7a' && s.criterionId !== 'C7b');
  const nonC7Sum = nonC7Scores.reduce((sum, s) => sum + s.points, 0);

  const c7aScore = criterionScores.find(s => s.criterionId === 'C7a')?.points || 0;
  const c7bScore = criterionScores.find(s => s.criterionId === 'C7b')?.points || 0;

  const totalPointsVariantA = nonC7Sum + c7aScore;
  const totalPointsVariantB = nonC7Sum + c7bScore;

  return {
    eligible: true,
    eligibilityStatus: eligibility.needsReview ? 'needs_review' : 'eligible',
    exclusions: eligibility.exclusions,
    criterionScores,
    totalPointsVariantA,
    totalPointsVariantB,
    reviewFlags,
    readinessScore: 0, // Will be set by caller
  };
}