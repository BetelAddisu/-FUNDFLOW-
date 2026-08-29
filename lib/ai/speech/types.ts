/**
 * Speech-to-text provider contract. Every result records the provider.
 * After provider failure the status is `unresolved` — a fabricated
 * transcript is never returned.
 */

export type TranscriptLanguage = "en" | "am" | "om" | "unknown";

export interface AudioInput {
  /** local path, URL, or base64 data URL */
  data: string | Buffer;
  mimeType?: string;
  durationSeconds?: number;
}

export interface TranscriptResult {
  status: "ok" | "unresolved";
  text?: string;
  language?: TranscriptLanguage;
  provider: string;
  confidence?: number;
  durationSeconds?: number;
  error?: string;
}

export interface SpeechToTextProvider {
  name: string;
  transcribe(input: AudioInput): Promise<TranscriptResult>;
}

export interface TextToSpeechProvider {
  name: string;
  synthesize(text: string, language: string): Promise<{ audio: string; mimeType: string }>;
}