import { EvidenceRecord, ApplicationPack, DeclarationStatus, Gap, Contradiction, SDGSuggestion } from './types';
import { REQUIRED_FIELDS } from './schema';
import { contradictionEngine } from './contradictions';
import { gapEngine } from './gaps';
import { generateSDGSuggestions, generateImpactProtocolDraft } from './impact-protocol';
import { loadOfficialCriteria } from '@/config';
import { DeclarationManager } from '../declarations';

export class ApplicationPackGenerator {
  private declarationManager: DeclarationManager;

  constructor() {
    this.declarationManager = new DeclarationManager();
  }

  async generate(sessionId: string, evidence: EvidenceRecord, language: 'en' | 'am' | 'om' = 'en'): Promise<ApplicationPack> {
    // Find contradictions
    const contradictions = contradictionEngine.findContradictions(evidence);

    // Find gaps
    const gaps = gapEngine.findGaps(evidence);

    // Generate SDG suggestions
    const sdgSuggestions = await generateSDGSuggestions(evidence);

    // Calculate readiness score (percentage of required fields filled)
    const filledRequired = REQUIRED_FIELDS.filter(f => {
      const field = evidence[f];
      return field && field.value !== undefined && field.value !== null && field.value !== '' && field.state !== 'not_established';
    }).length;
    const readinessScore = Math.round((filledRequired / REQUIRED_FIELDS.length) * 100);

    // Get declarations status
    const criteria = loadOfficialCriteria();
    const declarations: DeclarationStatus[] = criteria.declarations.map(decl => {
      const status = this.declarationManager.getStatus(decl.id);
      return {
        id: decl.id,
        text: this.declarationManager.getDeclarationText(decl.id, language),
        explained: status.explained,
        explainedLanguage: status.explainedLanguage,
        understandingConfirmed: status.understandingConfirmed,
        systemTicked: status.systemTicked,
      };
    });

    return {
      sessionId,
      evidence,
      gaps,
      contradictions,
      sdgSuggestions,
      readinessScore,
      declarations,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateWithProgrammeScore(
    sessionId: string, 
    evidence: EvidenceRecord, 
    scoringResult: { eligible: boolean; scores: any; totalPointsVariantA: number; totalPointsVariantB: number },
    language: 'en' | 'am' | 'om' = 'en'
  ): Promise<ApplicationPack> {
    const pack = await this.generate(sessionId, evidence, language);
    pack.programmeScore = scoringResult.totalPointsVariantA; // Use variant A as primary
    return pack;
  }
}

export const applicationPackGenerator = new ApplicationPackGenerator();