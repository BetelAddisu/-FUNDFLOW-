/**
 * Reasoning-provider contract. The reasoning layer produces evidence and
 * conversation help only — never eligibility, scores, or rankings. Those
 * stay in the deterministic rules engine.
 */

export interface ReasoningRequest {
  systemPrompt?: string;
  userPrompt: string;
  /** structured task type so callers can validate output downstream */
  task: "extract" | "converse" | "classify" | "translate";
  inputLanguage?: "en" | "am" | "om" | "unknown";
}

export interface ReasoningResult {
  status: "ok" | "unresolved";
  text?: string;
  data?: unknown;
  provider: string;
  model?: string;
  latencyMs?: number;
  error?: string;
}

export interface ReasoningProvider {
  name: string;
  generate(input: ReasoningRequest): Promise<ReasoningResult>;
}