'use client';

import { useState, useEffect } from 'react';

interface RankedApplication {
  id: string;
  channel: 'web' | 'telegram';
  synthetic: boolean;
  eligible: boolean;
  eligibilityStatus: 'eligible' | 'ineligible' | 'needs_review';
  exclusions: any[];
  criterionScores: Array<{
    criterionId: string;
    name: string;
    points: number;
    maxPoints: number;
    reviewFlag?: string;
    bandMatched?: string;
    reasoning: string;
  }>;
  totalPointsVariantA: number;
  totalPointsVariantB: number;
  reviewFlags: string[];
  contradiction?: string;
  incompleteFields?: string[];
  rank?: number;
  c7VariantUsed?: 'C7a' | 'C7b';
  readinessScore?: number;
  programmeScore?: number;
  status?: string;
  createdAt?: string;
}

export default function ReviewPage() {
  const [ranked, setRanked] = useState<RankedApplication[]>([]);
  const [shortlist, setShortlist] = useState<RankedApplication[]>([]);
  const [slotsAvailable, setSlotsAvailable] = useState(2);
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<RankedApplication | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'detail'>('table');

  const fetchApplications = async (useFixtures = true) => {
    setLoading(true);
    try {
      const url = useFixtures 
        ? `/api/review/applications?fixtures=true&slots=${slotsAvailable}`
        : `/api/review/applications?slots=${slotsAvailable}`;
      const response = await fetch(url);
      const data = await response.json();
      setRanked(data.ranked || []);
      setShortlist(data.shortlist || []);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(true);
  }, [slotsAvailable]);

  const getEligibilityColor = (status: string) => {
    switch (status) {
      case 'eligible': return '#16a34a';
      case 'ineligible': return '#dc2626';
      case 'needs_review': return '#ea580c';
      default: return '#6b7280';
    }
  };

  const formatScore = (points: number, max: number) => {
    const pct = max > 0 ? Math.round((points / max) * 100) : 0;
    return `${points}/${max} (${pct}%)`;
  };

  return (
    <main className="container" style={{ maxWidth: '1200px', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>Reviewer Dashboard</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Ranked shortlist with per-criterion reasoning (2× {slotsAvailable} = {shortlist.length} shortlisted)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.875rem' }}>Slots:</label>
          <select
            value={slotsAvailable}
            onChange={(e) => setSlotsAvailable(parseInt(e.target.value))}
            style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
          <button
            onClick={() => fetchApplications(true)}
            disabled={loading}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Loading...' : 'Load Fixtures (12)'}
          </button>
        </div>
      </header>

      {selectedApp && viewMode === 'detail' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button onClick={() => { setSelectedApp(null); setViewMode('table'); }} style={{ marginBottom: '1rem', padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.5rem' }}>
            ← Back to List
          </button>
          <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', backgroundColor: 'white' }}>
            <h2 style={{ marginBottom: '1rem' }}>Application Details: {selectedApp.id}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div><strong>Channel:</strong> {selectedApp.channel}</div>
              <div><strong>Synthetic:</strong> {selectedApp.synthetic ? 'Yes' : 'No'}</div>
              <div><strong>Eligibility:</strong> <span style={{ color: getEligibilityColor(selectedApp.eligibilityStatus) }}>{selectedApp.eligibilityStatus}</span></div>
              <div><strong>C7 Variant:</strong> {selectedApp.c7VariantUsed}</div>
              <div><strong>Score A (C7a):</strong> {selectedApp.totalPointsVariantA}/100</div>
              <div><strong>Score B (C7b):</strong> {selectedApp.totalPointsVariantB}/100</div>
            </div>
            {selectedApp.contradiction && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem' }}>
                <strong style={{ color: '#dc2626' }}>Contradiction:</strong> {selectedApp.contradiction}
              </div>
            )}
            {selectedApp.incompleteFields && selectedApp.incompleteFields.length > 0 && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem' }}>
                <strong style={{ color: '#ea580c' }}>Incomplete Fields:</strong> {selectedApp.incompleteFields.join(', ')}
              </div>
            )}
            <h3 style={{ marginBottom: '0.5rem' }}>Criterion Scores</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Criterion</th>
                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Score</th>
                    <th style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>Reasoning</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedApp.criterionScores.map((cs) => (
                    <tr key={cs.criterionId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.5rem' }}>{cs.name} ({cs.criterionId})</td>
                      <td style={{ padding: '0.5rem', fontWeight: cs.reviewFlag ? 'bold' : 'normal', color: cs.reviewFlag ? '#dc2626' : '#111827' }}>
                        {formatScore(cs.points, cs.maxPoints)}
                        {cs.reviewFlag && ' ⚠'}
                      </td>
                      <td style={{ padding: '0.5rem', color: '#6b7280', fontSize: '0.8125rem' }}>{cs.reasoning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '0.5rem', 
        backgroundColor: 'white',
        overflow: 'hidden'
      }}>
        {/* Shortlist */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f0fdf4' }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#166534' }}>Shortlist (2× {slotsAvailable} = {shortlist.length})</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {shortlist.map((app) => (
              <div key={app.id} style={{ padding: '0.5rem 1rem', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                #{app.rank} {app.id} — {app.totalPointsVariantA}/100 ({app.c7VariantUsed})
              </div>
            ))}
          </div>
        </div>

        {/* Ranked List */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Rank</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>ID</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Channel</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Eligibility</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Score A (C7a)</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Score B (C7b)</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>C7 Variant</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Flags</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((app) => (
                <tr key={app.id} style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{app.rank}</td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>{app.id}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', backgroundColor: app.channel === 'web' ? '#dbeafe' : '#e0e7ff', color: app.channel === 'web' ? '#1e40af' : '#3730a3' }}>
                      {app.channel}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ color: getEligibilityColor(app.eligibilityStatus), fontWeight: 500 }}>
                      {app.eligibilityStatus}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{app.totalPointsVariantA}/100</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{app.totalPointsVariantB}/100</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', backgroundColor: app.c7VariantUsed === 'C7a' ? '#fef3c7' : '#dbeafe', color: app.c7VariantUsed === 'C7a' ? '#92400e' : '#1e40af' }}>
                      {app.c7VariantUsed}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {app.reviewFlags.length > 0 && (
                      <span style={{ color: '#dc2626', fontSize: '0.8125rem' }}>⚠ {app.reviewFlags.join(', ')}</span>
                    )}
                    {app.contradiction && !app.reviewFlags.length && <span style={{ color: '#dc2626', fontSize: '0.8125rem' }}>⚠ Contradiction</span>}
                    {app.incompleteFields && app.incompleteFields.length > 0 && !app.reviewFlags.length && <span style={{ color: '#ea580c', fontSize: '0.8125rem' }}>⚠ Incomplete</span>}
                    {!app.reviewFlags.length && !app.contradiction && !app.incompleteFields && <span style={{ color: '#16a34a' }}>✓ Clean</span>}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      onClick={() => { setSelectedApp(app); setViewMode('detail'); }}
                      style={{ padding: '0.25rem 0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8125rem' }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {ranked.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          Click "Load Fixtures (12)" to load synthetic applications for review.
        </div>
      )}
    </main>
  );
}

function formatScore(points: number, max: number) {
  const pct = max > 0 ? Math.round((points / max) * 100) : 0;
  return `${points}/${max} (${pct}%)`;
}

function getEligibilityColor(status: string) {
  switch (status) {
    case 'eligible': return '#16a34a';
    case 'ineligible': return '#dc2626';
    case 'needs_review': return '#ea580c';
    default: return '#6b7280';
  }
}