export interface VoiceTranscriptionResult {
  text: string;
  provider: string;
  latencyMs: number;
  language?: string;
}

export interface VoiceSynthesisResult {
  audioBuffer: Buffer;
  provider: string;
  latencyMs: number;
}

export type VoiceProviderName = 'addis' | 'google' | 'whisper';

export interface VoiceProvider {
  name: VoiceProviderName;
  transcribe(audio: Buffer, language?: string): Promise<VoiceTranscriptionResult>;
  synthesize(text: string, language: string): Promise<VoiceSynthesisResult>;
}

export interface ReasoningResult {
  text: string;
  provider: string;
  latencyMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type ReasoningProviderName = 'primary' | 'openrouter' | 'groq' | 'primaryBackup';

export interface ReasoningProvider {
  name: ReasoningProviderName;
  complete(prompt: string, options?: { systemPrompt?: string; temperature?: number; maxTokens?: number }): Promise<ReasoningResult>;
}