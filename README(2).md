# FundFlow

> **From a voice note to a defensible funding shortlist.**

FundFlow is an AI-assisted SME funding-intake and reviewer decision-support prototype built for Challenge 1 of the AI Builder Hackathon Addis Ababa.

It lets an applicant explain their business through **text, live voice, uploaded audio, and photos**, then converts that interaction into the structured SME Support Scheme application.

A separate reviewer platform receives the same application and provides:

- evidence-aware form review;
- missing-field detection;
- contradiction detection;
- eligibility/exclusion checks;
- criterion-level scoring;
- final score;
- deterministic ranking;
- a configurable 2× shortlist.

## Important scope clarification

FundFlow has two applicant channels:

1. **Website chatbot**
2. **Telegram bot**

Both support:

- text;
- voice;
- photos.

Telegram should **not** be described as a feature-phone solution. It is an alternative low-friction channel for users who can access Telegram.

IVR and USSD are intentionally excluded because the required photo evidence cannot be completed through those channels in the current prototype.

## Architecture

```text
Applicant
   │
   ├─────────────── Website
   │                   │
   │             text / live voice /
   │             uploaded audio / photos
   │
   └─────────────── Telegram
                       │
                 text / voice / photos
                       │
                       ▼
             InterviewSessionService
                       │
                       ▼
                Evidence Engine
                       │
              ┌────────┴────────┐
              ▼                 ▼
        Gap/Contradiction    Application
             Engine             State
              │                 │
              └────────┬────────┘
                       ▼
                 Rules Engine
                       │
              ┌────────┴────────┐
              ▼                 ▼
          Eligibility        Evaluation
                               Grid
                                │
                                ▼
                             Ranking
                                │
                                ▼
                            Shortlist
                                │
                                ▼
                         Reviewer Platform
```

## Core principle

> **FundFlow never turns uncertainty into a fact.**

Self-reported information remains self-reported.

Document-supported information remains document-supported.

Missing information remains missing.

Conflicting information is flagged.

The AI extracts and assists.

Deterministic code applies the official evaluation rules.

## Applicant experience

The web chatbot supports:

- English;
- Amharic;
- Afaan Oromo;
- text;
- live microphone;
- uploaded audio;
- license photo;
- workshop/business photo.

The Telegram bot supports the same input categories through Telegram's native message types.

Both channels feed the same canonical application model.

## Reviewer experience

The reviewer uses a separate web application.

The reviewer can:

1. view submitted applications;
2. open the structured application;
3. inspect evidence;
4. see missing information;
5. see contradictions;
6. check eligibility;
7. evaluate the company against the official grid;
8. inspect criterion-level reasoning;
9. view the final score;
10. rank applications;
11. produce a shortlist at 2× the final number of places.

The later human verification/evaluation stage is not replaced by FundFlow.

## Evidence model

Every important field carries source information.

```text
self_reported
document_supported
visually_observed
verified
not_established
contradicted
```

The system also preserves approximate answers instead of silently rounding them.

## Official evaluation

The supplied company evaluation grid contains nine criteria totaling 100 points:

| Criterion | Maximum |
|---|---:|
| Success story | 10 |
| Uniqueness / USP | 5 |
| Market served | 5 |
| Supply chain | 5 |
| Ownership and demography | 15 |
| Expected result | 20 |
| Job creation potential | 25 |
| Management capacity | 5 |
| Social/environmental impact | 10 |
| **Total** | **100** |

The scoring grid is stored as configuration rather than embedded in prompts.

Any unresolved official rule remains marked `pending`.

## AI architecture

### Voice

Provider adapters are used so the system can survive provider failure.

The intended order can include:

```text
Addis AI
   ↓
Google/Gemini
   ↓
local Whisper
```

The exact provider order is configuration.

For a strict $0 demo, a local Whisper fallback is preferable to assuming that a metered external Whisper API is free.

### Reasoning

The reasoning layer is also provider-agnostic.

Possible configured providers include:

```text
Primary provider
Groq
OpenRouter
Backup account
```

A provider failure should trigger a fallback or an explicit unresolved state.

It must never trigger fabricated content.

## SDG / ImpactProtocol support

FundFlow includes a small SDG knowledge base.

The system can produce:

> Potential alignment: SDG 8

based on established application evidence.

It must not claim independently verified SDG impact.

## Technology

```text
Next.js
TypeScript
Supabase PostgreSQL
Supabase Storage
Zod
Vitest
Playwright
Telegram Bot API
```

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ADDIS_AI_API_KEY=
GOOGLE_API_KEY=

REASONING_PRIMARY_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
REASONING_PRIMARY_BACKUP_API_KEY=

TELEGRAM_BOT_TOKEN=
```

Never expose service-role or provider secrets to browser code.

## Development

```bash
git clone https://github.com/<your-org>/fundflow.git
cd fundflow
npm install
cp .env.example .env.local
npm run dev
```

Tests:

```bash
npm test
npm run test:e2e
```

## Repository

```text
app/
  apply/
  review/
  api/

components/
  applicant/
  reviewer/
  evidence/
  evaluation/

lib/
  ai/
  channels/
  interview/
  evidence/
  rules/
  knowledge/
  storage/
  db/

config/
  official-criteria.json

fixtures/
  applications/
  transcripts/
  audio/
  images/

tests/
  unit/
  integration/
  e2e/

docs/
  FundFlow_Challenge_1_Grounded_Playbook_v3.md
  FundFlow_Coding_Agent_Build_Spec_v3.md
```

## Testing philosophy

The dangerous cases are tested first:

- missing information;
- refusal;
- contradictory values;
- unreadable documents;
- provider outage;
- undocumented score band;
- unresolved exclusion factor.

The system must prefer:

```text
needs_review
```

over an invented answer.

## Synthetic demo data

Synthetic reviewer fixtures are labeled clearly:

> **SYNTHETIC DEMO DATA**

They are used only to demonstrate ranking and reviewer workflows.

They must never be presented as real applicants.

## Current status

Hackathon prototype.

Pending source decisions must remain explicitly marked in:

```text
config/official-criteria.json
```

rather than guessed.

## License

MIT, unless the hackathon's rules require another license.

## Builder

Betel Addisu
