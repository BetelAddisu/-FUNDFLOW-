"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface DetailData {
  ok: boolean;
  application?: {
    id: string;
    companyNameLabel: string;
    channel: string;
    language: string;
    status: string;
    reviewerDecisions?: { c7Route?: string; decidedBy?: string };
    evidence?: Record<string, unknown>;
    application?: Record<string, unknown>;
  };
  eligibility?: { status: string; checks: Array<{ name: string; status: string; note?: string }> };
  evaluation?: {
    total: number | null;
    status: string;
    criteria?: Array<{ criterion: string; name: string; score: number | null; status: string; max: number }>;
    c7Slot?: { status: string; variants: Array<{ id: string; score: number | null }> };
  };
  contradictions?: Array<{ field: string; reason?: string; status?: string }>;
  gaps?: Array<{ field: string; label?: string }>;
  evidence?: Array<{ id: string; kind: string; label: string; description?: string; extractionSummary?: string }>;
  sdgDrafts?: Array<{ sdg: string; name: string; reason: string; status: string }>;
  audit?: Array<{ event: string; timestamp?: string; actor?: string }>;
  session?: { id: string; turns: Array<{ role: string; text?: string; createdAt?: string }> };
}

export default function ReviewDetail() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<DetailData | null>(null);
  const [route, setRoute] = useState<string>("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/review/applications/${params.id}`);
    const j = (await res.json()) as DetailData;
    setData(j);
    setRoute(j.application?.reviewerDecisions?.c7Route ?? "");
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const decideC7 = async () => {
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set-c7-route", applicationId: params.id, route, decidedBy: "reviewer-demo" }),
    });
    const j = await res.json();
    setMessage(j.ok ? `C7 routed to ${route}; totals recalculated.` : j.error ?? "failed");
    void load();
  };

  if (!data?.ok) return <div className="shell-wide">Loading review…</div>;

  const app = data.application!;
  const evidenceMap = app.evidence as Record<string, { status?: string; value?: unknown; values?: unknown[]; reason?: string }> | undefined;
  const evidenceEntries = Object.entries(evidenceMap ?? {});

  return (
    <div className="shell-wide">
      <div className="navbar">
        <a href="/review" className="muted">← Dashboard</a>
        <strong>FundFlow Reviewer — {app.companyNameLabel || app.id}</strong>
      </div>

      <div className="row" style={{ margin: "10px 0" }}>
        <span className="chip">{app.channel === "telegram" ? "✈️ Telegram" : "🌐 Web"}</span>
        <span className="chip">lang: {app.language}</span>
        <span className="chip">status: {app.status}</span>
        <span className="chip">C7: {app.reviewerDecisions?.c7Route ?? "not decided"}</span>
      </div>

      <div className="grid-2">
        <div>
          <div className="section-title">Eligibility</div>
          <div className="card" style={{ padding: 12 }}>
            <p>
              <span className={`status-pill ${data.eligibility?.status === "fail" ? "contradicted" : "established"}`}>
                {data.eligibility?.status}
              </span>
            </p>
            <table className="reviews">
              <thead><tr><th>Check</th><th>Status</th></tr></thead>
              <tbody>
                {(data.eligibility?.checks ?? []).map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>
                      <span className={`status-pill ${c.status === "pass" ? "established" : c.status === "fail" ? "contradicted" : "missing"}`}>
                        {c.status}
                      </span>
                      {c.note ? <div className="muted">{c.note}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="section-title">Programme score</div>
          <div className="card" style={{ padding: 12 }}>
            <p style={{ fontSize: 22, fontWeight: 800 }}>
              {data.evaluation?.total === null || data.evaluation?.total === undefined ? "—" : data.evaluation.total}
              <span className="muted"> / {data.evaluation?.status === "needs_review" ? "counting pending" : "max"}</span>
            </p>
            <table className="reviews">
              <thead><tr><th>Criterion</th><th>Score</th><th>Status</th></tr></thead>
              <tbody>
                {(data.evaluation?.criteria ?? []).map((c) => (
                  <tr key={c.criterion}>
                    <td>{c.criterion} · {c.name}</td>
                    <td>{c.score === null ? "—" : c.score} <span className="muted">/ {c.max}</span></td>
                    <td><span className="status-pill">{c.status}</span></td>
                  </tr>
                ))}
                {data.evaluation?.c7Slot ? (
                  <tr>
                    <td>C7 · Job creation (routing pending)</td>
                    <td>—</td>
                    <td>
                      <span className="status-pill contradicted">{data.evaluation.c7Slot.status}</span>
                      <div className="muted">
                        C7a: {data.evaluation.c7Slot.variants.find((v) => v.id === "C7a")?.score ?? "—"} · C7b: {data.evaluation.c7Slot.variants.find((v) => v.id === "C7b")?.score ?? "—"}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            <div className="row" style={{ marginTop: 10 }}>
              <label className="muted">Resolve C7 routing:</label>
              <select value={route} onChange={(e) => setRoute(e.target.value)} className="chip">
                <option value="">— pending —</option>
                <option value="C7a">C7a (Employability — MSE under 10 employees)</option>
                <option value="C7b">C7b (Job creation)</option>
              </select>
              <button className="button-green" onClick={() => void decideC7()}>Set route</button>
            </div>
            {message ? <div className="muted">{message}</div> : null}
          </div>
        </div>
      </div>

      <div className="section-title">Readiness & gaps</div>
      <div className="card" style={{ padding: 12 }}>
        {(data.gaps ?? []).length === 0
          ? <p className="muted">No outstanding gaps — application ready for evaluation.</p>
          : <ul>{data.gaps!.map((g) => (<li key={g.field}>{g.field}</li>))}</ul>}
      </div>

      <div className="section-title">Contradictions (field-level, never auto-resolved)</div>
      <div className="card" style={{ padding: 12 }}>
        {(data.contradictions ?? []).length === 0
          ? <p className="muted">None.</p>
          : (data.contradictions ?? []).map((c) => (
              <div key={c.field} style={{ marginBottom: 8 }}>
                <strong>{c.field}</strong> — <span className="status-pill contradicted">{c.status ?? "contradicted"}</span>
                <div className="muted">{c.reason}</div>
              </div>
            ))}
      </div>

      <div className="section-title">SDG alignment drafts (potential, not certified)</div>
      <div className="card" style={{ padding: 12 }}>
        {(data.sdgDrafts ?? []).length === 0
          ? <p className="muted">No obvious alignment signals yet.</p>
          : (data.sdgDrafts ?? []).map((s) => (
              <div key={s.sdg} style={{ marginBottom: 6 }}>
                <strong>{s.sdg}</strong> · {s.name} — <span className="muted">{s.reason}</span> <span className="status-pill">{s.status}</span>
              </div>
            ))}
      </div>

      <div className="section-title">Evidence (all field-level claims with source)</div>
      <div className="card" style={{ padding: 12 }}>
        {evidenceEntries.length === 0
          ? <p className="muted">No evidence captured yet.</p>
          : evidenceEntries.map(([field, ev]) => (
              <div key={field} style={{ marginBottom: 8 }}>
                <code>{field}</code>
                <span className={`status-pill ${ev?.status ?? "missing"}`} style={{ marginLeft: 8 }}>{ev?.status ?? "missing"}</span>
                <div className="muted" style={{ marginLeft: 4 }}>
                  {ev?.status === "contradicted"
                    ? (Array.isArray(ev.values) ? JSON.stringify(ev.values) : ev?.reason ?? "")
                    : String(ev?.value ?? "")}
                </div>
              </div>
            ))}
      </div>

      <div className="section-title">Attachments</div>
      <div className="card" style={{ padding: 12 }}>
        {(data.evidence ?? []).length === 0
          ? <p className="muted">None.</p>
          : (data.evidence ?? []).map((e) => (
              <div key={e.id} style={{ marginBottom: 6 }}>
                <strong>{e.label}</strong> <span className="chip">{e.kind}</span>
                <div className="muted">{e.description}</div>
                {e.extractionSummary ? <div className="muted">Extracted: {e.extractionSummary}</div> : null}
              </div>
            ))}
      </div>

      <div className="section-title">Audit trail</div>
      <details>
        <summary className="muted">Show {data.audit?.length ?? 0} events</summary>
        <pre className="json">{JSON.stringify(data.audit, null, 2)}</pre>
      </details>
    </div>
  );
}