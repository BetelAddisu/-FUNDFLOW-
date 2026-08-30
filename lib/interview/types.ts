export type Language = 'en' | 'am' | 'om';

export interface InterviewState {
  sessionId: string;
  language: Language;
  evidence: Record<string, any>;
  askedFields: string[];
  currentField?: string;
  status: 'in_progress' | 'complete';
  contradictions: string[];
}

export interface InterviewResponse {
  text: string;
  state: InterviewState;
}

export interface ExtractionService {
  extract(text: string, state: InterviewState): Promise<{ updates: Record<string, any>; contradictions: string[] }>;
}