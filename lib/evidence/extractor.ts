import { Evidence } from './schema';
import { getReasoningProvider } from '@/lib/ai/reasoning';

const EXTRACTION_PROMPT = `
You are an extraction agent for the FundFlow SME funding application system.
Extract structured evidence from the applicant's response and return ONLY valid JSON.

The evidence schema includes these top-level sections:
1. company_profile: company_name, business_registration_number, address, mobile_number, email, business_organization_form, years_in_operation, business_type, ownership_percentage (women_pct, men_pct)
2. company_overview: development_since_start, motivation_to_apply, business_goals, market_overview, main_products_services (array of {product_service, market_served, distribution_channels}), product_service_uniqueness, raw_material_sourcing_pct_local
3. growth_indicators: sales_etb, total_employees, female_employees, youth_employees_18_24 for years 2022, 2023, 2024, 2025_projection, 2026_projection
4. management: core_management_team (array of {name, position, gender}), organogram
5. intervention_requested: problem_to_be_addressed, requested_support_machinery (array of {equipment_description, quantity, estimated_total_price_etb, purpose}), requested_support_consultants (array of {problem_description, technical_expertise_requested}), expected_results, priority_areas (array), job_creation (explanation, positions_table array of {job_position, number_of_new_jobs}), social_environmental_impact_osh, occupational_safety_health_standards

For each field, determine the evidence state:
- "self_reported": applicant stated it
- "document_supported": applicant referenced a document
- "visually_observed": from photo analysis
- "verified": cross-checked
- "not_established": not mentioned
- "contradicted": conflicts with prior evidence

Return JSON with this structure:
{
  "evidence": { ...nested evidence structure... },
  "contradictions": ["field.path", ...]
}

Only include fields that have new information. Use "not_established" for fields not mentioned.
`.trim();

export class LLMExtractionAgent {
  private reasoning = getReasoningProvider();

  async extractFromText(text: string, currentEvidence: Partial<Evidence>): Promise<Partial<Evidence>> {
    const prompt = `${EXTRACTION_PROMPT}

Current evidence (for context, do not repeat unless correcting):
${JSON.stringify(currentEvidence, null, 2)}

Applicant's latest response:
"${text}"

Extract new information and return JSON.`;

    try {
      const result = await this.reasoning.complete(prompt);
      const parsed = this.parseResponse(result.text);
      return parsed.evidence || {};
    } catch (err) {
      console.error('LLM extraction failed:', err);
      return {};
    }
  }

  async extractFromImage(image: Buffer, fieldName?: string): Promise<Partial<Evidence>> {
    // TODO: Implement vision-based extraction when provider supports it
    return {};
  }

  private parseResponse(text: string): { evidence: Partial<Evidence>; contradictions: string[] } {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        evidence: parsed.evidence || {},
        contradictions: parsed.contradictions || [],
      };
    } catch (err) {
      console.error('Failed to parse extraction response:', err, text);
      return { evidence: {}, contradictions: [] };
    }
  }
}