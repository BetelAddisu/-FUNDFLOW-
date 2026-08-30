import { ScoringInput, CriterionScore } from '@/lib/rules/types';

export interface ReviewEntry {
  id: string;
  channel: 'web' | 'telegram';
  synthetic: boolean;
  eligible: boolean | 'needs_review';
  exclusions: Array<{ id: string; status: string; triggered?: boolean }>;
  criterionScores: Array<CriterionScore & { reasoning: string }>;
  totalPointsVariantA: number;
  totalPointsVariantB: number;
  reviewFlags: string[];
  contradiction?: string;
  incompleteFields?: string[];
}

export interface ReviewerFixture {
  id: string;
  channel: 'web' | 'telegram';
  synthetic: boolean;
  input: ScoringInput;
  contradiction?: string;
  incompleteFields?: string[];
}