import { v4 as uuidv4 } from 'uuid';
import { 
  InterviewState, 
  InterviewResponse, 
  FieldDefinition, 
  ExtractionService,
  ExtractionResult,
  Language 
} from './types';
import { coverageMap, languageNames, languageNativeNames } from './coverage-map';
import { getReasoningProvider } from '../ai/reasoning';

export class InterviewAgent {
  private extractionService: ExtractionService;
  private reasoningProvider = getReasoningProvider();

  constructor(extractionService: ExtractionService) {
    this.extractionService = extractionService;
  }

  async start(sessionId: string, language: Language): Promise<InterviewResponse> {
    const state: InterviewState = {
      sessionId,
      language,
      evidence: {},
      askedFields: [],
      status: 'in_progress',
      contradictions: [],
      turnCount: 0,
    };

    const firstQuestion = this.getNextQuestion(state);
    if (firstQuestion) {
      state.currentField = firstQuestion.id;
      return {
        text: firstQuestion.question[language],
        state,
        action: 'ask',
      };
    }

    state.status = 'complete';
    return {
      text: this.getCompletionMessage(language),
      state,
      action: 'complete',
    };
  }

  async handleUserInput(input: string, state: InterviewState): Promise<InterviewResponse> {
    state.turnCount++;
    
    // Check for language switch commands
    const langSwitch = this.detectLanguageSwitch(input, state.language);
    if (langSwitch && langSwitch !== state.language) {
      state.language = langSwitch;
      const currentQuestion = this.getCurrentQuestion(state);
      if (currentQuestion) {
        return {
          text: currentQuestion.question[langSwitch],
          state,
          action: 'switch_language',
        };
      }
    }

    // Extract information from user input
    const extractionResult = await this.extractionService.extract(input, state, coverageMap);
    
    // Update evidence with extracted values
    for (const [fieldId, value] of Object.entries(extractionResult.updates)) {
      state.evidence[fieldId] = {
        value,
        state: 'self_reported',
        confidence: extractionResult.confidence[fieldId] || 0.8,
        sourceTurnIds: [uuidv4()],
      };
    }

    // Handle contradictions
    for (const contradiction of extractionResult.contradictions) {
      if (!state.contradictions.includes(contradiction)) {
        state.contradictions.push(contradiction);
      }
    }

    // Mark current field as asked
    if (state.currentField) {
      if (!state.askedFields.includes(state.currentField)) {
        state.askedFields.push(state.currentField);
      }
      state.currentField = undefined;
    }

    // If we have contradictions, ask for clarification on the first one
    if (state.contradictions.length > 0) {
      const contradictionField = state.contradictions[0];
      const fieldDef = coverageMap.find(f => f.id === contradictionField);
      if (fieldDef && fieldDef.followUpQuestion) {
        state.currentField = contradictionField;
        state.status = 'awaiting_clarification';
        return {
          text: fieldDef.followUpQuestion[state.language],
          state,
          action: 'clarify',
        };
      }
    }

    // Find next missing required field
    const nextField = this.getNextMissingField(state);
    if (nextField) {
      state.currentField = nextField.id;
      return {
        text: nextField.question[state.language],
        state,
        action: 'ask',
      };
    }

    // All required fields collected
    state.status = 'complete';
    state.currentField = undefined;
    return {
      text: this.getCompletionMessage(state.language),
      state,
      action: 'complete',
    };
  }

  async handleVoiceInput(audioBuffer: Buffer, state: InterviewState): Promise<InterviewResponse> {
    // Transcribe audio
    const voiceProvider = getVoiceProvider();
    const transcription = await voiceProvider.transcribe(audioBuffer, state.language);
    
    if (!transcription.text || transcription.provider === 'unresolved') {
      return {
        text: this.getTranscriptionFailedMessage(state.language),
        state,
        action: 'ask',
      };
    }

    // Process transcribed text
    return this.handleUserInput(transcription.text, state);
  }

  async handlePhotoInput(imageBuffer: Buffer, state: InterviewState): Promise<InterviewResponse> {
    // In a full implementation, this would use OCR/vision API to extract text from documents
    // For now, we acknowledge receipt and continue
    const messages: Record<Language, string> = {
      en: 'Thank you for providing the photo. I\'ve received it.',
      am: 'ለማቅረቡ ፎቶ አመሰግናለሁ። ተቀብሯል።',
      om: 'Saa\'umsaa kenninaanuf galatoomi. Dhabameera.',
    };

    return {
      text: messages[state.language],
      state,
      action: 'ask',
    };
  }

  private getNextQuestion(state: InterviewState): FieldDefinition | undefined {
    return this.getNextMissingField(state);
  }

  private getCurrentQuestion(state: InterviewState): FieldDefinition | undefined {
    if (!state.currentField) return undefined;
    return coverageMap.find(f => f.id === state.currentField);
  }

  private getNextMissingField(state: InterviewState): FieldDefinition | undefined {
    for (const field of coverageMap) {
      if (!field.required) continue;
      if (!state.evidence[field.id] || state.evidence[field.id].value === undefined || state.evidence[field.id].value === null || state.evidence[field.id].value === '') {
        return field;
      }
    }
    return undefined;
  }

  private detectLanguageSwitch(input: string, currentLang: Language): Language | null {
    const lower = input.toLowerCase().trim();
    
    // English switches
    if (lower.match(/^(english|en|switch to english)$/)) return 'en';
    // Amharic switches
    if (lower.match(/^(amharic|am|አማርኛ|ወደ አማርኛ ቀይር)$/)) return 'am';
    // Oromo switches
    if (lower.match(/^(oromo|om|oromifa|afaan oromo|afaan oromoo|gara afaan oromoo jira)$/)) return 'om';
    
    return null;
  }

  private getCompletionMessage(language: Language): string {
    const messages: Record<Language, string> = {
      en: `Thank you! I have collected all the required information for your application. Your application is now ready for review.`,
      am: `እናመሰግናለሁ! ለመግቢያዎ የሚጠየቁ ሁሉም መረጃዎችን ሰብሰብናል። መግቢያዎ አሁን ለግምገማ ነው የተዘጋጀ።`,
      om: `Galatoomi! Barbaachisaa meeshaa daldalaa keessanii gaarii fiidhuu qofa jabessu. Galmeessaa keessan amma garbichisuu danda\'a.`,
    };
    return messages[language];
  }

  private getTranscriptionFailedMessage(language: Language): string {
    const messages: Record<Language, string> = {
      en: 'I couldn\'t understand the audio. Please try again or type your response.',
      am: 'ድምፅን ማረጋገጥ አልቻልኩም። እባክዎ ደግሞ ይሞክሩ ወይም የሚፈልጉትን ይጻፉ።',
      om: 'Dhagamsiin koo hin fahmin. Dagaagaa yaali, ykn barruutiin jawaabessaa kennuu danda\'a?',
    };
    return messages[language];
  }

  // Get progress percentage
  getProgress(state: InterviewState): number {
    const requiredFields = coverageMap.filter(f => f.required).length;
    const answeredFields = coverageMap.filter(f => 
      f.required && state.evidence[f.id] && state.evidence[f.id].value !== undefined && state.evidence[f.id].value !== null && state.evidence[f.id].value !== ''
    ).length;
    return requiredFields > 0 ? Math.round((answeredFields / requiredFields) * 100) : 100;
  }

  // Get remaining fields
  getRemainingFields(state: InterviewState): FieldDefinition[] {
    return coverageMap.filter(f => 
      f.required && (!state.evidence[f.id] || state.evidence[f.id].value === undefined || state.evidence[f.id].value === null || state.evidence[f.id].value === '')
    );
  }
}

// Default extraction service using LLM
export class LLMExtractionService implements ExtractionService {
  private reasoningProvider = getReasoningProvider();

  async extract(text: string, state: InterviewState, fieldDefinitions: FieldDefinition[]): Promise<ExtractionResult> {
    const unfilledFields = fieldDefinitions.filter(f => 
      f.required && (!state.evidence[f.id] || state.evidence[f.id].value === undefined || state.evidence[f.id].value === null || state.evidence[f.id].value === '')
    );

    if (unfilledFields.length === 0) {
      return { updates: {}, contradictions: [], confidence: {} };
    }

    // Build extraction prompt
    const fieldDescriptions = unfilledFields.map(f => 
      `- ${f.id}: ${f.question[state.language]}`
    ).join('\n');

    const systemPrompt = `You are an information extraction agent for an Ethiopian SME funding application. 
Extract values for the following fields from the user's response. 
Return ONLY a JSON object with the extracted values.
If a field is not mentioned, omit it from the JSON.
If the user's response contradicts a previously stated value, include the field in "contradictions" array.
Language: ${languageNames[state.language]} (${languageNativeNames[state.language]})

Fields to extract:
${fieldDescriptions}

Current evidence: ${JSON.stringify(state.evidence, null, 2)}

Return format:
{
  "updates": { "field_id": "extracted_value" },
  "contradictions": ["field_id_that_contradicts"],
  "confidence": { "field_id": 0.9 }
}`;

    try {
      const result = await this.reasoningProvider.complete(text, {
        systemPrompt,
        temperature: 0.1,
        maxTokens: 2048,
      });

      const parsed = JSON.parse(result.text);
      return {
        updates: parsed.updates || {},
        contradictions: parsed.contradictions || [],
        confidence: parsed.confidence || {},
      };
    } catch (error) {
      console.error('LLM extraction failed:', error);
      return { updates: {}, contradictions: [], confidence: {} };
    }
  }
}