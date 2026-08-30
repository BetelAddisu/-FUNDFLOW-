import { describe, it, expect } from 'vitest';
import { generateSDGSuggestions } from '@/lib/evidence/impact-protocol';
import { generateApplicationPack } from '@/lib/evidence/application-pack';
import { Evidence } from '@/lib/evidence/schema';

function makeField(state: string, value: any) {
  return { state, value, confidence: state === 'not_established' ? 0 : 0.8 };
}

describe('SDG Knowledge Base and ImpactProtocol', () => {
  it('labels all suggestions as potential_alignment', () => {
    const evidence: Partial<Evidence> = {
      company_profile: {
        business_type: makeField('self_reported', 'Solar energy'),
      } as any,
    };
    const suggestions = generateSDGSuggestions(evidence);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(s.alignmentStatus).toBe('potential_alignment');
    }
  });

  it('each suggestion cites an evidence source', () => {
    const evidence: Partial<Evidence> = {
      company_profile: {
        business_type: makeField('self_reported', 'Agriculture'),
      } as any,
    };
    const suggestions = generateSDGSuggestions(evidence);
    for (const s of suggestions) {
      expect(s.evidenceSource).toBeTruthy();
      expect(s.evidenceSource).not.toBe('');
    }
  });

  it('does not generate suggestions for unconfirmed facts (missing evidence)', () => {
    const evidence: Partial<Evidence> = {
      company_profile: {
        business_type: makeField('not_established', undefined),
      } as any,
    };
    const suggestions = generateSDGSuggestions(evidence);
    expect(suggestions).toHaveLength(0);
  });

  it('application pack uses only evidence, not raw transcript', () => {
    const evidence: Partial<Evidence> = {
      company_profile: {
        company_name: makeField('self_reported', 'ACME'),
        business_type: makeField('self_reported', 'Textile'),
      } as any,
    };
    const pack = generateApplicationPack(evidence);
    expect(JSON.stringify(pack)).not.toContain('green practices');
    expect(pack.sdgSuggestions.some((s) => s.sdgId === 13)).toBe(false);
  });
});