import { scoreApplication, ScoringResult } from '../rules/scoring';
import { ReviewerFixture, RankedApplication } from './fixtures';

function buildReasoning(criterionId: string, input: any, score: { points: number; maxPoints: number; bandMatched?: string }): string {
  const fieldMap: Record<string, keyof any> = {
    'C1.1': 'sales_growth_pct',
    'C1.2': 'total_employees',
    'C2': 'uniqueness',
    'C3': 'market_served',
    'C4': 'local_sourcing_pct',
    'C5.1': 'ownership',
    'C5.2': 'women_employee_pct',
    'C5.3': 'youth_employee_pct',
    'C6': 'expected_results_count',
    'C7a': 'job_count',
    'C7b': 'investment_readiness',
    'C8': 'management_team_size',
    'C9': 'impact_category',
  };
  const key = fieldMap[criterionId];
  const value = key ? input[key] : undefined;
  if (value !== undefined) {
    return `Value: ${JSON.stringify(value)} (band: ${score.bandMatched || 'N/A'}) → ${score.points}/${score.maxPoints} points.`;
  }
  return `No value provided → review needed.`;
}

export function rankApplications(
  fixtures: ReviewerFixture[],
  slotsAvailable: number
): { ranked: RankedApplication[]; shortlist: RankedApplication[] } {
  const entries: RankedApplication[] = fixtures.map((fixture) => {
    const scoringResult: ScoringResult = scoreApplication(fixture.input);

    const criterionScoresWithReasoning = scoringResult.criterionScores.map((cs) => ({
      ...cs,
      reasoning: buildReasoning(cs.criterionId, fixture.input, cs),
    }));

    // Determine which C7 variant gives higher score
    const c7aScore = scoringResult.criterionScores.find(s => s.criterionId === 'C7a')?.points || 0;
    const c7bScore = scoringResult.criterionScores.find(s => s.criterionId === 'C7b')?.points || 0;
    const c7VariantUsed = c7aScore >= c7bScore ? 'C7a' : 'C7b';

    return {
      id: fixture.id,
      channel: fixture.channel,
      synthetic: fixture.synthetic,
      eligible: scoringResult.eligible,
      eligibilityStatus: scoringResult.eligibilityStatus,
      exclusions: scoringResult.exclusions,
      criterionScores: criterionScoresWithReasoning,
      totalPointsVariantA: scoringResult.totalPointsVariantA,
      totalPointsVariantB: scoringResult.totalPointsVariantB,
      reviewFlags: scoringResult.reviewFlags,
      contradiction: fixture.contradiction,
      incompleteFields: fixture.incompleteFields,
      c7VariantUsed,
    };
  });

  // Sort: eligible first, then by totalPointsVariantA descending
  entries.sort((a, b) => {
    // Ineligible at bottom
    if (a.eligibilityStatus === 'ineligible' && b.eligibilityStatus !== 'ineligible') return 1;
    if (b.eligibilityStatus === 'ineligible' && a.eligibilityStatus !== 'ineligible') return -1;
    
    // Needs review after eligible
    if (a.eligibilityStatus === 'needs_review' && b.eligibilityStatus === 'eligible') return 1;
    if (b.eligibilityStatus === 'needs_review' && a.eligibilityStatus === 'eligible') return -1;
    
    // Both same eligibility status, sort by score
    return b.totalPointsVariantA - a.totalPointsVariantA;
  });

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  // Shortlist: 2x slotsAvailable from eligible and needs_review applications (E3 is pending)
  const shortlistEntries = entries.filter(e => e.eligibilityStatus === 'eligible' || e.eligibilityStatus === 'needs_review');
  const shortlistSize = Math.min(2 * slotsAvailable, shortlistEntries.length);
  const shortlist = shortlistEntries.slice(0, shortlistSize);

  return { ranked: entries, shortlist };
}