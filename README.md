# FundFlow

**From a voice note to a fundable proposal.**

An AI funding-intake and review system that lets an Ethiopian small
business owner explain their business the way they naturally
communicate — by talking — instead of filling out a complex funding
form. Built for Challenge 1 of the
[AI Builder Hackathon Addis Ababa](https://hackation.de), 29–30 August
2026.

---

## The problem

Funding applications ask for five years of sales and employment
history, a management table, a hand-drawn organogram, fifteen
declarations, then get scored on a 100-point grid across nine weighted
criteria with exclusion factors that can end an application on the
spot. A business owner with a feature phone and no email can't do that
alone. A reviewer scoring a batch by hand can't easily defend the
result either.

FundFlow turns a spoken conversation and two photos (business license,
workshop) into a structured, evidence-backed application — and gives
reviewers a ranked shortlist they can actually defend, criterion by
criterion.

## How it works

```
Applicant (voice / text / photo)
        │
   ┌────┴────┐
   ▼         ▼
 Website   Telegram
 chatbot     bot
   │         │
   └────┬────┘
        ▼
 Interview Agent → Extraction Agent → Evidence Engine
        │                                   │
        ▼                                   ▼
 Contradiction Engine              Rules Engine (code)
        │                                   │
        └─────────────┬─────────────────────┘
                       ▼
              Application Pack
                       │
              ┌────────┴────────┐
              ▼                 ▼
          Applicant          Reviewer
           view              (ranked shortlist)
```

- **Interview Agent** — the only part that talks to the applicant.
  Warm, adaptive, asks one thing at a time, follows up on gaps or
  inconsistencies rather than re-asking the same question. English,
  Amharic, and Afaan Oromo, on both channels.
- **Extraction Agent** — reads the conversation and photos, outputs
  structured evidence only. Never decides eligibility or score.
- **Rules Engine** (plain code) — applies the real 9-criterion, 100-point
  evaluation grid and exclusion factors. Kept out of the LLM so every
  score is auditable.
- **Application Pack** — the filled form plus an ImpactProtocol/SDG
  draft, generated from evidence only, never from raw transcript.

## Design principle

> FundFlow never turns uncertainty into a fact. Self-reported stays
> self-reported. Missing stays missing. Conflicting gets flagged. Code
> decides eligibility and score — the model never does.

Full architecture, the real evaluation grid, and the real application
form fields live in
[`docs/FundFlow_Challenge_1_Playbook_v3.md`](docs/FundFlow_Challenge_1_Playbook_v3.md).
The phase-by-phase build order and required tests live in
[`docs/fundflow-agent-build-spec-v2.md`](docs/fundflow-agent-build-spec-v2.md).

## Status

Early build — hackathon in progress. Two items are still pending from
the challenge owner and are marked `pending` in
`config/official-criteria.json` rather than guessed: the third
exclusion factor, and the text of the three declarations.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend/backend | Next.js + TypeScript |
| Database | Supabase (PostgreSQL) |
| File storage | Supabase Storage |
| Voice (STT/TTS) | Addis AI → Google → Whisper (fallback chain) |
| Reasoning (LLM) | Primary provider → Groq → OpenRouter → secondary account (fallback chain) |
| Applicant channels | Website chatbot, Telegram bot |
| Validation | Zod |
| Testing | Vitest (unit), Playwright (E2E) |

## Getting started

```bash
git clone https://github.com/<your-org>/fundflow.git
cd fundflow
npm install
cp .env.example .env.local   # fill in the keys below
npm run dev
```

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ADDIS_AI_API_KEY=
GOOGLE_API_KEY=
OPENAI_API_KEY=            # Whisper fallback

REASONING_PRIMARY_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
REASONING_PRIMARY_BACKUP_API_KEY=

TELEGRAM_BOT_TOKEN=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or any provider key to browser
code — all AI and database calls go through server-side routes.

### Try it

1. Start the server; open the website on a phone-width browser window,
   or message the Telegram bot directly.
2. Run through an application in English, then Amharic, then Afaan Oromo.
3. Upload a license photo and a workshop photo.
4. Watch the evidence panel, gap list, and provisional score update live.
5. Switch to the reviewer view, load the 12 synthetic fixture
   applications, and see the ranked, 2×-oversized shortlist with
   per-criterion reasoning.

## Project structure

```
app/
  apply/          # applicant-facing chat UI (website channel)
  review/         # reviewer dashboard
  api/
lib/
  ai/
    providers/    # addis.ts, google.ts, whisper.ts (voice fallback chain)
    reasoning/    # primary.ts, groq.ts, openrouter.ts, primaryBackup.ts
  channels/       # web.ts, telegram.ts
  evidence/       # extractor.ts, validator.ts, contradictions.ts
  rules/          # eligibility.ts, scoring.ts (reads config/official-criteria.json)
  knowledge/
    sdgs.ts       # SDG reference table for the ImpactProtocol draft
  interview/
  supabase/
config/
  official-criteria.json   # the real grid; E3 + declarations still pending
fixtures/
  applicants.json          # 12 synthetic reviewer-demo applications
docs/
  FundFlow_Challenge_1_Playbook_v3.md
  fundflow-agent-build-spec-v2.md
```

## Team

Betel Addisu


## License

MIT (or update to match hackathon rules).
