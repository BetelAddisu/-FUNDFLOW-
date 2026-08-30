import { VoiceProvider, VoiceTranscriptionResult, VoiceSynthesisResult } from '../types';
import { AddisVoiceProvider } from './addis';
import { GoogleVoiceProvider } from './google';
import { WhisperVoiceProvider } from './whisper';

let voiceProviders: VoiceProvider[] = [
  new AddisVoiceProvider(),
  new GoogleVoiceProvider(),
  new WhisperVoiceProvider(),
];

export function setVoiceProviders(providers: VoiceProvider[]) {
  voiceProviders = providers;
}

export async function transcribeWithFallback(audio: Buffer, language?: string): Promise<VoiceTranscriptionResult> {
  const start = Date.now();
  let lastError: Error | null = null;

  for (const provider of voiceProviders) {
    try {
      console.log(`Trying voice provider: ${provider.name}`);
      const result = await provider.transcribe(audio, language);
      result.latencyMs = Date.now() - start;
      console.log(`Voice transcription succeeded with ${provider.name} in ${result.latencyMs}ms`);
      return result;
    } catch (err) {
      lastError = err as Error;
      console.warn(`Voice provider ${provider.name} failed:`, err);
    }
  }

  console.error('All voice providers failed');
  return {
    text: '',
    provider: 'unresolved',
    latencyMs: Date.now() - start,
    language,
  };
}

export async function synthesizeWithFallback(text: string, language: string): Promise<VoiceSynthesisResult> {
  const start = Date.now();
  let lastError: Error | null = null;

  for (const provider of voiceProviders) {
    try {
      console.log(`Trying TTS provider: ${provider.name}`);
      const result = await provider.synthesize(text, language);
      result.latencyMs = Date.now() - start;
      console.log(`TTS synthesis succeeded with ${provider.name} in ${result.latencyMs}ms`);
      return result;
    } catch (err) {
      lastError = err as Error;
      console.warn(`TTS provider ${provider.name} failed:`, err);
    }
  }

  console.error('All TTS providers failed');
  return {
    audioBuffer: Buffer.from(''),
    provider: 'unresolved',
    latencyMs: Date.now() - start,
  };
}

export function getVoiceProvider() {
  return {
    transcribe: transcribeWithFallback,
    synthesize: synthesizeWithFallback,
  };
}