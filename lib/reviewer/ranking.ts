import { scoreApplication } from '@/lib/rules/scoring';
import { ReviewerFixture, ReviewEntry } from './types';

function buildDetailedReasoning(criterionId: string, input: any, points: number, maxPoints: number, reviewFlag?: string): string {
  if (reviewFlag === 'needs_review' || points === undefined) {
    if (criterionId === 'C7a') return `Job count value ${input.job_count ?? 'unspecified'} falls outside documented grid bands (>200 jobs) → Requires manual reviewer determination.`;
    if (criterionId === 'C7b') return `Investment readiness score unstated → Requires reviewer evaluation.`;
    if (criterionId === 'C1.1') return `Sales growth ${input.sales_growth_pct ?? 'unspecified'}% falls in gap band → Flagged for reviewer decision.`;
    return `Information missing or incomplete → Marked for reviewer verification.`;
  }

  switch (criterionId) {
    case 'C1.1':
      return `Reported sales growth of ${input.sales_growth_pct}% matches official grid band → Awarded ${points}/${maxPoints} pts.`;
    case 'C1.2':
      return `Total workforce of ${input.total_employees} employees places business in the ${input.total_employees > 20 ? '>20' : '11-20'} band → Awarded ${points}/${maxPoints} pts.`;
    case 'C2':
      return `Product uniqueness categorized as "${input.uniqueness?.replace(/_/g, ' ')}" → Awarded ${points}/${maxPoints} pts.`;
    case 'C3':
      return `Target market reach categorized as "${input.market_served?.replace(/_/g, ' ')}" → Awarded ${points}/${maxPoints} pts.`;
    case 'C4':
      return `Local raw material sourcing level at ${input.local_sourcing_pct}% → Awarded ${points}/${maxPoints} pts.`;
    case 'C5.1':
      return `Demographic ownership & management: ${input.ownership?.replace(/_/g, ' ')} → Awarded ${points}/${maxPoints} pts.`;
    case 'C5.2':
      return `Female employee representation at ${input.women_employee_pct}% of total workforce → Awarded ${points}/${maxPoints} pts.`;
    case 'C5.3':
      return `Youth employee (18–24 years) representation at ${input.youth_employee_pct}% → Awarded ${points}/${maxPoints} pts.`;
    case 'C6':
      return `Projected intervention addresses ${input.expected_results_count} core expected result areas → Awarded ${points}/${maxPoints} pts.`;
    case 'C7a':
      return `Employability impact: creation of ${input.job_count} jobs → Awarded ${points}/${maxPoints} pts (Variant A).`;
    case 'C7b':
      return `Investment readiness index of ${input.investment_readiness} → Awarded ${points}/${maxPoints} pts (Variant B).`;
    case 'C8':
      return `Core management team structure consists of ${input.management_team_size} members → Awarded ${points}/${maxPoints} pts.`;
    case 'C9':
      return `Social/Environmental impact classification: ${input.impact_category?.replace(/_/g, ' ')} → Awarded ${points}/${maxPoints} pts.`;
    default:
      return `Awarded ${points}/${maxPoints} points based on established evidence.`;
  }
}

function calculateReadiness(input: any, incompleteFields?: string[]): number {
  const totalKeys = 15;
  const missingCount = (incompleteFields?.length ?? 0) + Object.values(input).filter((v) => v === undefined || v === null).length;
  const establishedCount = Math.max(0, totalKeys - missingCount);
  return Math.min(100, Math.round((establishedCount / totalKeys) * 100));
}

function generateSiteVisitQuestions(fixture: ReviewerFixture, contradiction?: string): string[] {
  const questions: string[] = [];

  if (contradiction) {
    questions.push(`CONTRADICTION INVESTIGATION: ${contradiction}`);
  }

  if (fixture.input.legally_registered_and_years === false) {
    questions.push('EXCLUSION CHECK: Verify original commercial registration date and tin certificate at municipality office.');
  }

  if (fixture.input.privately_owned === false) {
    questions.push('EXCLUSION CHECK: Confirm shareholder registry to establish state vs private ownership.');
  }

  if (fixture.metadata.licensePhotoUrl) {
    questions.push('PHYSICAL CHECK: Match license photo with physical original certificate displayed at business premises.');
  } else {
    questions.push('MISSING DOCUMENT: Request original trade licence document during site visit.');
  }

  if (fixture.metadata.workshopPhotoUrl) {
    questions.push('EQUIPMENT AUDIT: Inspect machinery shown in workshop photos to verify ownership and operational state.');
  } else {
    questions.push('FACILITY AUDIT: Inspect production premises and verify working conditions.');
  }

  questions.push(`EMPLOYMENT VERIFICATION: Audit payroll list for ${fixture.metadata.companyName} to confirm employee counts (${fixture.input.total_employees ?? 'N/A'} total, ${fixture.input.women_employee_pct ?? 'N/A'}% female).`);

  return questions;
}

export function rankApplications(
  fixtures: ReviewerFixture[],
  slotsAvailable: number
): { ranked: ReviewEntry[]; shortlist: ReviewEntry[] } {
  const entries: ReviewEntry[] = fixtures.map((fixture) => {
    const scoringResult = scoreApplication(fixture.input);

    const criterionScoresWithReasoning = scoringResult.criterionScores.map((cs) => ({
      ...cs,
      reasoning: buildDetailedReasoning(cs.criterionId, fixture.input, cs.points, cs.maxPoints, cs.reviewFlag),
    }));

    const readinessPercentage = calculateReadiness(fixture.input, fixture.incompleteFields);
    const siteVisitQuestions = generateSiteVisitQuestions(fixture, fixture.contradiction);

    return {
      id: fixture.id,
      companyName: fixture.metadata.companyName,
      sector: fixture.metadata.businessType,
      region: fixture.metadata.region,
      language: fixture.metadata.language,
      channel: fixture.channel,
      synthetic: fixture.synthetic,
      eligible: scoringResult.eligible,
      exclusions: scoringResult.exclusions,
      criterionScores: criterionScoresWithReasoning,
      totalPointsVariantA: scoringResult.totalPointsVariantA,
      totalPointsVariantB: scoringResult.totalPointsVariantB,
      reviewFlags: scoringResult.reviewFlags,
      readinessPercentage,
      contradiction: fixture.contradiction,
      incompleteFields: fixture.incompleteFields,
      metadata: fixture.metadata,
      siteVisitQuestions,
    };
  });

  // Strict deterministic ordering:
  // 1. Eligible first (true > needs_review > false)
  // 2. Excluded applications always rank BELOW eligible/needs_review regardless of score
  // 3. Among eligible/needs_review, rank by totalPointsVariantA descending
  entries.sort((a, b) => {
    const elScore = (e: boolean | 'needs_review') => (e === true ? 2 : e === 'needs_review' ? 1 : 0);
    const diff = elScore(b.eligible) - elScore(a.eligible);
    if (diff !== 0) return diff;
    return b.totalPointsVariantA - a.totalPointsVariantA;
  });

  const nonExcluded = entries.filter((e) => e.eligible !== false);
  const shortlistSize = Math.min(2 * slotsAvailable, nonExcluded.length);
  const shortlist = nonExcluded.slice(0, shortlistSize);

  return { ranked: entries, shortlist };
}