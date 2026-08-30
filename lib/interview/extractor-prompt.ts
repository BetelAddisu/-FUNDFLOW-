import { FlatEvidence } from '@/lib/evidence/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Format flat evidence as a readable summary for the LLM.
 * Shows what is already known so the LLM doesn't re-extract it.
 */
function formatKnownEvidence(flatEvidence: FlatEvidence): string {
  const entries = Object.entries(flatEvidence);
  if (entries.length === 0) return '(nothing established yet)';

  return entries
    .map(([key, item]) => {
      const approx = item.isApproximate ? ' (approximate)' : '';
      return `- ${key}: ${JSON.stringify(item.value)}${approx} [${item.state}, confidence: ${item.confidence.toFixed(2)}]`;
    })
    .join('\n');
}

/**
 * Format recent conversation history (last N messages).
 */
function formatHistory(messages: Message[], maxTurns = 6): string {
  const recent = messages.slice(-maxTurns);
  if (recent.length === 0) return '(start of conversation)';
  return recent.map((m) => `${m.role === 'user' ? 'APPLICANT' : 'ASSISTANT'}: ${m.content}`).join('\n');
}

/**
 * Build the structured extraction prompt for the LLM.
 *
 * The LLM must:
 * 1. Extract explicitly stated facts (self_reported)
 * 2. INFER derived facts from what was stated (e.g. female_pct from counts, years from founding date)
 * 3. Mark inferred facts clearly with lower confidence
 * 4. Never fabricate
 * 5. Never decide eligibility or score
 */
export function buildExtractionPrompt(
  flatEvidence: FlatEvidence,
  history: Message[],
  userMessage: string,
  language: string
): string {
  return `You are an evidence extraction agent for FundFlow, an AI-assisted funding intake system for Ethiopian SMEs (Small and Medium Enterprises).

YOUR ROLE:
Extract and INFER structured evidence from the applicant's message. You are filling in an official funding application form on behalf of the applicant — they should not need to know the exact field names.

EXTRACTION RULES:
1. Extract facts that are EXPLICITLY stated → state: "self_reported", confidence: 0.85-0.98
2. INFER derived facts from what was stated → state: "self_reported", confidence: 0.65-0.85, add a note explaining the inference
   Examples of valid inferences:
   - "I have 8 employees, 6 are women" → female_employees_pct = 75% (6/8)
   - "We started in 2018" → years_in_operation ≈ 8 (2026-2018), isApproximate: true
   - "My wife and I own the business equally" → ownership_percentage.women_pct = 50
   - "We sell to Kenya and Djibouti" → market_served = "international"
   - "All our materials come from local suppliers" → raw_material_sourcing_pct_local ≈ 95, isApproximate: true
   - "We have 10 workers total, 3 are youth" → youth_employee_pct = 30 (3/10)
3. Mark approximate/estimated values with isApproximate: true (e.g. "maybe around 5 million", "roughly 60%")
4. NEVER fabricate facts not supported by the input
5. NEVER decide eligibility, exclusions, or scores — only extract evidence

LANGUAGE CONTEXT: The applicant's language is "${language}". The current message may be in Amharic, Afaan Oromo, or English.

CURRENT KNOWN INFORMATION (do NOT re-extract these unless the applicant contradicts or clarifies them):
${formatKnownEvidence(flatEvidence)}

RECENT CONVERSATION:
${formatHistory(history)}

NEW APPLICANT MESSAGE:
"${userMessage}"

FIELDS YOU CAN EXTRACT (use exact dot-path keys):
Company Profile:
  company_profile.company_name (string)
  company_profile.business_registration_number (string)
  company_profile.years_in_operation (number, years)
  company_profile.business_type (string, sector/industry)
  company_profile.business_organization_form (string: "Sole Proprietorship" | "Private Limited Company" | "Share Company" | "Other")
  company_profile.address (string)
  company_profile.mobile_number (string, with +251 format preferred)
  company_profile.email (string)
  company_profile.ownership_percentage.women_pct (number 0-100)
  company_profile.ownership_percentage.men_pct (number 0-100, INFER as 100 - women_pct if only one is stated)

Growth Indicators (years: 2022, 2023, 2024, 2025_projection, 2026_projection):
  growth_indicators.sales_etb.{year} (number, Ethiopian Birr)
  growth_indicators.total_employees.{year} (number)
  growth_indicators.female_employees.{year} (number)
  growth_indicators.female_employees_pct.{year} (number 0-100, INFER from female/total if both known)
  growth_indicators.youth_employees_18_24.{year} (number, age 18-24)
  growth_indicators.youth_employees_pct.{year} (number 0-100, INFER from youth/total if both known)

Company Overview:
  company_overview.development_since_start (string, narrative)
  company_overview.motivation_to_apply (string, narrative)
  company_overview.business_goals (string)
  company_overview.market_overview (string)
  company_overview.product_service_uniqueness (string)
  company_overview.raw_material_sourcing_pct_local (number 0-100)
  company_overview.market_served (string: "international" | "import_substituting" | "local_only")

Intervention Requested:
  intervention_requested.problem_to_be_addressed (string)
  intervention_requested.expected_results (string)
  intervention_requested.job_creation.explanation (string)
  intervention_requested.job_creation.number_of_new_jobs (number)
  intervention_requested.social_environmental_impact_osh (string)
  intervention_requested.occupational_safety_health_standards (string)

Management:
  management.core_management_team_size (number)
  management.has_women_in_management (boolean)

Photos / Documents (set these when the applicant mentions/uploads them):
  documents.business_license_uploaded (boolean)
  documents.workshop_photo_uploaded (boolean)

RESPOND WITH ONLY THIS JSON (no markdown, no explanation outside JSON):
{
  "updates": {
    "field.path.here": {
      "value": <extracted value — string, number, or boolean>,
      "state": "self_reported",
      "confidence": 0.0-1.0,
      "isApproximate": false,
      "notes": "optional: explain inference if this was derived rather than directly stated"
    }
  },
  "language_detected": "en" | "am" | "om",
  "summary": "one sentence: what new information was extracted or inferred"
}

If nothing new can be extracted, return: {"updates": {}, "language_detected": "${language}", "summary": "No new extractable information in this message."}`;
}

/**
 * Build the adaptive question generation prompt.
 * The LLM generates a natural, contextual follow-up question targeting the highest-priority gap.
 */
export function buildQuestionPrompt(
  flatEvidence: FlatEvidence,
  gaps: Array<{ field: string; message: string; priority: number }>,
  history: Message[],
  language: string
): string {
  const topGaps = gaps.slice(0, 5).map((g) => `- ${g.field}: ${g.message}`).join('\n');
  const knownHighlights = Object.entries(flatEvidence)
    .slice(0, 10)
    .map(([k, v]) => `${k}: ${JSON.stringify(v.value)}`)
    .join(', ');

  const languageInstruction: Record<string, string> = {
    en: 'Respond in English.',
    am: 'አማርኛ ቋንቋን ተጠቀም። (Respond in Amharic.)',
    om: 'Afaan Oromoon deebii kenni. (Respond in Afaan Oromo.)',
  };

  return `You are a warm, intelligent funding intake assistant helping an Ethiopian small business owner apply for the SME Support Scheme.

YOUR ROLE: Generate ONE natural follow-up question to ask the applicant next.

RULES:
- Ask exactly ONE question
- Be warm, conversational — not bureaucratic or form-like
- Reference information already known to make the question specific and natural
- If we know their company name, use it
- Accept approximate answers gracefully
- Do NOT ask about something already established
- ${languageInstruction[language] || languageInstruction.en}

ALREADY ESTABLISHED (do not re-ask these):
${knownHighlights || '(nothing yet)'}

TOP PRIORITY MISSING INFORMATION (ask about the FIRST one):
${topGaps || '(all key fields are established — ask for business licence photo upload or final confirmation)'}

RECENT CONVERSATION (last 4 messages):
${formatHistory(history, 4)}

Generate ONLY the next question to ask — no preamble, no explanation, just the question.`;
}
