import { EvidenceRecord, EvidenceValue } from './types';
import { ApplicationFieldSchema, REQUIRED_FIELDS, GROWTH_INDICATOR_FIELDS } from './schema';
import { getReasoningProvider } from '../ai/reasoning';
import { v4 as uuidv4 } from 'uuid';

const reasoningProvider = getReasoningProvider();

export class EvidenceExtractor {
  private systemPrompt = `You are an evidence extraction agent for an Ethiopian SME funding application.
Your task is to extract structured field values from conversational text.
Return ONLY a JSON object mapping field IDs to extracted values.
If a field is not mentioned or unclear, omit it.
Handle all three languages: English, Amharic (አማርኛ), and Afaan Oromo (Afaan Oromoo).

Field definitions:
${REQUIRED_FIELDS.map(f => `- ${f}`).join('\n')}

Growth indicators (numeric values for years 2022-2026):
${GROWTH_INDICATOR_FIELDS.map(f => `- ${f}`).join('\n')}

Return format:
{
  "field_id": "extracted_value",
  "field_id_2": 123
}`;

  async extractFromText(text: string, currentEvidence: EvidenceRecord, language: 'en' | 'am' | 'om' = 'en'): Promise<Partial<EvidenceRecord>> {
    const unfilledFields = REQUIRED_FIELDS.filter(f => 
      !currentEvidence[f] || currentEvidence[f].value === undefined || currentEvidence[f].value === null || currentEvidence[f].value === ''
    );

    if (unfilledFields.length === 0) {
      return {};
    }

    const fieldDescriptions = unfilledFields.join('\n');

    try {
      const result = await reasoningProvider.complete(
        `User response (${language}): "${text}"\n\nExtract values for these fields:\n${fieldDescriptions}`,
        {
          systemPrompt: this.systemPrompt,
          temperature: 0.1,
          maxTokens: 2048,
        }
      );

      const parsed = JSON.parse(result.text);
      const updates: Partial<EvidenceRecord> = {};

      for (const [fieldKey, value] of Object.entries(parsed)) {
        if (value !== undefined && value !== null && value !== '') {
          updates[fieldKey] = {
            value,
            state: 'self_reported',
            confidence: 0.8,
            sourceTurnIds: [uuidv4()],
            updatedAt: new Date().toISOString(),
          };
        }
      }

      return updates;
    } catch (error) {
      console.error('Evidence extraction failed:', error);
      return {};
    }
  }

  async extractFromImage(imageBuffer: Buffer, fieldKey?: string): Promise<Partial<EvidenceRecord>> {
    // In a full implementation, this would use OCR/vision API
    // For now, return empty - photos are stored but not auto-extracted
    console.log(`Image extraction for ${fieldKey || 'unknown field'} - not implemented`);
    return {};
  }

  async extractGrowthIndicators(text: string, currentEvidence: EvidenceRecord, language: 'en' | 'am' | 'om' = 'en'): Promise<Partial<EvidenceRecord>> {
    const unfilledGrowthFields = GROWTH_INDICATOR_FIELDS.filter(f => 
      !currentEvidence[f] || currentEvidence[f].value === undefined || currentEvidence[f].value === null || currentEvidence[f].value === ''
    );

    if (unfilledGrowthFields.length === 0) {
      return {};
    }

    const systemPrompt = `Extract growth indicator numeric values from the user's response.
Return a JSON object with field IDs and numeric values.
Fields: ${unfilledGrowthFields.join(', ')}

User response (${language}): "${text}"

Return only the JSON object.`;

    try {
      const result = await reasoningProvider.complete(text, {
        systemPrompt,
        temperature: 0.1,
        maxTokens: 1024,
      });

      const parsed = JSON.parse(result.text);
      const updates: Partial<EvidenceRecord> = {};

      for (const [fieldKey, value] of Object.entries(parsed)) {
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
          updates[fieldKey] = {
            value: typeof value === 'string' ? Number(value) : value,
            state: 'self_reported',
            confidence: 0.8,
            sourceTurnIds: [uuidv4()],
            updatedAt: new Date().toISOString(),
          };
        }
      }

      return updates;
    } catch (error) {
      console.error('Growth indicator extraction failed:', error);
      return {};
    }
  }
}

// Create singleton instance
export const evidenceExtractor = new EvidenceExtractor();