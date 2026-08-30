import { ReasoningProvider, ReasoningResult, ReasoningProviderName } from '../types';

export class OpenRouterReasoningProvider implements ReasoningProvider {
  name: ReasoningProviderName = 'openrouter';
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OPENROUTER_API_KEY not set, OpenRouter provider will fail');
    }
  }

  async complete(prompt: string, options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }): Promise<ReasoningResult> {
    const start = Date.now();
    
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
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
        'HTTP-Referer': 'https://fundflow.app',
        'X-Title': 'FundFlow',
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter reasoning failed: ${response.status} - ${error}`);
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