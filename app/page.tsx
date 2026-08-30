import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-4 md:p-8 max-w-7xl mx-auto">
      {/* Navigation Header */}
      <header className="flex items-center justify-between py-6 border-b border-slate-800/80 mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20 text-xl">
            F
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              FUNDflow
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                SME Support Scheme
              </span>
            </h1>
            <p className="text-xs text-slate-400">AI Funding Intake & Defensible Review System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/apply"
            className="text-xs md:text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Applicant Intake
          </Link>
          <Link
            href="/review"
            className="text-xs md:text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-md shadow-indigo-600/20"
          >
            Reviewer Console →
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="my-auto py-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Multilingual Support: English • አማርኛ • Afaan Oromo
          </div>

          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            From a <span className="gradient-text">voice note</span> to a <span className="text-cyan-400">defensible funding proposal.</span>
          </h2>

          <p className="text-slate-400 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            FUNDflow turns informal spoken conversations and workshop photos into structured, evidence-backed SME funding applications — giving reviewers a defensible 2× shortlist scored on the official 100-point evaluation grid.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/apply"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/25 transition-all text-center flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              Start Applicant Intake (Chat/Voice)
            </Link>

            <Link
              href="/review"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl glass-card hover:bg-slate-800 text-slate-200 font-semibold border border-slate-700/80 transition-all text-center flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Open Reviewer Dashboard (12 Fixtures)
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
              🎙️
            </div>
            <h3 className="text-lg font-semibold text-white">Dual Channels & Voice</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Applicants use Web chat or Telegram bot with Push-to-talk, audio uploads, and photo attachment (license + workshop). Same evidence backend.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              ⚖️
            </div>
            <h3 className="text-lg font-semibold text-white">Strict Source-of-Truth</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              FUNDflow never turns uncertainty into fact. LLM extracts and translates; deterministic code handles eligibility, exclusions, and evaluation scores.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              📊
            </div>
            <h3 className="text-lg font-semibold text-white">Defensible 2× Shortlist</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Reviewer console surfaces criterion-by-criterion scores, C7a/C7b grid variants, contradiction flags, and site visit verification questions.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          FUNDflow SME Support Scheme • AI Builder Hackathon Addis Ababa 2026
        </div>
        <div className="flex items-center gap-6">
          <span className="text-slate-400">Addis AI • Gemini • Groq • Whisper</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">v3.0 Playbook</span>
        </div>
      </footer>
    </main>
  );
}