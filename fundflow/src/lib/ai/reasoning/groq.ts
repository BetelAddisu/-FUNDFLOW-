import { ReasoningProvider, ReasoningResult, ReasoningProviderName } from '../types';

export class GroqReasoningProvider implements ReasoningProvider {
  name: ReasoningProviderName = 'groq';
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    if (!this.apiKey) {
      console.warn('GROQ_API_KEY not set, Groq provider will fail');
    }
  }

  async complete(prompt: string, options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }): Promise<ReasoningResult> {
    const start = Date.now();
    
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }

    const messages = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq reasoning failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    return {
      text,
      provider: this.name,
      latencyMs: Date.now() - start,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    };
  }
}