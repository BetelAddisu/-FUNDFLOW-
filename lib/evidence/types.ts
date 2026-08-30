export type EvidenceState =
  | 'self_reported'
  | 'document_supported'
  | 'visually_observed'
  | 'verified'
  | 'not_established'
  | 'contradicted';

export interface EvidenceField {
  state: EvidenceState;
  value?: unknown;
  confidence?: number;
  source?: string;
  notes?: string;
}