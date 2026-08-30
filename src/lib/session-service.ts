import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient } from '../supabase';
import { InterviewAgent, LLMExtractionService } from '../interview/agent';
import { ApplicationPackGenerator } from '../evidence/application-pack';
import { evidenceExtractor } from '../evidence/extractor';
import { scoreApplication } from '../rules/scoring';
import { DeclarationManager } from '../declarations';
import { ChannelInput, ChannelResponse, InterviewSessionService } from '../channels/types';
import { InterviewState, Language } from '../interview/types';
import { EvidenceRecord } from '../evidence/types';

// In-memory session store (in production, use Redis or database)
const sessionStore = new Map<string, InterviewState>();
const extractionService = new LLMExtractionService();
const interviewAgent = new InterviewAgent(extractionService);
const packGenerator = new ApplicationPackGenerator();
const declarationManager = new DeclarationManager();

export class FundFlowSessionService implements InterviewSessionService {
  async process(input: ChannelInput): Promise<ChannelResponse> {
    const { sessionId, userId, language, input: userInput, channel } = input;
    
    // Get or create session state
    let state = sessionStore.get(sessionId);
    if (!state) {
      state = {
        sessionId,
        language,
        evidence: {},
        askedFields: [],
        status: 'in_progress',
        contradictions: [],
        turnCount: 0,
      };
      sessionStore.set(sessionId, state);
      
      // Start interview
      const startResponse = await interviewAgent.start(sessionId, language);
      state = startResponse.state;
      sessionStore.set(sessionId, state);
      
      return {
        text: startResponse.text,
        language: state.language,
        metadata: { sessionCreated: true, progress: interviewAgent.getProgress(state) },
      };
    }

    // Update language if changed
    if (language !== state.language) {
      state.language = language;
    }

    let response: ChannelResponse;

    switch (userInput.type) {
      case 'text':
        if (userInput.content) {
          const agentResponse = await interviewAgent.handleUserInput(userInput.content, state);
          state = agentResponse.state;
          sessionStore.set(sessionId, state);
          
          response = {
            text: agentResponse.text,
            language: state.language,
            metadata: { 
              progress: interviewAgent.getProgress(state),
              status: state.status,
              action: agentResponse.action,
            },
          };
        } else {
          response = {
            text: 'Please provide a text message.',
            language: state.language,
          };
        }
        break;

      case 'voice':
        if (userInput.audioBuffer) {
          const agentResponse = await interviewAgent.handleVoiceInput(userInput.audioBuffer, state);
          state = agentResponse.state;
          sessionStore.set(sessionId, state);
          
          response = {
            text: agentResponse.text,
            language: state.language,
            metadata: { 
              progress: interviewAgent.getProgress(state),
              status: state.status,
              action: agentResponse.action,
            },
          };
        } else if (userInput.audioUrl) {
          // Download audio from URL
          try {
            const audioResp = await fetch(userInput.audioUrl);
            const audioBuffer = Buffer.from(await audioResp.arrayBuffer());
            const agentResponse = await interviewAgent.handleVoiceInput(audioBuffer, state);
            state = agentResponse.state;
            sessionStore.set(sessionId, state);
            
            response = {
              text: agentResponse.text,
              language: state.language,
              metadata: { progress: interviewAgent.getProgress(state), status: state.status },
            };
          } catch (error) {
            console.error('Failed to download audio:', error);
            response = {
              text: 'Failed to process audio. Please try again.',
              language: state.language,
            };
          }
        } else {
          response = {
            text: 'No audio data provided.',
            language: state.language,
          };
        }
        break;

      case 'photo':
        if (userInput.imageBuffer) {
          // Extract evidence from image
          const imageUpdates = await evidenceExtractor.extractFromImage(userInput.imageBuffer);
          for (const [key, value] of Object.entries(imageUpdates)) {
            state.evidence[key] = value;
          }
          
          const agentResponse = await interviewAgent.handlePhotoInput(userInput.imageBuffer, state);
          state = agentResponse.state;
          sessionStore.set(sessionId, state);
          
          response = {
            text: agentResponse.text,
            language: state.language,
            metadata: { progress: interviewAgent.getProgress(state), status: state.status },
          };
        } else if (userInput.imageUrl) {
          try {
            const imgResp = await fetch(userInput.imageUrl);
            const imageBuffer = Buffer.from(await imgResp.arrayBuffer());
            const imageUpdates = await evidenceExtractor.extractFromImage(imageBuffer);
            for (const [key, value] of Object.entries(imageUpdates)) {
              state.evidence[key] = value;
            }
            
            response = {
              text: 'Photo received and processed.',
              language: state.language,
              metadata: { progress: interviewAgent.getProgress(state), status: state.status },
            };
          } catch (error) {
            console.error('Failed to download image:', error);
            response = {
              text: 'Failed to process photo. Please try again.',
              language: state.language,
            };
          }
        } else {
          response = {
            text: 'No image data provided.',
            language: state.language,
          };
        }
        break;

      default:
        response = {
          text: 'Unknown input type.',
          language: state.language,
        };
    }

    // If interview is complete, generate application pack
    if (state.status === 'complete') {
      const pack = await packGenerator.generate(sessionId, state.evidence as EvidenceRecord, state.language);
      
      // Score the application
      const scoringInput = this.mapEvidenceToScoringInput(state.evidence as EvidenceRecord);
      const scoringResult = scoreApplication(scoringInput);
      
      // Generate full pack with programme score
      const fullPack = await packGenerator.generateWithProgrammeScore(sessionId, state.evidence as EvidenceRecord, scoringResult, state.language);
      
      // Save to database
      await this.saveApplication(sessionId, userId, channel, fullPack, scoringResult);
      
      response.metadata = {
        ...response.metadata,
        applicationComplete: true,
        pack: fullPack,
        scoring: scoringResult,
      };
    }

    return response;
  }

  private mapEvidenceToScoringInput(evidence: EvidenceRecord) {
    return {
      sales_growth_pct: this.calculateSalesGrowth(evidence),
      total_employees: Number(evidence['total_employees_2024']?.value) || undefined,
      uniqueness: evidence['product_service_uniqueness']?.value,
      market_served: evidence['market_served_1']?.value,
      local_sourcing_pct: Number(evidence['raw_material_sourcing_pct']?.value) || undefined,
      ownership: evidence['ownership_percentage_women']?.value && Number(evidence['ownership_percentage_women']?.value) > 0 ? 'women_owned' : 'neither',
      women_employee_pct: this.calculateWomenEmployeePct(evidence),
      youth_employee_pct: this.calculateYouthEmployeePct(evidence),
      expected_results_count: this.countExpectedResults(evidence),
      job_count: Number(evidence['job_count_1']?.value) || undefined,
      investment_readiness: this.calculateInvestmentReadiness(evidence),
      management_team_size: this.countManagementTeam(evidence),
      impact_category: this.determineImpactCategory(evidence),
      legally_registered_and_years: true, // Would be validated against license
      privately_owned: true, // Would be validated
    };
  }

  private calculateSalesGrowth(evidence: EvidenceRecord): number | undefined {
    const sales2022 = Number(evidence['sales_etb_2022']?.value);
    const sales2024 = Number(evidence['sales_etb_2024']?.value);
    if (!isNaN(sales2022) && !isNaN(sales2024) && sales2022 > 0) {
      return ((sales2024 - sales2022) / sales2022) * 100;
    }
    return undefined;
  }

  private calculateWomenEmployeePct(evidence: EvidenceRecord): number | undefined {
    const female = Number(evidence['female_employees_2024']?.value);
    const total = Number(evidence['total_employees_2024']?.value);
    if (!isNaN(female) && !isNaN(total) && total > 0) {
      return (female / total) * 100;
    }
    return undefined;
  }

  private calculateYouthEmployeePct(evidence: EvidenceRecord): number | undefined {
    const youth = Number(evidence['youth_employees_18_24_2024']?.value);
    const total = Number(evidence['total_employees_2024']?.value);
    if (!isNaN(youth) && !isNaN(total) && total > 0) {
      return (youth / total) * 100;
    }
    return undefined;
  }

  private countExpectedResults(evidence: EvidenceRecord): number {
    let count = 0;
    if (evidence['expected_results']?.value) count++;
    if (evidence['priority_area_1']?.value) count++;
    if (evidence['priority_area_2']?.value) count++;
    if (evidence['priority_area_3']?.value) count++;
    return Math.min(count, 3);
  }

  private calculateInvestmentReadiness(evidence: EvidenceRecord): number | undefined {
    // Simplified calculation based on job count and investment
    const jobCount = Number(evidence['job_count_1']?.value);
    const machineryPrice = Number(evidence['machinery_price_1']?.value);
    if (!isNaN(jobCount) && !isNaN(machineryPrice) && machineryPrice > 0) {
      // Investment readiness score based on jobs per million ETB
      return Math.round((jobCount / (machineryPrice / 1_000_000)) * 10) / 10;
    }
    return undefined;
  }

  private countManagementTeam(evidence: EvidenceRecord): number {
    // In a full implementation, this would count all management entries
    return evidence['management_name_1']?.value ? 1 : 0;
  }

  private determineImpactCategory(evidence: EvidenceRecord): 'green_business_model' | 'both_social_env' | 'either_social_or_env' | 'neither' {
    const impactText = (evidence['social_env_impact_osh']?.value || '').toLowerCase();
    const businessType = (evidence['business_type']?.value || '').toLowerCase();
    
    const greenKeywords = ['green', 'renewable', 'solar', 'organic', 'sustainable', 'eco', 'energy efficient', 'carbon'];
    const socialKeywords = ['women', 'youth', 'employment', 'jobs', 'community', 'social'];
    const envKeywords = ['environment', 'pollution', 'waste', 'recycling', 'conservation', 'climate'];
    
    const isGreen = greenKeywords.some(k => businessType.includes(k) || impactText.includes(k));
    const isSocial = socialKeywords.some(k => impactText.includes(k));
    const isEnv = envKeywords.some(k => impactText.includes(k));
    
    if (isGreen) return 'green_business_model';
    if (isSocial && isEnv) return 'both_social_env';
    if (isSocial || isEnv) return 'either_social_or_env';
    return 'neither';
  }

  private async saveApplication(
    sessionId: string,
    userId: string,
    channel: 'web' | 'telegram',
    pack: any,
    scoringResult: any
  ): Promise<void> {
    const supabase = createServerSupabaseClient();
    
    try {
      const { error } = await supabase.from('applications').upsert({
        session_id: sessionId,
        evidence_snapshot: pack.evidence,
        scores: {
          criterionScores: pack.scoring?.criterionScores,
          totalPointsVariantA: pack.scoring?.totalPointsVariantA,
          totalPointsVariantB: pack.scoring?.totalPointsVariantB,
        },
        exclusions: pack.scoring?.exclusions,
        gaps: pack.gaps,
        sdg_suggestions: pack.sdgSuggestions,
        declarations: pack.declarations,
        readiness_score: pack.readinessScore,
        programme_score: pack.programmeScore,
        status: 'submitted',
      });
      
      if (error) {
        console.error('Failed to save application:', error);
      }
    } catch (error) {
      console.error('Database error:', error);
    }
  }

  // Get session state
  getSession(sessionId: string): InterviewState | undefined {
    return sessionStore.get(sessionId);
  }

  // Clear session
  clearSession(sessionId: string): void {
    sessionStore.delete(sessionId);
  }
}

// Singleton instance
export const sessionService = new FundFlowSessionService();