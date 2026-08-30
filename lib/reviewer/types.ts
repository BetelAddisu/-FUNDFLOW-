import { ScoringInput, CriterionScore } from '@/lib/rules/types';

export interface CompanyMetadata {
  companyName: string;
  businessType: string;
  region: string;
  yearsInOperation: number;
  language: 'en' | 'am' | 'om';
  submissionDate: string;
  licensePhotoUrl?: string;
  workshopPhotoUrl?: string;
}

export interface ReviewEntry {
  id: string;
  companyName: string;
  sector: string;
  region: string;
  language: 'en' | 'am' | 'om';
  channel: 'web' | 'telegram';
  synthetic: boolean;
  eligible: boolean | 'needs_review';
  exclusions: Array<{ id: string; status: string; triggered?: boolean; reason?: string }>;
  criterionScores: Array<CriterionScore & { reasoning: string; evidenceValue?: string }>;
  totalPointsVariantA: number;
  totalPointsVariantB: number;
  reviewFlags: string[];
  readinessPercentage: number;
  contradiction?: string;
  incompleteFields?: string[];
  metadata: CompanyMetadata;
  siteVisitQuestions: string[];
}

export interface ReviewerFixture {
  id: string;
  channel: 'web' | 'telegram';
  synthetic: boolean;
  metadata: CompanyMetadata;
  input: ScoringInput;
  contradiction?: string;
  incompleteFields?: string[];
}