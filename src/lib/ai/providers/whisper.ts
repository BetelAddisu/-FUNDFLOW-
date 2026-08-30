import { VoiceProvider, VoiceTranscriptionResult, VoiceSynthesisResult, VoiceProviderName } from '../types';

export class WhisperVoiceProvider implements VoiceProvider {
  name: VoiceProviderName = 'whisper';
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OPENAI_API_KEY not set, Whisper provider will fail');
    }
  }

  async transcribe(audio: Buffer, language?: string): Promise<VoiceTranscriptionResult> {
    const start = Date.now();
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const formData = new FormData();
    const blob = new Blob([audio], { type: 'audio/mpeg' });
    formData.append('file', blob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    if (language) {
      const langMap: Record<string, string> = {
        'en': 'en',
        'am': 'am',
        'om': 'om',
      };
      formData.append('language', langMap[language] || 'en');
    }
    formData.append('response_format', 'verbose_json');

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper transcription failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    return {
      text: data.text || '',
      provider: this.name,
      latencyMs: Date.now() - start,
      language: data.language,
    };
  }

  async synthesize(text: string, language: string): Promise<VoiceSynthesisResult> {
    const start = Date.now();
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const voiceMap: Record<string, string> = {
      'en': 'nova',
      'am': 'nova',
      'om': 'nova',
    };

    const response = await fetch(`${this.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voiceMap[language] || 'nova',
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI TTS synthesis failed: ${response.status} - ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    return {
      audioBuffer: Buffer.from(arrayBuffer),
      provider: this.name,
      latencyMs: Date.now() - start,
    };
  }
}