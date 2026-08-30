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

export async function completeWithFallback(prompt: string): Promise<ReasoningResult> {
  const start = Date.now();
  for (const provider of reasoningProviders) {
    try {
      const result = await provider.complete(prompt);
      result.latencyMs = Date.now() - start;
      result.provider = provider.name;
      return result;
    } catch (err) {
      console.warn(`Reasoning provider ${provider.name} failed:`, err);
    }
  }
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