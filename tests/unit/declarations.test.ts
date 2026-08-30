import { describe, it, expect, beforeEach } from 'vitest';
import { DeclarationManager } from '@/lib/declarations';
import config from '@/config/official-criteria.json';

describe('Declaration Manager', () => {
  let manager: DeclarationManager;

  beforeEach(() => {
    manager = new DeclarationManager();
  });

  it('uses placeholder declaration texts from config', () => {
    for (const decl of config.declarations) {
      expect(decl.text_en).toContain('PLACEHOLDER');
      expect(decl.text_am).toContain('PLACEHOLDER');
      expect(decl.text_om).toContain('PLACEHOLDER');
    }
  });

  it('system_ticked is false after construction and after explain/confirm', () => {
    const id = config.declarations[0].id;
    expect(manager.getStatus(id).systemTicked).toBe(false);

    manager.explain(id, 'en');
    expect(manager.getStatus(id).systemTicked).toBe(false);

    manager.confirmUnderstanding(id);
    expect(manager.getStatus(id).systemTicked).toBe(false);
  });

  it('confirmUnderstanding returns false if not explained, and does not set understandingConfirmed', () => {
    const id = config.declarations[0].id;
    const result = manager.confirmUnderstanding(id);
    expect(result).toBe(false);
    expect(manager.getStatus(id).understandingConfirmed).toBe(false);
  });

  it('explain delivers declaration text in the applicant language', () => {
    const id = config.declarations[0].id;
    const textEn = manager.getDeclarationText(id, 'en');
    const textAm = manager.getDeclarationText(id, 'am');
    const textOm = manager.getDeclarationText(id, 'om');
    expect(textEn).toBe(config.declarations[0].text_en);
    expect(textAm).toBe(config.declarations[0].text_am);
    expect(textOm).toBe(config.declarations[0].text_om);
    manager.explain(id, 'am');
    expect(manager.getStatus(id).explained).toBe(true);
    expect(manager.getStatus(id).explainedLanguage).toBe('am');
  });

  it('authorizedTick only sets system_ticked when understanding is confirmed', () => {
    const id = config.declarations[0].id;

    expect(manager.authorizedTick(id)).toBe(false);
    expect(manager.getStatus(id).systemTicked).toBe(false);

    manager.explain(id, 'en');
    expect(manager.authorizedTick(id)).toBe(false);
    expect(manager.getStatus(id).systemTicked).toBe(false);

    manager.confirmUnderstanding(id);
    expect(manager.authorizedTick(id)).toBe(true);
    expect(manager.getStatus(id).systemTicked).toBe(true);
  });

  it('system_ticked remains false for other declarations unless individually authorized', () => {
    const id1 = config.declarations[0].id;
    const id2 = config.declarations[1].id;

    manager.explain(id1, 'en');
    manager.confirmUnderstanding(id1);
    manager.authorizedTick(id1);

    expect(manager.getStatus(id1).systemTicked).toBe(true);
    expect(manager.getStatus(id2).systemTicked).toBe(false);
  });
});