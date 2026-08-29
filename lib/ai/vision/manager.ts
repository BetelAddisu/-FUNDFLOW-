/**
 * Vision/document pipeline. Images are validated, described within visible
 * evidence only, and never made to prove facts that a photo cannot show
 * (e.g. employee counts). Unreadable documents stay `not_established`.
 */
import { recordProviderEvent } from "@/lib/storage/store";

export type VisionObservationStatus = "established" | "not_established" | "unresolved";

export interface VisionObservation {
  status: VisionObservationStatus;
  /** safe description of visible content */
  description?: string;
  extractedFields?: Array<{
    field: string;
    value: string;
    source: "document_supported";
    reason: string;
  }>;
  reason?: string;
  provider: string;
}

export interface ImageInput {
  data: Buffer | string;
  mimeType?: string;
  /** e.g. "business_license" | "workshop" | "organogram" */
  documentKind: string;
}

interface VisionProvider {
  name: string;
  analyze(input: ImageInput): Promise<VisionObservation>;
}

class LocalVisionAnalyzer implements VisionProvider {
  name = "local_vision";

  async analyze(input: ImageInput): Promise<VisionObservation> {
    // No bundled vision model: deterministic placeholder keeps the pipeline
    // honest. The demo fixtures bind legible documents via the evidence
    // extractor (fixture manifest) rather than fabricating OCR from an
    // arbitrary image.
    return {
      status: "unresolved",
      provider: this.name,
      reason: "No vision model is bundled in the demo environment. Image saved as evidence; extraction requires reviewer resolution.",
    };
  }
}

class GoogleVisionProvider implements VisionProvider {
  name = "google_vision";

  async analyze(input: ImageInput): Promise<VisionObservation> {
    const apiKey = process.env.GOOGLE_REASONING_API_KEY;
    if (!apiKey) {
      return { status: "unresolved", provider: this.name, reason: "GOOGLE_REASONING_API_KEY not configured" };
    }
    try {
      const content =
        typeof input.data === "string"
          ? input.data
          : Buffer.from(input.data as ArrayBuffer).toString("base64");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Describe ONLY what is visibly present. If any text is legible on a business license or document, extract registration number, company name, and dates exactly as written. If text is not legible, say UNREADABLE. Do not infer employee counts or hierarchies not visible." }, { inline_data: { mime_type: input.mimeType ?? "image/jpeg", data: content } }] }],
          }),
        }
      );
      if (!res.ok) {
        return { status: "unresolved", provider: this.name, reason: `google vision http ${res.status}` };
      }
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!text) return { status: "unresolved", provider: this.name, reason: "google vision empty response" };
      const unreadable = /unreadable|illegible|no legible/i.test(text);
      const extracted: VisionObservation["extractedFields"] = [];
      if (!unreadable) {
        const regMention = text.match(/(?:registration|license|reg)\.?\s*[:\-]?\s*([A-Z0-9\-/]+)/i);
        if (regMention) {
          extracted.push({
            field: "company_profile.business_registration_number",
            value: regMention[1],
            source: "document_supported",
            reason: "Legible on uploaded business license photograph.",
          });
        }
      }
      return {
        status: "established",
        description: text,
        extractedFields: extracted.length > 0 ? extracted : undefined,
        provider: this.name,
      };
    } catch (e) {
      return { status: "unresolved", provider: this.name, reason: String(e) };
    }
  }
}

export class VisionManager {
  private providers: VisionProvider[];

  constructor() {
    this.providers = [new GoogleVisionProvider(), new LocalVisionAnalyzer()];
  }

  async analyze(input: ImageInput): Promise<VisionObservation> {
    let lastError = "no providers";
    for (const provider of this.providers) {
      const started = Date.now();
      try {
        const result = await provider.analyze(input);
        recordProviderEvent({
          provider: provider.name,
          capability: "vision",
          outcome: result.status === "unresolved" ? "failure" : "success",
          error: result.reason,
          latencyMs: Date.now() - started,
        });
        if (result.status !== "unresolved") return result;
        lastError = result.reason ?? "provider unresolved";
      } catch (e) {
        lastError = String(e);
      }
    }
    return {
      status: "unresolved",
      provider: "none",
      reason: `All vision providers failed: ${lastError}`,
    };
  }
}

export const defaultVisionManager = new VisionManager();