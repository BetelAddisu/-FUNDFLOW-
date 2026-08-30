import { VoiceProvider, VoiceTranscriptionResult, VoiceSynthesisResult, VoiceProviderName } from '../types';

export class AddisVoiceProvider implements VoiceProvider {
  name: VoiceProviderName = 'addis';
  private apiKey: string;
  private baseUrl = 'https://api.addis.ai/v1';

  constructor() {
    this.apiKey = process.env.ADDIS_AI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('ADDIS_AI_API_KEY not set, Addis AI provider will fail');
    }
  }

  async transcribe(audio: Buffer, language?: string): Promise<VoiceTranscriptionResult> {
    const start = Date.now();
    
    if (!this.apiKey) {
      throw new Error('Addis AI API key not configured');
    }

    const formData = new FormData();
    const blob = new Blob([audio], { type: 'audio/mpeg' });
    formData.append('file', blob, 'audio.mp3');
    formData.append('model', 'asr-v1');
    if (language) {
      formData.append('language', language);
    }

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Addis AI transcription failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    return {
      text: data.text || data.transcript || '',
      provider: this.name,
      latencyMs: Date.now() - start,
      language: data.language,
    };
  }

  async synthesize(text: string, language: string): Promise<VoiceSynthesisResult> {
    const start = Date.now();
    
    if (!this.apiKey) {
      throw new Error('Addis AI API key not configured');
    }

    const voiceMap: Record<string, string> = {
      'en': 'en-US-Standard-A',
      'am': 'am-ET-Standard-A',
      'om': 'om-ET-Standard-A',
    };

    const response = await fetch(`${this.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-v1',
        input: text,
        voice: voiceMap[language] || voiceMap['en'],
        language: language,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Addis AI synthesis failed: ${response.status} - ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    return {
      audioBuffer: Buffer.from(arrayBuffer),
      provider: this.name,
      latencyMs: Date.now() - start,
    };
  }
}