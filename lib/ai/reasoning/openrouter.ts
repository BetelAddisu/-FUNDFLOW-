import { ReasoningProvider, ReasoningResult, ReasoningProviderName } from '../types';

export class OpenRouterReasoningProvider implements ReasoningProvider {
  name: ReasoningProviderName = 'openrouter';

  async complete(prompt: string): Promise<ReasoningResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://fundflow.app',
        'X-Title': 'FundFlow',
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for business application processing.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter reasoning failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenRouter returned no text');

    return {
      text: text.trim(),
      provider: this.name,
      latencyMs: 0,
    };
  }
}