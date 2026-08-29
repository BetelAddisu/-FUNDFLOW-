/**
 * Reasoning provider manager (configurable order, provider-agnostic).
 * After provider failure the result is `unresolved`; the caller may fall
 * back to deterministic local behavior but never to a fabricated response.
 */
import { recordProviderEvent } from "@/lib/storage/store";
import type {
  ReasoningProvider,
  ReasoningRequest,
  ReasoningResult,
} from "@/lib/ai/reasoning/types";

class LocalReasoningProvider implements ReasoningProvider {
  name = "local";

  async generate(_input: ReasoningRequest): Promise<ReasoningResult> {
    // Deterministic local reasoning: the interview/extraction code paths
    // work without an LLM. A model may be configured later; returning
    // unresolved here forces callers to use the deterministic engine.
    return {
      status: "unresolved",
      provider: this.name,
      error: "No remote reasoning provider configured; using deterministic engine.",
    };
  }
}

class GroqProvider implements ReasoningProvider {
  name = "groq";

  async generate(input: ReasoningRequest): Promise<ReasoningResult> {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
    if (!apiKey) return { status: "unresolved", provider: this.name, error: "GROQ_API_KEY not configured" };
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
            { role: "user", content: input.userPrompt },
          ],
        }),
      });
      if (!res.ok) {
        return { status: "unresolved", provider: this.name, error: `groq http ${res.status}` };
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return {
        status: "ok",
        text: json.choices?.[0]?.message?.content ?? "",
        provider: this.name,
        model,
      };
    } catch (e) {
      return { status: "unresolved", provider: this.name, error: String(e) };
    }
  }
}

class OpenRouterProvider implements ReasoningProvider {
  name = "openrouter";

  async generate(input: ReasoningRequest): Promise<ReasoningResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct";
    if (!apiKey) return { status: "unresolved", provider: this.name, error: "OPENROUTER_API_KEY not configured" };
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
            { role: "user", content: input.userPrompt },
          ],
        }),
      });
      if (!res.ok) {
        return { status: "unresolved", provider: this.name, error: `openrouter http ${res.status}` };
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return {
        status: "ok",
        text: json.choices?.[0]?.message?.content ?? "",
        provider: this.name,
        model,
      };
    } catch (e) {
      return { status: "unresolved", provider: this.name, error: String(e) };
    }
  }
}

export class ReasoningProviderManager {
  private providers: ReasoningProvider[];

  constructor() {
    const order = process.env.REASONING_ORDER ?? "primary,groq,openrouter,local";
    const byName: Record<string, ReasoningProvider> = {
      primary: new GroqProvider(), // placeholder: swap for Addis AI primary
      groq: new GroqProvider(),
      openrouter: new OpenRouterProvider(),
      local: new LocalReasoningProvider(),
    };
    this.providers = order
      .split(",")
      .map((n) => n.trim())
      .map((n) => byName[n])
      .filter((p): p is ReasoningProvider => !!p);
  }

  async generate(input: ReasoningRequest): Promise<ReasoningResult> {
    let lastError = "no providers configured";
    for (const provider of this.providers) {
      const started = Date.now();
      try {
        const result = await provider.generate(input);
        recordProviderEvent({
          provider: provider.name,
          capability: "reasoning",
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
          capability: "reasoning",
          outcome: "failure",
          error: lastError,
          latencyMs: Date.now() - started,
        });
      }
    }
    return {
      status: "unresolved",
      provider: "none",
      error: `All reasoning providers failed: ${lastError}`,
    };
  }
}

export const defaultReasoningManager = new ReasoningProviderManager();