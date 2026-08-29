# FundFlow

### AI-Powered Beneficiary Monitoring for Inclusive Programme Reporting

**FundFlow** is an AI-powered monitoring and reporting system designed to help programmes collect reliable beneficiary-level evidence without excluding people who lack smartphones, internet access, or digital literacy.

Instead of relying entirely on employer-reported forms and spreadsheets, FundFlow lets programme teams collect information directly from beneficiaries through **voice, IVR, USSD, and smartphone-based conversations**, then converts those interactions into structured, auditable monitoring data.

> **Ask the people the programme is for. Verify what they say. Never guess what you don't know.**

---

## The Problem

Development programmes often depend on reports submitted by employers, partners, or field teams to understand whether programme outcomes are actually being achieved.

The problem is that these reports can be:

* difficult to verify
* incomplete
* inconsistent
* disconnected from beneficiary experiences
* inaccessible to people without smartphones
* time-consuming to collect and review

A beneficiary may have valuable information about their employment, income, working conditions, or programme experience, but the monitoring system may never directly hear from them.

This creates an evidence gap:

```text
Programme
    │
    ▼
Employer / Partner Report
    │
    ▼
Spreadsheet
    │
    ▼
Monitoring Decision
```

FundFlow introduces a missing layer:

```text
                    ┌──────────────────────┐
                    │      Beneficiary     │
                    └──────────┬───────────┘
                               │
                  ┌────────────┼────────────┐
                  │            │            │
                Voice         IVR          USSD
                  │            │            │
                  └────────────┼────────────┘
                               ▼
                    ┌──────────────────────┐
                    │      FundFlow        │
                    │   AI Conversation    │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Evidence Extraction  │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Deterministic Rules  │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Verified Monitoring  │
                    │       Record         │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Programme Dashboard │
                    └──────────────────────┘
```

---

# What FundFlow Does

FundFlow conducts a short conversation with a beneficiary and transforms the conversation into structured monitoring evidence.

The system separates **what the person said** from **what the system concludes**.

### 1. Conversation

The beneficiary interacts through the channel available to them:

* Smartphone voice
* Browser voice
* IVR phone call
* USSD
* Text-based fallback

### 2. Evidence Extraction

An AI agent reads the conversation and extracts only facts that were actually established.

For example:

```json
{
  "age_years": 24,
  "hours_per_day": 8,
  "days_per_week": 5,
  "employment_duration_weeks": 32,
  "pay_amount": 4500,
  "pay_frequency": "monthly"
}
```

If something was not established:

```json
{
  "pay_amount": null,
  "confidence": 0.12,
  "status": "unclear"
}
```

FundFlow does **not** invent missing information.

### 3. Deterministic Evaluation

The AI does not decide whether a beneficiary satisfies a programme criterion.

Instead:

```text
Conversation
      ↓
AI extracts facts
      ↓
Structured JSON
      ↓
Rules Engine
      ↓
Met / Not Met / Unclear
```

This makes the reasoning auditable.

### 4. Aggregation

Individual beneficiary records can be aggregated into programme-level monitoring information:

* number of beneficiaries interviewed
* demographic breakdown
* employment indicators
* working hours
* employment duration
* income/pay information
* criterion-level results
* unclear records
* contradictions
* follow-up requirements

---

# Designed for People Who Are Usually Left Out

A core principle of FundFlow is:

> **Digital inclusion should not mean forcing everyone onto a smartphone.**

FundFlow therefore supports multiple access channels.

## Smartphone

For beneficiaries with smartphones and connectivity:

```text
Phone Browser
     ↓
FundFlow
     ↓
Voice Conversation
     ↓
AI Agent
```

The experience can be conversational rather than form-based.

---

## IVR

For beneficiaries without smartphones or internet access:

```text
Feature Phone
     ↓
Phone Call
     ↓
IVR
     ↓
FundFlow Voice Agent
     ↓
Speech Recognition
     ↓
Evidence Extraction
```

The beneficiary simply calls a number and speaks.

The system can ask questions such as:

> "Can you tell me about the work you do?"

The beneficiary answers naturally instead of navigating a long digital form.

---

## USSD

For beneficiaries who cannot use voice comfortably:

```text
Feature Phone
     ↓
*XXX#
     ↓
USSD Menu
     ↓
Simple Questions
     ↓
Responses
     ↓
FundFlow
```

USSD provides an extremely lightweight fallback because it does not require:

* a smartphone
* mobile data
* an application
* digital literacy beyond basic phone interaction

---

# Multichannel Architecture

FundFlow treats the channel as an interface rather than the product itself.

```text
                     ┌───────────────┐
                     │   Beneficiary │
                     └───────┬───────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
       Smartphone           IVR             USSD
          Voice             Voice            Text
            │                │                │
            └────────────────┼────────────────┘
                             ▼
                    ┌─────────────────┐
                    │ FundFlow Core   │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │ AI Agent        │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │ Evidence Layer  │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │ Rules Engine    │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │ Monitoring Data │
                    └─────────────────┘
```

---

# AI Architecture

FundFlow intentionally uses AI only where AI provides value.

## AI responsibilities

The AI handles:

* natural conversation
* language understanding
* interpreting free-form answers
* extracting structured evidence
* identifying ambiguity
* identifying contradictions
* generating neutral explanations

## Non-AI responsibilities

Traditional deterministic code handles:

* threshold calculations
* aggregation
* validation
* eligibility logic
* record state
* hard safety rules
* database operations

This architecture prevents the LLM from becoming an unaccountable decision-maker.

---

# Agent Architecture

FundFlow can be implemented as several focused components.

```text
                    ┌──────────────────────┐
                    │  Conversation Agent  │
                    │                      │
                    │ Talks to beneficiary │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Extraction Agent    │
                    │                      │
                    │ Transcript → Facts   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Rules Engine      │
                    │                      │
                    │ Facts → Verdicts     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Aggregator        │
                    │                      │
                    │ Records → Insights   │
                    └──────────────────────┘
```

---

# The "Never Guess" Principle

One of FundFlow's most important design decisions is that missing information remains missing.

Bad system:

```text
Beneficiary:
"I work there for quite some time."

AI:
"Employment duration = 26 weeks"
```

FundFlow:

```text
Beneficiary:
"I work there for quite some time."

FundFlow:

employment_duration_weeks = null
status = "unclear"
confidence = low
follow_up_required = true
```

This creates a crucial distinction:

```text
NOT ESTABLISHED ≠ NO

UNKNOWN ≠ FALSE
```

The system preserves uncertainty rather than hiding it.

---

# Evidence-Based Verdicts

Every criterion should have an explainable result.

Example:

```json
{
  "criterion": "weekly_hours",
  "status": "met",
  "confidence": 0.94,
  "evidence": {
    "hours_per_day": 8,
    "days_per_week": 5,
    "calculated_weekly_hours": 40
  }
}
```

Or:

```json
{
  "criterion": "employment_duration",
  "status": "unclear",
  "confidence": 0.31,
  "evidence": {
    "reported_duration": null
  },
  "follow_up_required": true
}
```

A monitoring officer can therefore understand:

1. what was reported
2. what was calculated
3. what rule was applied
4. what remains unknown

---

# Language Accessibility

FundFlow is designed for multilingual deployment.

The initial prototype focuses on:

* English
* Amharic

The architecture allows additional languages to be added without rebuilding the monitoring engine.

```text
Language Layer
     │
     ├── English
     ├── Amharic
     ├── Afaan Oromo
     ├── Tigrinya
     └── Other supported languages
             │
             ▼
       Same Evidence Schema
             │
             ▼
       Same Rules Engine
```

The underlying monitoring logic remains language-independent.

---

# Addis AI Integration

FundFlow can use Addis AI for Ethiopian-language speech capabilities.

Potential pipeline:

```text
Beneficiary Speech
       ↓
Addis AI STT
       ↓
Transcript
       ↓
Conversation / Extraction Agent
       ↓
Structured Evidence
       ↓
Rules Engine
       ↓
Result
       ↓
Addis AI TTS
       ↓
Beneficiary
```

This is particularly useful for the Amharic voice experience.

---

# Data Model

A simplified interview record:

```json
{
  "interview_id": "uuid",
  "channel": "voice",
  "language": "am",
  "consent_confirmed": true,

  "beneficiary": {
    "age_years": 24
  },

  "employment": {
    "work_type": "informal",
    "hours_per_day": 8,
    "days_per_week": 5,
    "duration_weeks": 32
  },

  "pay": {
    "amount": 4500,
    "frequency": "monthly"
  },

  "criteria": {
    "working_hours": {
      "status": "met",
      "confidence": 0.96
    },
    "employment_duration": {
      "status": "met",
      "confidence": 0.91
    }
  },

  "flags": [],

  "metadata": {
    "created_at": "...",
    "source": "beneficiary_interview"
  }
}
```

---

# Consent

Consent is treated as part of the data pipeline.

Before collecting programme information, FundFlow explains:

* why information is being collected
* what it will be used for
* that participation is optional
* that the beneficiary can decline

A simplified flow:

```text
Explain purpose
      ↓
Ask for consent
      ↓
YES ───────────→ Begin interview
      │
      NO
      ↓
End respectfully
```

The system should never treat silence or ambiguity as consent.

---

# Privacy by Design

FundFlow should minimize the amount of personally identifiable information stored.

Where possible:

* use pseudonymous beneficiary IDs
* separate identity information from monitoring data
* encrypt sensitive data
* restrict reviewer access
* retain only necessary transcripts
* log access to sensitive records
* avoid sending unnecessary personal information to the LLM

Raw transcripts should not automatically become permanent programme records.

---

# Contradiction Detection

FundFlow can compare beneficiary-reported information against employer or programme-reported figures.

Example:

```text
Employer report:
120 workers

Beneficiary interviews:
94 workers represented in sample

Reported average:
8 hours/day

Beneficiary evidence:
5.8 hours/day
```

FundFlow should not automatically claim fraud.

Instead:

```text
CONTRADICTION DETECTED

Employer-reported working hours: 8/day
Worker-reported average: 5.8/day

Difference: 2.2 hours/day

Status:
Requires follow-up
```

The system identifies discrepancies.

A human decides what they mean.

---

# Hard Cases

FundFlow is explicitly designed to handle difficult inputs.

## Refusal

Beneficiary:

> "I don't want to answer that."

System:

```text
status = "not disclosed"
```

The AI must not pressure the person.

---

## Contradictory Answers

Example:

```text
Earlier:
"I have worked here for two years."

Later:
"I started last month."
```

FundFlow:

```text
status = "contradiction"
follow_up_required = true
```

It does not arbitrarily select one answer.

---

## Underage Respondent

If an age below the defined minimum is established:

```text
Age detected
      ↓
Hard stop
      ↓
Stop collecting employment details
      ↓
Thank respondent
      ↓
End interview
```

This guardrail must exist in application code, not only in the AI prompt.

---

# Technology Stack

The prototype is designed to run using free or already-available tooling.

### Frontend

* Next.js
* React
* Tailwind CSS

### Backend

* Python
* FastAPI

or:

* Node.js
* Express

### Database

* Supabase PostgreSQL

### Authentication

* Supabase Auth

### Storage

* Supabase Storage

### AI

* Available free/API credits
* Local/open-source models where practical
* Addis AI for Ethiopian speech capabilities

### Speech

* Addis AI
* Whisper as fallback for speech recognition

### Deployment

For the hackathon prototype:

* local development
* free hosting tiers where available
* lightweight tunnel for demonstration

The architecture should avoid dependencies that require paid infrastructure to demonstrate the core product.

---

# Why Supabase

Supabase provides a practical backend for a solo hackathon project:

```text
Next.js
   │
   ▼
Supabase
   ├── PostgreSQL
   ├── Authentication
   ├── Storage
   └── Row Level Security
```

This removes the need to build:

* a database server
* authentication infrastructure
* file storage infrastructure
* API infrastructure from scratch

---

# Project Structure

A possible implementation:

```text
fundflow/
│
├── app/
│   ├── dashboard/
│   ├── interview/
│   ├── records/
│   └── api/
│
├── components/
│   ├── VoiceInterface/
│   ├── InterviewPanel/
│   ├── EvidenceCard/
│   ├── VerdictBadge/
│   └── MonitoringTable/
│
├── backend/
│   ├── agents/
│   │   ├── interview_agent.py
│   │   └── extraction_agent.py
│   │
│   ├── rules/
│   │   ├── evaluator.py
│   │   └── validators.py
│   │
│   ├── services/
│   │   ├── stt.py
│   │   ├── tts.py
│   │   └── aggregation.py
│   │
│   └── models/
│       └── schemas.py
│
├── database/
│   ├── migrations/
│   └── seed/
│
├── scripts/
│   └── generate_demo_data.py
│
├── tests/
│
├── .env.example
├── README.md
└── package.json
```

---

# MVP

The minimum viable FundFlow demo should demonstrate one complete journey.

```text
Beneficiary
     ↓
Consent
     ↓
Voice conversation
     ↓
Transcript
     ↓
AI extraction
     ↓
Structured evidence
     ↓
Deterministic rules
     ↓
Criterion verdicts
     ↓
Database
     ↓
Monitoring dashboard
```

The MVP should prove that this works with **previously unseen input**.

---

# Demonstration Scenario

A judge interacts with FundFlow using a phone-sized interface.

### Step 1

FundFlow explains the purpose of the interview.

### Step 2

The participant gives consent.

### Step 3

The AI conducts a natural conversation.

### Step 4

The system converts the conversation into evidence.

### Step 5

The rules engine evaluates the evidence.

### Step 6

The reviewer sees:

```text
Interview #024

Age
24
MET

Weekly working hours
40
MET

Employment duration
32 weeks
MET

Freedom to leave
ESTABLISHED
Confidence: 91%

Equal treatment
UNCLEAR
Confidence: 38%

Follow-up required
YES
```

The important part is not the visual dashboard.

The important part is that every result can be traced back to evidence.

---

# Accessibility Strategy

FundFlow follows a layered access model:

| User capability                      | Interface            |
| ------------------------------------ | -------------------- |
| Smartphone + internet                | Voice/Web            |
| Feature phone                        | IVR                  |
| Feature phone + limited voice access | USSD                 |
| Low literacy                         | Voice-first          |
| Amharic speaker                      | Amharic voice        |
| English speaker                      | English voice        |
| Unclear answer                       | Flag for follow-up   |
| Refusal                              | Respect and continue |
| Underage respondent                  | Immediate stop       |

The goal is not to create one perfect interface.

The goal is to ensure the monitoring system can reach people through the interface they actually have.

---

# Design Principles

## 1. Evidence before inference

Only record what the respondent established.

## 2. Unknown is a valid state

```text
MET
NOT MET
UNCLEAR
```

There is no forced binary answer when evidence is insufficient.

## 3. AI listens; code decides

LLMs interpret language.

Deterministic code applies programme rules.

## 4. Human review remains possible

FundFlow identifies evidence and discrepancies.

It does not replace programme officers.

## 5. Accessibility is architectural

Voice, IVR, and USSD are not separate products.

They are interfaces to the same evidence system.

## 6. Consent is a first-class object

No consent means no interview.

## 7. Privacy is minimized

Collect only what the monitoring process actually needs.

---

# Future Extensions

FundFlow can eventually support:

* Afaan Oromo
* Tigrinya
* additional African languages
* offline field collection
* SMS fallback
* automated callback scheduling
* programme-specific rule configuration
* longitudinal beneficiary tracking
* anomaly detection
* employer-beneficiary comparison
* reviewer workflows
* multilingual reporting
* programme-level outcome forecasting

These are extensions of the same core architecture rather than separate products.

---

# Why FundFlow Matters

Traditional monitoring often asks:

> "What did the organisation report?"

FundFlow adds another question:

> **"What does the person the programme is supposed to help actually say?"**

That difference matters.

A monitoring system should not merely produce more data.

It should produce **defensible evidence**.

FundFlow is designed around that principle.

---

# Status

**Hackathon Prototype — In Development**

Current focus:

* [ ] Smartphone voice interview
* [ ] English conversation flow
* [ ] Amharic conversation flow
* [ ] Addis AI speech integration
* [ ] Evidence extraction
* [ ] Deterministic rules engine
* [ ] Supabase persistence
* [ ] Monitoring dashboard
* [ ] IVR prototype
* [ ] USSD prototype
* [ ] Contradiction detection
* [ ] Hard-case handling
* [ ] End-to-end live demonstration

---

# Core Philosophy

```text
                FUND FLOW

        Ask the people.
             Listen.
           Extract facts.
         Apply real rules.
        Show the evidence.
          Flag uncertainty.
          Never fabricate.

        No beneficiary
           left behind.
```

---

## Built for inclusive, evidence-based programme monitoring.

**FundFlow**
