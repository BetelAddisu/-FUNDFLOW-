import { Evidence } from './schema';

export interface ExtractionAgent {
  extractFromText(text: string, currentEvidence: Partial<Evidence>): Promise<Partial<Evidence>>;
  extractFromImage(image: Buffer, fieldName?: string): Promise<Partial<Evidence>>;
}

export class MockExtractionAgent implements ExtractionAgent {
  async extractFromText(text: string, currentEvidence: Partial<Evidence>): Promise<Partial<Evidence>> {
    const updates: Partial<Evidence> = {};
    const lower = text.toLowerCase();

    if (lower.includes('acme')) {
      updates.company_profile = {
        company_name: {
          state: 'self_reported',
          value: 'Acme PLC',
          confidence: 0.9,
        },
        business_registration_number: { state: 'not_established' },
        address: { state: 'not_established' },
        mobile_number: { state: 'not_established' },
        business_organization_form: { state: 'not_established' },
        years_in_operation: { state: 'not_established' },
        business_type: { state: 'not_established' },
        ownership_percentage: {
          women_pct: { state: 'not_established' },
          men_pct: { state: 'not_established' },
        },
      };
    }

    return updates;
  }

  async extractFromImage(image: Buffer, fieldName?: string): Promise<Partial<Evidence>> {
    return {};
  }
}