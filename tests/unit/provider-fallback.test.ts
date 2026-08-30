import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setVoiceProviders, getVoiceProvider } from '@/lib/ai/providers';
import { setReasoningProviders, getReasoningProvider } from '@/lib/ai/providers/reasoning';
import { VoiceProvider, VoiceTranscriptionResult, ReasoningProvider, ReasoningResult } from '@/lib/ai/types';

class MockVoiceProvider implements VoiceProvider {
  name: any;
  shouldFail: boolean;
  constructor(name: any, shouldFail: boolean) {
    this.name = name;
    this.shouldFail = shouldFail;
  }
  async transcribe(audio: Buffer, language?: string): Promise<VoiceTranscriptionResult> {
    if (this.shouldFail) throw new Error('Mock failure');
    return { text: `transcribed by ${this.name}`, provider: this.name, latencyMs: 10 };
  }
}

class MockReasoningProvider implements ReasoningProvider {
  name: any;
  shouldFail: boolean;
  constructor(name: any, shouldFail: boolean) {
    this.name = name;
    this.shouldFail = shouldFail;
  }
  async complete(prompt: string): Promise<ReasoningResult> {
    if (this.shouldFail) throw new Error('Mock failure');
    return { text: `completed by ${this.name}`, provider: this.name, latencyMs: 10 };
  }
}

describe('Provider fallback', () => {
  describe('Voice', () => {
    it('falls back to next provider when first fails', async () => {
      setVoiceProviders([
        new MockVoiceProvider('addis', true),
        new MockVoiceProvider('google', false),
      ]);
      const { transcribe } = getVoiceProvider();
      const result = await transcribe(Buffer.from('audio'));
      expect(result.provider).toBe('google');
      expect(result.text).toBe('transcribed by google');
    });

    it('returns unresolved when all providers fail', async () => {
      setVoiceProviders([
        new MockVoiceProvider('addis', true),
        new MockVoiceProvider('google', true),
        new MockVoiceProvider('whisper', true),
      ]);
      const { transcribe } = getVoiceProvider();
      const result = await transcribe(Buffer.from('audio'));
      expect(result.provider).toBe('unresolved');
      expect(result.text).toBe('');
    });
  });

  describe('Reasoning', () => {
    it('falls back to next provider when first fails', async () => {
      setReasoningProviders([
        new MockReasoningProvider('primary', true),
        new MockReasoningProvider('groq', false),
      ]);
      const { complete } = getReasoningProvider();
      const result = await complete('prompt');
      expect(result.provider).toBe('groq');
      expect(result.text).toBe('completed by groq');
    });

    it('returns unresolved when all providers fail', async () => {
      setReasoningProviders([
        new MockReasoningProvider('primary', true),
        new MockReasoningProvider('groq', true),
        new MockReasoningProvider('openrouter', true),
        new MockReasoningProvider('primaryBackup', true),
      ]);
      const { complete } = getReasoningProvider();
      const result = await complete('prompt');
      expect(result.provider).toBe('unresolved');
      expect(result.text).toBe('');
    });
  });
});