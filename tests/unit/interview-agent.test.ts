import { describe, it, expect, beforeEach } from 'vitest';
import { InterviewAgent } from '@/lib/interview/agent';
import { InterviewState, ExtractionService, Language } from '@/lib/interview/types';

class MockExtractionService implements ExtractionService {
  async extract(text: string, state: InterviewState): Promise<{ updates: Record<string, any>; contradictions: string[] }> {
    const updates: Record<string, any> = {};
    const contradictions: string[] = [];

    const lower = text.toLowerCase();

    if (lower.includes('acme')) updates['company_profile.company_name'] = 'Acme PLC';
    if (lower.includes('textile')) updates['company_profile.business_type'] = 'Textile';
    if (lower.includes('5 years')) updates['company_profile.years_in_operation'] = 5;
    if (lower.includes('sales')) {
      updates['growth_indicators.sales_etb.2024'] = 120;
      contradictions.push('growth_indicators');
    }
    if (lower.includes('women')) updates['company_profile.ownership_percentage.women_pct'] = 60;

    return { updates, contradictions };
  }
}

describe('InterviewAgent', () => {
  let agent: InterviewAgent;
  let extraction: MockExtractionService;

  beforeEach(() => {
    extraction = new MockExtractionService();
    agent = new InterviewAgent(extraction);
  });

  it('does not re-ask an already established fact', async () => {
    const startResponse = await agent.start('session1', 'en');
    expect(startResponse.text).toContain('name of your company');

    const afterName = await agent.handleUserInput('Acme', startResponse.state);
    expect(afterName.state.evidence['company_profile.company_name']).toBe('Acme PLC');
    expect(afterName.text).toContain('type of business');
  });

  it('asks a targeted follow-up when growth indicators are inconsistent', async () => {
    const startResponse = await agent.start('session2', 'en');
    let state = startResponse.state;
    state = (await agent.handleUserInput('Acme', state)).state;
    state = (await agent.handleUserInput('textile', state)).state;

    const resp = await agent.handleUserInput('sales', state);
    expect(resp.state.contradictions).toContain('growth_indicators');
    expect(resp.text).toContain('inconsistent');
  });

  it('follows language switch mid-session without restarting', async () => {
    const startResponse = await agent.start('session3', 'en');
    expect(startResponse.text).toContain('name of your company');

    const state = startResponse.state;
    state.language = 'am';
    const resp = await agent.handleUserInput('Acme', state);
    expect(resp.text).toContain('ምን ዓይነት ንግድ');
  });
});