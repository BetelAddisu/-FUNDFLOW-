import { EvidenceRecord } from './types';
import { SDGSuggestion } from './types';
import { sdgs, findRelevantSDGs } from '../knowledge/sdgs';
import { getReasoningProvider } from '../ai/reasoning';

const reasoningProvider = getReasoningProvider();

export async function generateSDGSuggestions(evidence: EvidenceRecord): Promise<SDGSuggestion[]> {
  const businessType = evidence['business_type']?.value || '';
  const productService = evidence['product_service_1']?.value || '';
  const marketServed = evidence['market_served_1']?.value || '';
  const impactText = evidence['social_env_impact_osh']?.value || '';
  const rawMaterialSourcing = evidence['raw_material_sourcing_pct']?.value || '';
  const uniqueness = evidence['product_service_uniqueness']?.value || '';

  // Use keyword-based matching first
  const matchedSDGs = findRelevantSDGs(businessType, [productService, marketServed, uniqueness], impactText, rawMaterialSourcing);

  // Enhance with LLM reasoning for better explanations
  const suggestions: SDGSuggestion[] = [];

  for (const sdg of matchedSDGs) {
    let reason = `The business operates in a sector related to "${sdg.title}" (business type: ${businessType}).`;

    // Try to get more specific reason from LLM
    try {
      const systemPrompt = `You are an SDG alignment expert. Given the business information, explain in one sentence why this business might align with SDG ${sdg.id}: ${sdg.title}. 
Business type: ${businessType}
Product/Service: ${productService}
Market: ${marketServed}
Impact: ${impactText}
Raw material sourcing: ${rawMaterialSourcing}

Return only the reason sentence, starting with "This business aligns with SDG ${sdg.id} because..."`;

      const result = await reasoningProvider.complete('', {
        systemPrompt,
        temperature: 0.3,
        maxTokens: 200,
      });

      if (result.text && result.text.length > 20) {
        reason = result.text;
      }
    } catch (error) {
      console.warn(`LLM SDG reason generation failed for SDG ${sdg.id}:`, error);
    }

    suggestions.push({
      sdgId: sdg.id,
      title: sdg.title,
      reason,
      evidenceSource: 'business_type, product_service_1, social_env_impact_osh, raw_material_sourcing_pct',
      alignmentStatus: 'potential_alignment',
    });
  }

  // Limit to top 5 most relevant
  return suggestions.slice(0, 5);
}

export async function generateImpactProtocolDraft(evidence: EvidenceRecord, sdgSuggestions: SDGSuggestion[]): Promise<string> {
  const businessName = evidence['company_name']?.value || 'the applicant';
  const businessType = evidence['business_type']?.value || 'the business sector';
  const expectedResults = evidence['expected_results']?.value || '';
  const jobCreation = evidence['job_creation_explanation']?.value || '';

  const systemPrompt = `Generate a plain-language Impact Protocol draft for an Ethiopian SME funding application.
  
Business: ${businessName}
Sector: ${businessType}
Expected Results: ${expectedResults}
Job Creation: ${jobCreation}
Potential SDG Alignments: ${sdgSuggestions.map(s => `${s.sdgId}: ${s.title} - ${s.reason}`).join('; ')}

Write in clear, simple language suitable for a business owner. Structure as:
1. Business Impact Summary
2. Potential SDG Contributions (list each with plain explanation)
3. Job Creation Impact
4. Environmental/Social Considerations

Label all SDG suggestions as "Potential Alignment" not "Verified Impact".
Keep under 500 words.`;

  try {
    const result = await reasoningProvider.complete('', {
      systemPrompt,
      temperature: 0.4,
      maxTokens: 1000,
    });

    return result.text;
  } catch (error) {
    console.error('Impact protocol generation failed:', error);
    return generateFallbackImpactProtocol(evidence, sdgSuggestions);
  }
}

function generateFallbackImpactProtocol(evidence: EvidenceRecord, sdgSuggestions: SDGSuggestion[]): string {
  const businessName = evidence['company_name']?.value || 'the applicant';
  const businessType = evidence['business_type']?.value || 'the business sector';
  
  return `Impact Protocol Draft for ${businessName}

1. Business Impact Summary
${businessName} operates in ${businessType}. The intervention is expected to strengthen operations and create employment opportunities.

2. Potential SDG Contributions
${sdgSuggestions.map(s => `- SDG ${s.sdgId} (${s.title}): Potential Alignment - ${s.reason}`).join('\n')}

3. Job Creation Impact
${evidence['job_creation_explanation']?.value || 'Job creation details to be provided.'}

4. Environmental/Social Considerations
${evidence['social_env_impact_osh']?.value || 'Impact assessment pending.'}

Note: All SDG alignments are labeled as "Potential Alignment" and require verification during the due diligence phase.`;
}