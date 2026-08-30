import { ReasoningProvider, ReasoningResult, ReasoningProviderName } from '../types';

export class GroqReasoningProvider implements ReasoningProvider {
  name: ReasoningProviderName = 'groq';

  async complete(prompt: string): Promise<ReasoningResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for business application processing.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq reasoning failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq returned no text');

    return {
      text: text.trim(),
      provider: this.name,
      latencyMs: 0,
    };
  }
}