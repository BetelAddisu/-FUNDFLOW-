import { ReasoningProvider, ReasoningResult, ReasoningProviderName } from '../types';

export class PrimaryBackupReasoningProvider implements ReasoningProvider {
  name: ReasoningProviderName = 'primaryBackup';
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor() {
    this.apiKey = process.env.REASONING_PRIMARY_BACKUP_API_KEY || '';
    if (!this.apiKey) {
      console.warn('REASONING_PRIMARY_BACKUP_API_KEY not set, Primary Backup provider will fail');
    }
  }

  async complete(prompt: string, options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }): Promise<ReasoningResult> {
    const start = Date.now();
    
    if (!this.apiKey) {
      throw new Error('Primary backup reasoning API key not configured');
    }

    const contents = [];
    if (options?.systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: options.systemPrompt }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options?.temperature ?? 0.3,
          maxOutputTokens: options?.maxTokens ?? 4096,
          topP: 0.95,
          topK: 40,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Primary Backup (Gemini) reasoning failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return {
      text,
      provider: this.name,
      latencyMs: Date.now() - start,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0,
      } : undefined,
    };
  }
}