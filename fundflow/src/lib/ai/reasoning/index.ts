import { ReasoningProvider, ReasoningResult } from '../types';
import { PrimaryReasoningProvider } from './primary';
import { OpenRouterReasoningProvider } from './openrouter';
import { GroqReasoningProvider } from './groq';
import { PrimaryBackupReasoningProvider } from './primaryBackup';

let reasoningProviders: ReasoningProvider[] = [
  new PrimaryReasoningProvider(),
  new OpenRouterReasoningProvider(),
  new GroqReasoningProvider(),
  new PrimaryBackupReasoningProvider(),
];

export function setReasoningProviders(providers: ReasoningProvider[]) {
  reasoningProviders = providers;
}

export async function completeWithFallback(prompt: string, options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }): Promise<ReasoningResult> {
  const start = Date.now();
  let lastError: Error | null = null;

  for (const provider of reasoningProviders) {
    try {
      console.log(`Trying reasoning provider: ${provider.name}`);
      const result = await provider.complete(prompt, options);
      result.latencyMs = Date.now() - start;
      console.log(`Reasoning succeeded with ${provider.name} in ${result.latencyMs}ms`);
      return result;
    } catch (err) {
      lastError = err as Error;
      console.warn(`Reasoning provider ${provider.name} failed:`, err);
    }
  }

  console.error('All reasoning providers failed');
  return {
    text: '',
    provider: 'unresolved',
    latencyMs: Date.now() - start,
  };
}

export function getReasoningProvider() {
  return {
    complete: completeWithFallback,
  };
}