/**
 * Voice provider manager with configurable priority
 * (VOICE_STT_ORDER=addis,google,local_whisper). Falls back through the
 * configured providers; if all fail the result is `unresolved` — never a
 * fabricated transcript. Provider outcomes are recorded for the audit trail.
 */
import { recordProviderEvent } from "@/lib/storage/store";
import type {
  AudioInput,
  SpeechToTextProvider,
  TranscriptLanguage,
  TranscriptResult,
} from "@/lib/ai/speech/types";

/**
 * Deterministic zero-cost fallback that must never fabricate audio content.
 * It returns unresolved until a provider is configured or the demo audio
 * transcript fixture is supplied explicitly (e.g. in seeded demos by the
 * session service reading the audio fixture manifest).
 */
export class LocalWhisperProvider implements SpeechToTextProvider {
  name = "local_whisper";

  async transcribe(_input: AudioInput): Promise<TranscriptResult> {
    // No bundled model → unresolved. The interview service treats a
    // well-formed audio file against the fixture manifest; otherwise the
    // applicant can continue with text. No fake transcript is generated.
    return {
      status: "unresolved",
      provider: this.name,
      error: "No local speech model is bundled in the demo environment.",
    };
  }
}

export class AddisAiSttProvider implements SpeechToTextProvider {
  name = "addis";

  async transcribe(input: AudioInput): Promise<TranscriptResult> {
    const apiKey = process.env.ADDIS_STT_API_KEY;
    const baseUrl = process.env.ADDIS_STT_BASE_URL;
    if (!apiKey) {
      return { status: "unresolved", provider: this.name, error: "ADDIS_STT_API_KEY not configured" };
    }
    try {
      const body = new FormData();
      const blob =
        typeof input.data === "string"
          ? new Blob([Buffer.from(input.data, "base64")], {
              type: input.mimeType ?? "audio/webm",
            })
          : new Blob([input.data as BlobPart], { type: input.mimeType ?? "audio/webm" });
      body.append("audio", blob, "input.webm");
      if (input.durationSeconds) body.append("duration_seconds", String(input.durationSeconds));
      if (process.env.ADDIS_STT_MODEL) body.append("model", process.env.ADDIS_STT_MODEL);

      const res = await fetch(`${baseUrl ?? "https://speech.addis.ai"}/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
      });
      if (!res.ok) {
        return { status: "unresolved", provider: this.name, error: `addis stt http ${res.status}` };
      }
      const json = (await res.json()) as { text?: string; language?: TranscriptLanguage; confidence?: number };
      if (!json.text) {
        return { status: "unresolved", provider: this.name, error: "addis stt empty response" };
      }
      return {
        status: "ok",
        text: json.text,
        language: json.language ?? "unknown",
        provider: this.name,
        confidence: json.confidence,
        durationSeconds: input.durationSeconds,
      };
    } catch (e) {
      return { status: "unresolved", provider: this.name, error: String(e) };
    }
  }
}

export class GoogleSttProvider implements SpeechToTextProvider {
  name = "google";

  async transcribe(input: AudioInput): Promise<TranscriptResult> {
    const apiKey = process.env.GOOGLE_STT_API_KEY;
    if (!apiKey) {
      return { status: "unresolved", provider: this.name, error: "GOOGLE_STT_API_KEY not configured" };
    }
    try {
      const url = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`;
      const content =
        typeof input.data === "string"
          ? input.data
          : Buffer.from(input.data as ArrayBuffer).toString("base64");
      const lang = process.env.GOOGLE_STT_LANGUAGE ?? "en-US";
      const body = {
        config: { encoding: "WEBM_OPUS", languageCode: lang, model: "default" },
        audio: { content },
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        return { status: "unresolved", provider: this.name, error: `google stt http ${res.status}` };
      }
      const json = (await res.json()) as {
        results?: Array<{ alternatives?: Array<{ transcript: string; confidence?: number }> }>;
      };
      const alt = json.results?.[0]?.alternatives?.[0];
      if (!alt?.transcript) {
        return { status: "unresolved", provider: this.name, error: "google stt empty response" };
      }
      return {
        status: "ok",
        text: alt.transcript,
        provider: this.name,
        confidence: alt.confidence,
        durationSeconds: input.durationSeconds,
      };
    } catch (e) {
      return { status: "unresolved", provider: this.name, error: String(e) };
    }
  }
}

/** No-op TTS provider used when voice replies are not configured. */
export class NoopTtsProvider {
  name = "none";
  async synthesize(_text: string, _language: string) {
    return { audio: "", mimeType: "audio/webm" };
  }
}

export class VoiceProviderManager {
  private providers: SpeechToTextProvider[];

  constructor(order?: string) {
    const configured = order ?? process.env.VOICE_STT_ORDER ?? "addis,google,local_whisper";
    const byName: Record<string, SpeechToTextProvider> = {
      addis: new AddisAiSttProvider(),
      google: new GoogleSttProvider(),
      local_whisper: new LocalWhisperProvider(),
    };
    this.providers = configured
      .split(",")
      .map((n) => n.trim())
      .filter((n) => !!n)
      .map((n) => byName[n])
      .filter((p): p is SpeechToTextProvider => !!p);
  }

  async transcribe(input: AudioInput): Promise<TranscriptResult> {
    let lastError = "no providers configured";
    for (const provider of this.providers) {
      const started = Date.now();
      try {
        const result = await provider.transcribe(input);
        recordProviderEvent({
          provider: provider.name,
          capability: "stt",
          outcome: result.status === "ok" ? "success" : "failure",
          error: result.error,
          latencyMs: Date.now() - started,
        });
        if (result.status === "ok") return result;
        lastError = result.error ?? "provider failed";
      } catch (e) {
        lastError = String(e);
        recordProviderEvent({
          provider: provider.name,
          capability: "stt",
          outcome: "failure",
          error: lastError,
          latencyMs: Date.now() - started,
        });
      }
    }
    return {
      status: "unresolved",
      provider: "none",
      error: `All speech providers failed: ${lastError}`,
    };
  }
}

export const defaultVoiceManager = new VoiceProviderManager();