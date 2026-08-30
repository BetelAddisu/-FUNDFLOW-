import { ReasoningProvider, ReasoningResult, ReasoningProviderName } from '../types';

export class PrimaryReasoningProvider implements ReasoningProvider {
  name: ReasoningProviderName = 'primary';

  async complete(prompt: string): Promise<ReasoningResult> {
    const apiKey = process.env.REASONING_PRIMARY_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('REASONING_PRIMARY_API_KEY or GEMINI_API_KEY is not set');

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 4096,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`Primary reasoning (Gemini) failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Primary reasoning returned no text');

    return {
      text: text.trim(),
      provider: this.name,
      latencyMs: 0,
    };
  }
}