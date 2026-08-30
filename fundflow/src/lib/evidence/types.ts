export type EvidenceState = 
  | 'self_reported'
  | 'document_supported'
  | 'visually_observed'
  | 'verified'
  | 'not_established'
  | 'contradicted';

export interface EvidenceValue {
  value: any;
  state: EvidenceState;
  confidence: number;
  sourceTurnIds: string[];
  contradictionNote?: string;
  updatedAt: string;
}

export interface EvidenceRecord {
  [fieldKey: string]: EvidenceValue;
}

export interface Gap {
  fieldKey: string;
  fieldName: string;
  message: string;
  severity: 'critical' | 'warning';
  suggestedAction: string;
}

export interface Contradiction {
  fieldKey: string;
  fieldName: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  conflictingValues: any[];
}

export interface SDGSuggestion {
  sdgId: number;
  title: string;
  reason: string;
  evidenceSource: string;
  alignmentStatus: 'potential_alignment';
}

export interface ApplicationPack {
  sessionId: string;
  evidence: EvidenceRecord;
  gaps: Gap[];
  contradictions: Contradiction[];
  sdgSuggestions: SDGSuggestion[];
  readinessScore: number;
  programmeScore?: number;
  declarations: DeclarationStatus[];
  generatedAt: string;
}

export interface DeclarationStatus {
  id: string;
  text: string;
  explained: boolean;
  explainedLanguage?: 'en' | 'am' | 'om';
  understandingConfirmed: boolean;
  systemTicked: boolean;
}