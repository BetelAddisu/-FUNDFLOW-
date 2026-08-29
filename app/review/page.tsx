"use client";

import { useCallback, useEffect, useState } from "react";

interface ReviewRow {
  application: {
    id: string;
    companyNameLabel: string;
    channel: string;
    language: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    reviewerDecisions?: { c7Route?: string };
  };
  eligibility: { status: string; checks?: Array<{ name: string; status: string }> };
  evaluation: { total: number | null; status: string; c7Slot?: { status: string } };
  readiness: { requiredFields: string[]; establishedFields: string[] };
  contradictions: number;
  gapCount: number;
}

interface RankedRow {
  applicationId: string;
  rank: number;
  totalScore: number | null;
  eligibilityStatus: string;
  needsReview: boolean;
}

export default function ReviewDashboard() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [ranked, setRanked] = useState<RankedRow[]>([]);
  const [shortlist, setShortlist] = useState<{ applicationId: string; finalScore: number | null; eligible: boolean }[]>([]);
  const [finalSlots, setFinalSlots] = useState(0);
  const [tab, setTab] = useState<"dashboard" | "ranking" | "shortlist" | "data">("dashboard");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, rk, sl] = await Promise.all([
        fetch("/api/review?view=dashboard").then((x) => x.json()),
        fetch("/api/review?view=ranking").then((x) => x.json()),
        fetch("/api/review?view=shortlist").then((x) => x.json()),
      ]);
      setRows(r.applications ?? []);
      setRanked(rk.ranked ?? []);
      setShortlist(sl.shortlist ?? []);
      setFinalSlots(sl.finalSlots ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rankFor = (id: string) => ranked.find((x) => x.applicationId === id)?.rank;

  return (
    <div className="shell-wide">
      <div className="navbar">
        <strong>FundFlow&nbsp;Reviewer</strong>
        <a href="/review" className={`${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>Dashboard</a>
        <a href="/review" onClick={(e) => { e.preventDefault(); setTab("ranking"); }}>Ranking</a>
        <a href="/review" onClick={(e) => { e.preventDefault(); setTab("shortlist"); }}>Shortlist</a>
        <a href="/review" onClick={(e) => { e.preventDefault(); setTab("data"); }}>Raw data</a>
        <a href="/" className="muted">← Applicant chat</a>
        <button className="button-ghost" style={{ marginLeft: "auto" }} onClick={() => void load()}>Refresh</button>
      </div>

      {loading ? <p>Loading…</p> : null}

      {tab === "dashboard" && (
        <>
          <div className="row" style={{ margin: "10px 0" }}>
            <span className="chip">{rows.length} applications</span>
            <span className="chip">{rows.filter((r) => r.contradictions > 0).length} with contradictions</span>
            <span className="chip">{rows.filter((r) => r.evaluation.total === null).length} pending review</span>
            <span className="chip">{rows.filter((r) => r.eligibility.status !== "fail").length} eligible / check passed</span>
          </div>
          <table className="reviews">
            <thead>
              <tr>
                <th>Company</th>
                <th>Channel</th>
                <th>Eligibility</th>
                <th>Score</th>
                <th>Readiness</th>
                <th>Contradictions</th>
                <th>Rank</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => (rankFor(a.application.id) ?? 999) - (rankFor(b.application.id) ?? 999))
                .map((r) => {
                  const eligible = r.eligibility.status !== "fail";
                  return (
                    <tr key={r.application.id}>
                      <td>
                        <strong>{r.application.companyNameLabel || "—"}</strong>
                        <div className="muted">{r.application.id}</div>
                      </td>
                      <td>{r.application.channel === "telegram" ? "✈️ Telegram" : "🌐 Web"}</td>
                      <td>
                        <span className={`status-pill ${eligible ? "established" : "contradicted"}`}>{r.eligibility.status}</span>
                      </td>
                      <td>
                        {r.evaluation.total === null ? "—" : `${r.evaluation.total}`}
                        {r.evaluation.c7Slot?.status === "needs_review" ? <span className="badge" style={{ marginLeft: 6 }}>C7?</span> : null}
                      </td>
                      <td>
                        {r.readiness.establishedFields.length}/{r.readiness.requiredFields.length}
                      </td>
                      <td>
                        {r.contradictions > 0 ? (
                          <span className="status-pill contradicted">{r.contradictions}</span>
                        ) : (
                          <span className="muted">0</span>
                        )}
                      </td>
                      <td>{rankFor(r.application.id) ?? "—"}</td>
                      <td>
                        <a href={`/review/${r.application.id}`}>Open →</a>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </>
      )}

      {tab === "ranking" && (
        <table className="reviews" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Application</th>
              <th>Score</th>
              <th>Eligibility</th>
              <th>Needs human review?</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((x) => (
              <tr key={x.applicationId}>
                <td><strong>#{x.rank}</strong></td>
                <td>{x.applicationId}</td>
                <td>{x.totalScore ?? "—"}</td>
                <td><span className="status-pill">{x.eligibilityStatus}</span></td>
                <td>{x.needsReview ? <span className="badge">Yes</span> : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "shortlist" && (
        <div style={{ marginTop: 12 }}>
          <div className="row">
            <span className="chip">Final slots: {finalSlots}</span>
            <span className="chip">Shortlisted: {shortlist.length}</span>
          </div>
          <table className="reviews" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Application</th>
                <th>Final score</th>
                <th>Eligible</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shortlist.map((s, i) => (
                <tr key={s.applicationId}>
                  <td>{i + 1}</td>
                  <td>{s.applicationId}</td>
                  <td>{s.finalScore ?? "—"}</td>
                  <td>{s.eligible ? <span className="status-pill established">Yes</span> : <span className="status-pill contradicted">No</span>}</td>
                  <td><a href={`/review/${s.applicationId}`}>Open →</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            The shortlist is produced by the deterministic rules engine. Scores and eligibility
            are evidence-dependent; anything unresolved stays pending until a human reviewer acts.
          </p>
        </div>
      )}

      {tab === "data" && (
        <details>
          <summary>Show JSON (labeled rows, evidence, decisions)</summary>
          <pre className="json">{JSON.stringify(rows, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}