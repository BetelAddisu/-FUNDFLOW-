/**
 * Core evidence model. Every extracted application value is stored with
 * provenance: where it came from, how precise it is, how confident the
 * system is about the extraction, and whether it is established,
 * not established, or contradicted.
 *
 * Principles:
 * - Missing is not zero: an absent value must not be treated as 0.
 * - Confidence is extraction confidence, never "truth probability".
 * - Contradictions are explicit values, never silently resolved.
 */

export type EvidenceSource =
  | "self_reported"
  | "document_supported"
  | "visually_observed"
  | "verified";

export type EvidenceStatus = "established" | "not_established" | "contradicted";

export type Precision = "exact" | "approximate" | "range" | "unknown";

export type EvidenceRefKind = "turn" | "document" | "audio" | "photo" | "field";

export interface EvidenceRef {
  kind: EvidenceRefKind;
  /** e.g. "turn_42", "document_07", "audio_03", "field_83" */
  id: string;
}

export interface EvidenceField<T = unknown> {
  field: string;
  value: T | null;
  source: EvidenceSource;
  status: EvidenceStatus;
  /** Extraction/interpretation confidence 0..1 — NOT truth probability. */
  confidence: number | null;
  precision: Precision;
  evidenceRef: EvidenceRef | null;
  language: "en" | "am" | "om" | "unknown";
  /** Alternative conflicting values, present when status === "contradicted". */
  values?: EvidenceField<T>[];
  /** Human-readable reason for status (e.g. provider failure / unreadable). */
  reason?: string;
  updatedAt: string;
}

export type EvidenceMap = Record<string, EvidenceField>;

export function makeEvidenceField<T>(
  field: string,
  value: T | null,
  partial: Partial<Omit<EvidenceField<T>, "field" | "value" | "updatedAt">> = {}
): EvidenceField<T> {
  return {
    field,
    value,
    source: partial.source ?? "self_reported",
    status: partial.status ?? (value === null ? "not_established" : "established"),
    confidence: partial.confidence ?? (value === null ? null : 0.8),
    precision: partial.precision ?? "exact",
    evidenceRef: partial.evidenceRef ?? null,
    language: partial.language ?? "unknown",
    values: partial.values,
    reason: partial.reason,
    updatedAt: new Date().toISOString(),
  };
}

/** Field-level evidence embedded in an application value. */
export interface Evidenced<T> {
  value: T;
  evidenceRef: EvidenceRef;
  source: EvidenceSource;
}