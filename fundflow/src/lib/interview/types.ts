export type Language = 'en' | 'am' | 'om';

export interface FieldDefinition {
  id: string;
  required: boolean;
  priority: number;
  question: Record<Language, string>;
  followUpQuestion?: Record<Language, string>;
  extractorPrompt?: string;
  validation?: (value: any) => { valid: boolean; error?: string };
}

export interface InterviewState {
  sessionId: string;
  language: Language;
  evidence: Record<string, any>;
  askedFields: string[];
  currentField?: string;
  status: 'in_progress' | 'complete' | 'awaiting_clarification';
  contradictions: string[];
  turnCount: number;
  lastExtractionTurn?: string;
}

export interface InterviewResponse {
  text: string;
  audioBuffer?: Buffer;
  state: InterviewState;
  action?: 'ask' | 'clarify' | 'complete' | 'switch_language';
}

export interface ExtractionResult {
  updates: Record<string, any>;
  contradictions: string[];
  confidence: Record<string, number>;
}

export interface ExtractionService {
  extract(text: string, state: InterviewState, fieldDefinitions: FieldDefinition[]): Promise<ExtractionResult>;
}