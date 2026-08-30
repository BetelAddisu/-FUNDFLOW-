import { NextRequest, NextResponse } from 'next/server';
import { reviewerFixtures } from '@/lib/reviewer/fixtures';
import { rankApplications } from '@/lib/reviewer/ranking';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slotsParam = searchParams.get('slots');
  const slotsAvailable = slotsParam ? parseInt(slotsParam, 10) : 2;

  const result = rankApplications(reviewerFixtures, slotsAvailable);

  const metrics = {
    totalApplications: result.ranked.length,
    eligibleCount: result.ranked.filter((a) => a.eligible === true).length,
    needsReviewCount: result.ranked.filter((a) => a.eligible === 'needs_review').length,
    excludedCount: result.ranked.filter((a) => a.eligible === false).length,
    shortlistCount: result.shortlist.length,
    slotsAvailable,
    averageScoreVariantA: Math.round(
      result.ranked.reduce((acc, curr) => acc + curr.totalPointsVariantA, 0) / result.ranked.length
    ),
  };

  return NextResponse.json({
    metrics,
    ranked: result.ranked,
    shortlist: result.shortlist,
    slotsAvailable,
  });
}