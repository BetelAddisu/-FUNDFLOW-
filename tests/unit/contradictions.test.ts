import { describe, it, expect } from 'vitest';
import { findContradictions } from '@/lib/evidence/contradictions';
import { Evidence } from '@/lib/evidence/schema';
import { EvidenceField } from '@/lib/evidence/types';

function makeField(state: EvidenceField['state'], value: unknown): EvidenceField {
  return { state, value, confidence: state === 'not_established' ? 0 : 0.8 };
}

describe('Contradiction Engine', () => {
  it('flags license issue date vs years in operation mismatch', () => {
    const evidence: Partial<Evidence> = {
      company_profile: {
        license_issue_date: makeField('document_supported', '2020'),
        years_in_operation: makeField('self_reported', 10),
      } as any,
    };

    const contradictions = findContradictions(evidence);
    expect(contradictions).toHaveLength(1);
    expect(contradictions[0].field).toContain('years_in_operation');
  });

  it('does not flag when years in operation is consistent with license date', () => {
    const evidence: Partial<Evidence> = {
      company_profile: {
        license_issue_date: makeField('document_supported', '2020'),
        years_in_operation: makeField('self_reported', 4),
      } as any,
    };

    const contradictions = findContradictions(evidence);
    expect(contradictions).toHaveLength(0);
  });

  it('flags ownership percentages not summing to 100', () => {
    const evidence: Partial<Evidence> = {
      company_profile: {
        ownership_percentage: {
          women_pct: makeField('self_reported', 60),
          men_pct: makeField('self_reported', 50),
        },
      } as any,
    };

    const contradictions = findContradictions(evidence);
    expect(contradictions).toHaveLength(1);
    expect(contradictions[0].field).toContain('ownership_percentage');
  });

  it('does not flag when ownership percentages sum to 100', () => {
    const evidence: Partial<Evidence> = {
      company_profile: {
        ownership_percentage: {
          women_pct: makeField('self_reported', 60),
          men_pct: makeField('self_reported', 40),
        },
      } as any,
    };

    const contradictions = findContradictions(evidence);
    expect(contradictions).toHaveLength(0);
  });

  it('does not produce false positives on consistent restatement', () => {
    const evidence: Partial<Evidence> = {
      company_profile: {
        license_issue_date: makeField('document_supported', '2018'),
        years_in_operation: makeField('self_reported', 7),
        ownership_percentage: {
          women_pct: makeField('self_reported', 50),
          men_pct: makeField('self_reported', 50),
        },
      } as any,
    };

    const contradictions = findContradictions(evidence);
    expect(contradictions).toHaveLength(0);
  });
});