import { Evidence } from './schema';
import { generateSDGSuggestions, SDGSuggestion } from './impact-protocol';
import { findGaps, Gap } from './gaps';

export interface ApplicationPack {
  evidence: Partial<Evidence>;
  gaps: Gap[];
  sdgSuggestions: SDGSuggestion[];
  scoring?: {
    eligible: boolean | 'needs_review';
    exclusions: Array<{ id: string; status: string; triggered?: boolean }>;
    criterionScores: Array<{ criterionId: string; name: string; points: number; maxPoints: number; reviewFlag?: string }>;
    totalPointsVariantA: number;
    totalPointsVariantB: number;
    reviewFlags: string[];
  };
  declarations?: Record<string, any>;
  generatedAt: string;
}

export function generateApplicationPack(evidence: Partial<Evidence>): ApplicationPack {
  return {
    evidence,
    gaps: findGaps(evidence),
    sdgSuggestions: generateSDGSuggestions(evidence),
    generatedAt: new Date().toISOString(),
  };
}