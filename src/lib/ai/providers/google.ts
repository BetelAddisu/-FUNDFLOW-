import { VoiceProvider, VoiceTranscriptionResult, VoiceSynthesisResult, VoiceProviderName } from '../types';

export class GoogleVoiceProvider implements VoiceProvider {
  name: VoiceProviderName = 'google';
  private apiKey: string;
  private baseUrl = 'https://speech.googleapis.com/v1';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY not set, Google Speech provider will fail');
    }
  }

  async transcribe(audio: Buffer, language?: string): Promise<VoiceTranscriptionResult> {
    const start = Date.now();
    
    if (!this.apiKey) {
      throw new Error('Google/Gemini API key not configured');
    }

    // Convert audio to base64 for Google Speech API
    const audioBase64 = audio.toString('base64');
    
    const languageCodeMap: Record<string, string> = {
      'en': 'en-US',
      'am': 'am-ET',
      'om': 'om-ET',
    };

    const response = await fetch(`${this.baseUrl}/speech:recognize?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          encoding: 'MP3',
          sampleRateHertz: 16000,
          languageCode: languageCodeMap[language || 'en'] || 'en-US',
          alternativeLanguageCodes: ['am-ET', 'om-ET', 'en-US'],
          enableAutomaticPunctuation: true,
        },
        audio: {
          content: audioBase64,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Speech transcription failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const transcript = data.results
      ?.map((r: any) => r.alternatives?.[0]?.transcript)
      ?.filter(Boolean)
      ?.join(' ') || '';

    return {
      text: transcript,
      provider: this.name,
      latencyMs: Date.now() - start,
      language: data.results?.[0]?.languageCode,
    };
  }

  async synthesize(text: string, language: string): Promise<VoiceSynthesisResult> {
    const start = Date.now();
    
    if (!this.apiKey) {
      throw new Error('Google/Gemini API key not configured');
    }

    const voiceMap: Record<string, { languageCode: string; name: string }> = {
      'en': { languageCode: 'en-US', name: 'en-US-Standard-A' },
      'am': { languageCode: 'am-ET', name: 'am-ET-Standard-A' },
      'om': { languageCode: 'om-ET', name: 'om-ET-Standard-A' },
    };

    const voice = voiceMap[language] || voiceMap['en'];

    const response = await fetch(`${this.baseUrl}/text:synthesize?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: voice.languageCode,
          name: voice.name,
          ssmlGender: 'NEUTRAL',
        },
        audioConfig: {
          audioEncoding: 'MP3',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Speech synthesis failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const audioBuffer = Buffer.from(data.audioContent, 'base64');
    
    return {
      audioBuffer,
      provider: this.name,
      latencyMs: Date.now() - start,
    };
  }
}