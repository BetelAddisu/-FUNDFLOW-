'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ReviewEntry {
  id: string;
  companyName: string;
  sector: string;
  region: string;
  language: 'en' | 'am' | 'om';
  channel: 'web' | 'telegram';
  synthetic: boolean;
  eligible: boolean | 'needs_review';
  exclusions: Array<{ id: string; status: string; triggered?: boolean; reason?: string }>;
  criterionScores: Array<{
    criterionId: string;
    name: string;
    points: number;
    maxPoints: number;
    reviewFlag?: string;
    evidenceValue?: string;
    reasoning: string;
  }>;
  totalPointsVariantA: number;
  totalPointsVariantB: number;
  reviewFlags: string[];
  readinessPercentage: number;
  contradiction?: string;
  incompleteFields?: string[];
  metadata: {
    companyName: string;
    businessType: string;
    region: string;
    yearsInOperation: number;
    language: 'en' | 'am' | 'om';
    submissionDate: string;
    licensePhotoUrl?: string;
    workshopPhotoUrl?: string;
  };
  siteVisitQuestions: string[];
}

export default function ReviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'shortlist' | 'eligible' | 'needs_review' | 'excluded'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<ReviewEntry | null>(null);
  const [slotsAvailable, setSlotsAvailable] = useState<number>(2);

  useEffect(() => {
    fetchReviewData(slotsAvailable);
  }, [slotsAvailable]);

  const fetchReviewData = (slots: number) => {
    setLoading(true);
    fetch(`/api/review/applications?slots=${slots}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-300 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          Loading Reviewer Console & Ranking Engine...
        </div>
      </div>
    );
  }

  const { ranked = [], shortlist = [], metrics = {} } = data || {};

  // Filtered applications list
  const filteredApps = ranked.filter((app: ReviewEntry) => {
    const matchesSearch =
      app.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'shortlist') return shortlist.some((s: any) => s.id === app.id);
    if (filter === 'eligible') return app.eligible === true;
    if (filter === 'needs_review') return app.eligible === 'needs_review';
    if (filter === 'excluded') return app.eligible === false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-[#0d121d] px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            ←
          </Link>
          <div>
            <h1 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
              Reviewer Console
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Official Evaluation Grid
              </span>
            </h1>
            <p className="text-xs text-slate-400">SME Support Scheme Defensible Shortlisting</p>
          </div>
        </div>

        {/* Shortlist Config & Banner */}
        <div className="flex items-center gap-4">
          <div data-testid="synthetic-label" className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Synthetic Fixture Data (12 Applicants)
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Final Slots (N):</span>
            <select
              value={slotsAvailable}
              onChange={(e) => setSlotsAvailable(parseInt(e.target.value, 10))}
              className="bg-slate-800 text-white font-bold rounded px-2 py-0.5 border border-slate-700 focus:outline-none"
            >
              <option value={1}>1 (Shortlist: 2)</option>
              <option value={2}>2 (Shortlist: 4)</option>
              <option value={3}>3 (Shortlist: 6)</option>
              <option value={4}>4 (Shortlist: 8)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Metric Cards Banner */}
      <div className="max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Received</div>
          <div className="text-2xl font-bold text-white">{metrics.totalApplications}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1 border-l-2 border-l-emerald-500">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Eligible</div>
          <div className="text-2xl font-bold text-emerald-400">{metrics.eligibleCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1 border-l-2 border-l-amber-500">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Needs Review</div>
          <div className="text-2xl font-bold text-amber-400">{metrics.needsReviewCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1 border-l-2 border-l-rose-500">
          <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Excluded</div>
          <div className="text-2xl font-bold text-rose-400">{metrics.excludedCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1 border-l-2 border-l-indigo-500">
          <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Shortlist (2× N)</div>
          <div className="text-2xl font-bold text-indigo-400">{metrics.shortlistCount}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Score (C1-C9)</div>
          <div className="text-2xl font-bold text-cyan-400">{metrics.averageScoreVariantA}/100</div>
        </div>
      </div>

      {/* Main Reviewer Workstation */}
      <div className="max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Filter Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-panel p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation & Filters</h3>

            <div className="space-y-1 text-sm font-medium">
              <button
                onClick={() => setFilter('all')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                  filter === 'all' ? 'bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>All Submissions</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800">{ranked.length}</span>
              </button>

              <button
                onClick={() => setFilter('shortlist')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                  filter === 'shortlist' ? 'bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-1.5">⭐ Shortlist (2× {slotsAvailable})</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">{shortlist.length}</span>
              </button>

              <button
                onClick={() => setFilter('eligible')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                  filter === 'eligible' ? 'bg-emerald-600/20 text-emerald-400 font-semibold border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>Fully Eligible</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">{metrics.eligibleCount}</span>
              </button>

              <button
                onClick={() => setFilter('needs_review')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                  filter === 'needs_review' ? 'bg-amber-600/20 text-amber-400 font-semibold border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>Needs Review</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">{metrics.needsReviewCount}</span>
              </button>

              <button
                onClick={() => setFilter('excluded')}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                  filter === 'excluded' ? 'bg-rose-600/20 text-rose-400 font-semibold border border-rose-500/30' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span>Excluded</span>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">{metrics.excludedCount}</span>
              </button>
            </div>
          </div>

          {/* Source Material Callout */}
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-indigo-400">
              📌 Official Grid Rules Applied
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Criteria scored out of 100 points. Excluded applications are deterministically ranked below eligible ones regardless of numerical score. C7a (Employability) & C7b (Investment Readiness) variants are both computed.
            </p>
          </div>
        </div>

        {/* Right Table / Main View */}
        <div className="lg:col-span-9 space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, sector, or ID..."
              className="flex-1 bg-[#121721] border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="text-xs text-slate-400">
              Showing <span className="text-white font-semibold">{filteredApps.length}</span> entries
            </div>
          </div>

          {/* Applications Ranked Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0d121d] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Sector</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Eligibility</th>
                    <th className="py-3 px-4">Score (A / B)</th>
                    <th className="py-3 px-4">Readiness</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredApps.map((app: ReviewEntry, idx: number) => {
                    const isShortlisted = shortlist.some((s: any) => s.id === app.id);
                    return (
                      <tr
                        key={app.id}
                        data-testid={isShortlisted ? 'shortlist-item' : 'ranked-item'}
                        onClick={() => setSelectedApp(app)}
                        className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                          isShortlisted ? 'bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold">
                            {isShortlisted && <span title="Shortlisted Candidate">⭐</span>}
                            <span className={isShortlisted ? 'text-indigo-400 font-extrabold' : 'text-slate-400'}>
                              #{idx + 1}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white text-sm">{app.companyName}</div>
                          <div className="text-[10px] text-slate-500">{app.region} • {app.id}</div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-300">{app.sector}</td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              app.channel === 'telegram'
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {app.channel.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              app.eligible === true
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : app.eligible === 'needs_review'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {app.eligible === true ? 'Eligible' : app.eligible === 'needs_review' ? 'Needs Review' : 'Excluded'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">
                            {app.totalPointsVariantA} <span className="text-slate-500 text-xs font-normal">/ {app.totalPointsVariantB}</span>
                          </div>
                          <div className="text-[9px] text-slate-500">C7a: Employability vs C7b: Invest</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs">{app.readinessPercentage}%</span>
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-500"
                                style={{ width: `${app.readinessPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApp(app);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 font-semibold text-xs transition-colors"
                          >
                            Inspect →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Application Inspection Modal / Drawer */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121721] border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-[#0d121d]">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{selectedApp.companyName}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    ID: {selectedApp.id}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Sector: {selectedApp.sector} • Region: {selectedApp.region} • Channel: {selectedApp.channel.toUpperCase()}
                </p>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Window */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Contradictions Banner */}
              {selectedApp.contradiction && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1">
                  <div className="font-bold text-rose-400 flex items-center gap-2 text-xs">
                    <span>⚠️</span> Contradiction Engine Flag
                  </div>
                  <p className="leading-relaxed">{selectedApp.contradiction}</p>
                </div>
              )}

              {/* Score Breakdown Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Score (C7a Employability)</div>
                  <div className="text-2xl font-extrabold text-cyan-400">{selectedApp.totalPointsVariantA} / 100</div>
                  <p className="text-[10px] text-slate-500">Includes C7a Variant (Employability)</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Score (C7b Investment)</div>
                  <div className="text-2xl font-extrabold text-purple-400">{selectedApp.totalPointsVariantB} / 100</div>
                  <p className="text-[10px] text-slate-500">Includes C7b Variant (Investment Readiness)</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Eligibility & Exclusions</div>
                  <div
                    className={`text-lg font-extrabold uppercase ${
                      selectedApp.eligible === true
                        ? 'text-emerald-400'
                        : selectedApp.eligible === 'needs_review'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {selectedApp.eligible === true ? 'Eligible' : selectedApp.eligible === 'needs_review' ? 'Needs Review' : 'Ineligible'}
                  </div>
                  <p className="text-[10px] text-slate-500">E1/E2 Evaluated • E3 Pending</p>
                </div>
              </div>

              {/* Criterion-by-Criterion Evaluation Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                  Criterion-by-Criterion Evaluation Grid
                </h3>

                <div className="grid grid-cols-1 gap-2.5">
                  {selectedApp.criterionScores.map((c) => (
                    <div key={c.criterionId} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-200">
                          {c.criterionId} — {c.name}
                        </div>
                        <div className="flex items-center gap-2">
                          {c.reviewFlag === 'needs_review' && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Needs Review
                            </span>
                          )}
                          <span className="font-bold text-cyan-400">
                            {c.points} / {c.maxPoints} pts
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-400 text-[11px] leading-relaxed">{c.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open Verification Questions for Site Visit */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <span>📋</span> Open Questions for Site Visit / Physical Verification
                </h3>

                <ul className="space-y-1.5 text-slate-300 text-xs">
                  {selectedApp.siteVisitQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-400">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#0d121d] flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Evaluation generated from established evidence only. Zero-Uncertainty Engine.
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}