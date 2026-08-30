import { scoreApplication } from '@/lib/rules/scoring';
import { ReviewerFixture, ReviewEntry } from './types';

function buildReasoning(criterionId: string, input: any, score: { points: number; maxPoints: number }): string {
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
    return `Value: ${JSON.stringify(value)} → ${score.points} points (${score.maxPoints} max).`;
  }
  return `No value provided → review needed.`;
}

export function rankApplications(
  fixtures: ReviewerFixture[],
  slotsAvailable: number
): { ranked: ReviewEntry[]; shortlist: ReviewEntry[] } {
  const entries: ReviewEntry[] = fixtures.map((fixture) => {
    const scoringResult = scoreApplication(fixture.input);

    const criterionScoresWithReasoning = scoringResult.criterionScores.map((cs) => ({
      ...cs,
      reasoning: buildReasoning(cs.criterionId, fixture.input, cs),
    }));

    return {
      id: fixture.id,
      channel: fixture.channel,
      synthetic: fixture.synthetic,
      eligible: scoringResult.eligible,
      exclusions: scoringResult.exclusions,
      criterionScores: criterionScoresWithReasoning,
      totalPointsVariantA: scoringResult.totalPointsVariantA,
      totalPointsVariantB: scoringResult.totalPointsVariantB,
      reviewFlags: scoringResult.reviewFlags,
      contradiction: fixture.contradiction,
      incompleteFields: fixture.incompleteFields,
    };
  });

  entries.sort((a, b) => {
    if (a.eligible === false && b.eligible !== false) return 1;
    if (b.eligible === false && a.eligible !== false) return -1;
    if (a.eligible === false && b.eligible === false) return 0;
    return b.totalPointsVariantA - a.totalPointsVariantA;
  });

  const nonExcluded = entries.filter((e) => e.eligible !== false);
  const shortlistSize = Math.min(2 * slotsAvailable, nonExcluded.length);
  const shortlist = nonExcluded.slice(0, shortlistSize);

  return { ranked: entries, shortlist };
}