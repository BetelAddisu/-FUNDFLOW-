import { describe, it, expect } from 'vitest';
import { OfficialCriteriaSchema } from '@/zod/official-criteria.schema';
import config from '@/config/official-criteria.json';

describe('config/official-criteria.json', () => {
  it('validates against the schema', () => {
    const result = OfficialCriteriaSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('has totalPoints equal to 100', () => {
    expect(config.totalPoints).toBe(100);
  });

  it('has all 9 criteria', () => {
    expect(config.criteria).toHaveLength(9);
  });

  it('has exactly 3 exclusion factors, with E3 pending', () => {
    expect(config.exclusionFactors).toHaveLength(3);
    const e3 = config.exclusionFactors.find((e) => e.id === 'E3');
    expect(e3?.status).toBe('pending');
  });

  it('has 3 declarations all with placeholder text', () => {
    expect(config.declarations).toHaveLength(3);
    for (const decl of config.declarations) {
      expect(decl.text_en).toContain('PLACEHOLDER');
    }
  });
});