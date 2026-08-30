import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem', color: '#111827' }}>
        FundFlow
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#4b5563', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
        From a voice note to a fundable proposal. An AI funding-intake and review system for Ethiopian SMEs.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
        <Link
          href="/apply"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '0.5rem',
            fontWeight: 600,
            transition: 'background-color 0.2s',
          }}
        >
          Start Application
        </Link>
        <Link
          href="/review"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#374151',
            color: 'white',
            borderRadius: '0.5rem',
            fontWeight: 600,
            transition: 'background-color 0.2s',
          }}
        >
          Reviewer Dashboard
        </Link>
      </div>
      <div style={{ textAlign: 'left', maxWidth: '700px', margin: '0 auto', padding: '1.5rem', backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
          How it works
        </h2>
        <ol style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.25rem', color: '#374151' }}>
          <li><strong>Speak or type</strong> — Apply in English, Amharic, or Afaan Oromo via web chat or Telegram bot</li>
          <li><strong>Upload photos</strong> — Business license and workshop photos as evidence</li>
          <li><strong>Adaptive interview</strong> — AI asks targeted follow-ups on gaps and inconsistencies</li>
          <li><strong>Evidence-backed</strong> — Every claim tagged: self-reported, document-supported, visually-observed, or flagged</li>
          <li><strong>Rules engine scores</strong> — Real 100-point evaluation grid applied in code, not LLM</li>
          <li><strong>Defensible shortlist</strong> — Ranked 2× oversized shortlist with per-criterion reasoning</li>
        </ol>
      </div>
      <p style={{ marginTop: '2rem', color: '#9ca3af', fontSize: '0.875rem' }}>
        Built for AI Builder Hackathon Addis Ababa 2026
      </p>
    </main>
  );
}