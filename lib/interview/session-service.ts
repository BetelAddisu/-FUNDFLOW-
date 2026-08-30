import { InterviewSessionService, ChannelInput, ChannelResponse } from '@/lib/channels/types';
import { InterviewAgent } from './agent';
import { LLMExtractionAgent } from '@/lib/evidence/extractor';
import { getVoiceProvider } from '@/lib/ai/providers';
import { Evidence } from '@/lib/evidence/schema';
import { findContradictions } from '@/lib/evidence/contradictions';
import { findGaps } from '@/lib/evidence/gaps';
import { generateApplicationPack, ApplicationPack } from '@/lib/evidence/application-pack';
import { DeclarationManager } from '@/lib/declarations';
import { scoreApplication, ScoringInput } from '@/lib/rules/scoring';
import { checkEligibility } from '@/lib/rules/eligibility';

interface SessionData {
  state: any;
  evidence: Partial<Evidence>;
  language: 'en' | 'am' | 'om';
  declarationManager: DeclarationManager;
}

class InterviewSessionServiceImpl implements InterviewSessionService {
  private sessions = new Map<string, SessionData>();
  private interviewAgent: InterviewAgent;
  private extractionAgent: LLMExtractionAgent;

  constructor() {
    this.extractionAgent = new LLMExtractionAgent();
    this.interviewAgent = new InterviewAgent({
      extract: async (text: string, state: any) => {
        const sessionData = this.sessions.get(state.sessionId);
        if (!sessionData) {
          return { updates: {}, contradictions: [] };
        }
        const updates = await this.extractionAgent.extractFromText(text, sessionData.evidence);
        const contradictions = findContradictions({ ...sessionData.evidence, ...updates });
        return { updates, contradictions: contradictions.map(c => c.field) };
      },
    });
  }

  async process(input: ChannelInput): Promise<ChannelResponse> {
    const { userId, sessionId, text, audio, photos, metadata } = input;
    
    let sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      const language = (metadata?.language as 'en' | 'am' | 'om') || 'en';
      sessionData = {
        state: null,
        evidence: {},
        language,
        declarationManager: new DeclarationManager(),
      };
      this.sessions.set(sessionId, sessionData);
      
      const startResponse = await this.interviewAgent.start(sessionId, language);
      sessionData.state = startResponse.state;
      return { text: startResponse.text };
    }

    let userText = text;
    
    if (audio) {
      const voiceProvider = getVoiceProvider();
      const transcription = await voiceProvider.transcribe(audio, sessionData.language);
      if (!transcription.text || transcription.provider === 'unresolved') {
        const errorMessages = {
          en: "Sorry, I couldn't understand the audio. Please try again or type your response.",
          am: "የድምፁን ማስተላለፍ አልቻልኩም። እባክዎ እንደገና ይሞክሩ ወይም ይፃፉ።",
          om: "Dhugaa, odii dheeraa hin fayyadamnu. Daballi deebi'i jirti yoo ta'e, dubbisi.",
        };
        return { text: errorMessages[sessionData.language] };
      }
      userText = transcription.text;
    }

    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const imageUpdates = await this.extractionAgent.extractFromImage(photo);
        sessionData.evidence = { ...sessionData.evidence, ...imageUpdates };
      }
    }

    const response = await this.interviewAgent.handleUserInput(userText, sessionData.state);
    sessionData.state = response.state;
    sessionData.evidence = { ...sessionData.evidence, ...response.state.evidence };

    if (response.state.status === 'complete') {
      const pack = await this.generateApplicationPack(sessionData.evidence, sessionData.language);
      return {
        text: response.text,
        metadata: { applicationPack: pack },
      };
    }

    return { text: response.text };
  }

  async generateApplicationPack(evidence: Partial<Evidence>, language: 'en' | 'am' | 'om'): Promise<ApplicationPack> {
    const gaps = findGaps(evidence);
    const { generateSDGSuggestions } = await import('@/lib/evidence/impact-protocol');
    const sdgSuggestions = generateSDGSuggestions(evidence);
    
    const scoringInput = this.evidenceToScoringInput(evidence);
    const scoringResult = scoreApplication(scoringInput);
    const eligibilityResult = checkEligibility(scoringInput);

    return {
      evidence,
      gaps,
      sdgSuggestions,
      scoring: {
        eligible: eligibilityResult.eligible,
        exclusions: eligibilityResult.exclusions,
        criterionScores: scoringResult.criterionScores,
        totalPointsVariantA: scoringResult.totalPointsVariantA,
        totalPointsVariantB: scoringResult.totalPointsVariantB,
        reviewFlags: scoringResult.reviewFlags,
      },
      declarations: this.getDeclarationStatuses(),
      generatedAt: new Date().toISOString(),
    };
  }

  private evidenceToScoringInput(evidence: Partial<Evidence>): ScoringInput {
    const profile = evidence.company_profile;
    const growth = evidence.growth_indicators;
    const management = evidence.management;
    const intervention = evidence.intervention_requested;

    const sales2022 = growth?.sales_etb?.['2022']?.value as number;
    const sales2024 = growth?.sales_etb?.['2024']?.value as number;
    let sales_growth_pct: number | undefined;
    if (sales2022 && sales2024) {
      sales_growth_pct = ((sales2024 - sales2022) / sales2022) * 100;
    }

    const total_employees = growth?.total_employees?.['2024']?.value as number;
    const female_employees = growth?.female_employees?.['2024']?.value as number;
    const youth_employees = growth?.youth_employees_18_24?.['2024']?.value as number;
    const women_employee_pct = total_employees && female_employees ? (female_employees / total_employees) * 100 : undefined;
    const youth_employee_pct = total_employees && youth_employees ? (youth_employees / total_employees) * 100 : undefined;

    const management_team_size = management?.core_management_team?.length || 0;

    const job_creation = intervention?.job_creation;
    const job_count = job_creation?.positions_table?.reduce((sum: number, p: any) => sum + (p.number_of_new_jobs?.value || 0), 0) || 0;
    const expected_results_count = intervention?.priority_areas?.length || 0;

    const ownership = profile?.ownership_percentage;
    const women_pct = ownership?.women_pct?.value as number;
    const men_pct = ownership?.men_pct?.value as number;
    let ownershipType: 'women_owned' | 'women_managed' | 'neither' | undefined;
    if (women_pct > 50) ownershipType = 'women_owned';
    else if (women_pct > 0) ownershipType = 'women_managed';
    else ownershipType = 'neither';

    return {
      sales_growth_pct,
      total_employees,
      uniqueness: 'new_in_ethiopia',
      market_served: 'international',
      local_sourcing_pct: profile?.raw_material_sourcing_pct_local?.value as number,
      ownership: ownershipType,
      women_employee_pct,
      youth_employee_pct,
      expected_results_count,
      job_count,
      investment_readiness: job_count,
      management_team_size,
      impact_category: 'both_social_env',
      legally_registered_and_years: !!profile?.business_registration_number?.value && (profile?.years_in_operation?.value as number || 0) >= 2,
      privately_owned: true,
    };
  }

  private getDeclarationStatuses() {
    return {};
  }

  getSession(sessionId: string) {
    return this.sessions.get(sessionId);
  }
}

export const interviewService = new InterviewSessionServiceImpl();