import { VoiceProvider, VoiceTranscriptionResult, VoiceProviderName } from '../types';

export class AddisVoiceProvider implements VoiceProvider {
  name: VoiceProviderName = 'addis';

  async transcribe(audio: Buffer, language?: string): Promise<VoiceTranscriptionResult> {
    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) throw new Error('ADDIS_AI_API_KEY is not set');

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(audio)], { type: 'audio/wav' }), 'audio.wav');
    formData.append('language', language || 'am'); // default Amharic

    const response = await fetch('https://api.addis.ai/v1/transcribe', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Addis AI transcription failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.text || data.transcription || data.result?.text;
    if (!text) throw new Error('Addis AI returned no transcription text');

    return {
      text,
      provider: this.name,
      latencyMs: 0, // filled by caller
    };
  }
}