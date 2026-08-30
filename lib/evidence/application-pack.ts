import { Evidence } from './schema';
import { generateSDGSuggestions, SDGSuggestion } from './impact-protocol';
import { findGaps, Gap } from './gaps';
import { findContradictions, Contradiction } from './contradictions';
import { scoreApplication } from '@/lib/rules/scoring';
import { ScoringResult } from '@/lib/rules/types';

export interface ApplicationPack {
  evidence: Partial<Evidence>;
  flatEvidence?: Record<string, any>;
  gaps: Gap[];
  contradictions: Contradiction[];
  sdgSuggestions: SDGSuggestion[];
  provisionalScoring?: ScoringResult;
  siteVisitQuestions: string[];
  generatedAt: string;
}

export function generateApplicationPack(
  evidence: Partial<Evidence>,
  flatEvidence?: Record<string, any>,
  scoringInput?: any
): ApplicationPack {
  const gaps = findGaps(evidence);
  const contradictions = findContradictions(evidence);
  const sdgSuggestions = generateSDGSuggestions(evidence);
  
  let provisionalScoring: ScoringResult | undefined;
  if (scoringInput) {
    provisionalScoring = scoreApplication(scoringInput);
  }

  // Generate targeted open verification questions for reviewers conducting site visits
  const siteVisitQuestions: string[] = [];
  
  if (contradictions.length > 0) {
    contradictions.forEach((c) => {
      siteVisitQuestions.push(`Verify discrepancy: ${c.message}`);
    });
  }

  if (gaps.length > 0) {
    gaps.slice(0, 5).forEach((g) => {
      siteVisitQuestions.push(`Request physical documentation/proof for: ${g.field}`);
    });
  }

  // Add standard verification checks based on reported evidence
  siteVisitQuestions.push('Inspect physical workshop/premises and machinery operational status.');
  siteVisitQuestions.push('Verify business registration certificate and tax identification document originals.');
  siteVisitQuestions.push('Cross-examine payroll records to confirm female and youth employee counts.');

  return {
    evidence,
    flatEvidence,
    gaps,
    contradictions,
    sdgSuggestions,
    provisionalScoring,
    siteVisitQuestions,
    generatedAt: new Date().toISOString(),
  };
}