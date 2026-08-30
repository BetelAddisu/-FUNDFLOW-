import { describe, it, expect, beforeEach } from 'vitest';
import { loadOfficialCriteria, getOfficialCriteria, resetCriteriaCache } from './config';
import { OfficialCriteriaSchema, BandSchema, CriterionSchema, ExclusionFactorSchema } from './schemas';

describe('Phase 1: Config loading and validation', () => {
  beforeEach(() => {
    resetCriteriaCache();
  });

  it('loads official-criteria.json successfully', () => {
    const criteria = loadOfficialCriteria();
    expect(criteria).toBeDefined();
    expect(criteria.version).toBe('official-v1-partial');
    expect(criteria.totalPoints).toBe(100);
  });

  it('validates against Zod schema', () => {
    const criteria = getOfficialCriteria();
    const result = OfficialCriteriaSchema.safeParse(criteria);
    expect(result.success).toBe(true);
  });

  it('has all 9 criteria (C1-C9)', () => {
    const criteria = getOfficialCriteria();
    expect(criteria.criteria).toHaveLength(9);
    const ids = criteria.criteria.map(c => c.id).sort();
    expect(ids).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9']);
  });

  it('C1 has subcriteria C1.1 and C1.2', () => {
    const criteria = getOfficialCriteria();
    const c1 = criteria.criteria.find(c => c.id === 'C1');
    expect(c1).toBeDefined();
    expect(c1!.subcriteria).toHaveLength(2);
    expect(c1!.subcriteria?.map(s => s.id)).toEqual(['C1.1', 'C1.2']);
  });

  it('C7 has two variants (C7a and C7b)', () => {
    const criteria = getOfficialCriteria();
    const c7 = criteria.criteria.find(c => c.id === 'C7');
    expect(c7).toBeDefined();
    expect(c7!.variants).toHaveLength(2);
    expect(c7!.variants?.map(v => v.id)).toEqual(['C7a', 'C7b']);
  });

  it('has 3 exclusion factors with E3 pending', () => {
    const criteria = getOfficialCriteria();
    expect(criteria.exclusionFactors).toHaveLength(3);
    const e3 = criteria.exclusionFactors.find(e => e.id === 'E3');
    expect(e3).toBeDefined();
    expect(e3!.status).toBe('pending');
    expect(e3!.name).toContain('PLACEHOLDER');
  });

  it('has 3 declarations all with placeholder text', () => {
    const criteria = getOfficialCriteria();
    expect(criteria.declarations).toHaveLength(3);
    criteria.declarations.forEach(d => {
      expect(d.text_en).toContain('PLACEHOLDER');
      expect(d.text_am).toBe('PLACEHOLDER');
      expect(d.text_om).toBe('PLACEHOLDER');
    });
  });

  it('caches the loaded criteria', () => {
    const first = loadOfficialCriteria();
    const second = loadOfficialCriteria();
    expect(first).toBe(second);
  });
});

describe('Phase 1: Schema validation', () => {
  it('BandSchema validates correct band structure', () => {
    const validBand = { label: '>50%', points: 5 };
    const result = BandSchema.safeParse(validBand);
    expect(result.success).toBe(true);
  });

  it('BandSchema rejects negative points', () => {
    const invalidBand = { label: 'test', points: -1 };
    const result = BandSchema.safeParse(invalidBand);
    expect(result.success).toBe(false);
  });

  it('CriterionSchema requires bands, subcriteria, or variants', () => {
    const invalidCriterion = { id: 'C99', name: 'Test', maxPoints: 10 };
    const result = CriterionSchema.safeParse(invalidCriterion);
    expect(result.success).toBe(false);
  });

  it('ExclusionFactorSchema validates status enum', () => {
    const valid = { id: 'E1', name: 'Test', status: 'confirmed' as const };
    const result = ExclusionFactorSchema.safeParse(valid);
    expect(result.success).toBe(true);

    const invalid = { id: 'E1', name: 'Test', status: 'unknown' };
    const result2 = ExclusionFactorSchema.safeParse(invalid);
    expect(result2.success).toBe(false);
  });
});