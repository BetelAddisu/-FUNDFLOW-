import { NextResponse } from 'next/server';
import { rankApplications, reviewerFixtures } from '@/lib/reviewer';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slotsAvailable = parseInt(searchParams.get('slots') || '2');
    const useFixtures = searchParams.get('fixtures') === 'true';
    
    let applications: any[] = [];
    
    if (useFixtures) {
      // Use synthetic fixtures for demo
      const { ranked, shortlist } = rankApplications(reviewerFixtures, slotsAvailable);
      return NextResponse.json({ ranked, shortlist, slotsAvailable });
    }

    // Fetch from database
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    applications = data || [];
    
    // Format for reviewer
    const ranked = applications.map((app, index) => ({
      id: app.id,
      sessionId: app.session_id,
      channel: app.evidence_snapshot?.channel || 'web',
      synthetic: false,
      eligible: app.scores?.eligible ?? true,
      eligibilityStatus: app.scores?.eligibilityStatus ?? 'eligible',
      exclusions: app.exclusions || [],
      criterionScores: app.scores?.criterionScores || [],
      totalPointsVariantA: app.scores?.totalPointsVariantA || 0,
      totalPointsVariantB: app.scores?.totalPointsVariantB || 0,
      reviewFlags: app.scores?.reviewFlags || [],
      readinessScore: app.readiness_score,
      programmeScore: app.programme_score,
      status: app.status,
      createdAt: app.created_at,
      rank: index + 1,
    }));

    // Sort: eligible first, then by score
    ranked.sort((a, b) => {
      if (a.eligibilityStatus === 'ineligible' && b.eligibilityStatus !== 'ineligible') return 1;
      if (b.eligibilityStatus === 'ineligible' && a.eligibilityStatus !== 'ineligible') return -1;
      if (a.eligibilityStatus === 'needs_review' && b.eligibilityStatus === 'eligible') return 1;
      if (b.eligibilityStatus === 'needs_review' && a.eligibilityStatus === 'eligible') return -1;
      return b.totalPointsVariantA - a.totalPointsVariantA;
    });

    // Re-assign ranks
    ranked.forEach((app, index) => {
      app.rank = index + 1;
    });

    const eligibleApps = ranked.filter(a => a.eligibilityStatus === 'eligible');
    const shortlistSize = Math.min(2 * slotsAvailable, eligibleApps.length);
    const shortlist = eligibleApps.slice(0, shortlistSize);

    return NextResponse.json({ ranked, shortlist, slotsAvailable });
  } catch (error) {
    console.error('Review API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}