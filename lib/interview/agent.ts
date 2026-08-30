import { InterviewState, InterviewResponse, ExtractionService, Language } from './types';
import { coverageMap, FieldDefinition } from './coverage-map';

export class InterviewAgent {
  private extractionService: ExtractionService;

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
    };
    const firstQuestion = this.getQuestionForState(state);
    if (firstQuestion) {
      state.currentField = firstQuestion.field.id;
      return {
        text: firstQuestion.text,
        state,
      };
    }
    state.status = 'complete';
    return { text: '', state };
  }

  async handleUserInput(text: string, state: InterviewState): Promise<InterviewResponse> {
    const extractionResult = await this.extractionService.extract(text, state);
    state.evidence = { ...state.evidence, ...extractionResult.updates };
    state.contradictions = [...new Set([...state.contradictions, ...extractionResult.contradictions])];

    if (state.currentField) {
      state.askedFields.push(state.currentField);
      state.currentField = undefined;
    }

    if (state.contradictions.length > 0) {
      const fieldId = state.contradictions[0];
      const field = coverageMap.find(
        (f) => f.id === fieldId || fieldId.startsWith(f.id) || f.id.startsWith(fieldId)
      );
      if (field && field.followUpQuestion) {
        state.currentField = field.id;
        return {
          text: field.followUpQuestion[state.language],
          state,
        };
      }
    }

    const nextField = this.getNextMissingField(state);
    if (nextField) {
      state.currentField = nextField.id;
      return {
        text: nextField.question[state.language],
        state,
      };
    }

    state.status = 'complete';
    state.currentField = undefined;
    return {
      text: this.getCompletionMessage(state.language),
      state,
    };
  }

  private getNextMissingField(state: InterviewState): FieldDefinition | undefined {
    for (const field of coverageMap) {
      if (!field.required) continue;
      if (state.evidence[field.id] === undefined || state.evidence[field.id] === null) {
        return field;
      }
    }
    return undefined;
  }

  private getQuestionForState(state: InterviewState): { field: FieldDefinition; text: string } | undefined {
    const field = this.getNextMissingField(state);
    if (field) {
      return {
        field,
        text: field.question[state.language],
      };
    }
    return undefined;
  }

  private getCompletionMessage(language: Language): string {
    switch (language) {
      case 'en':
        return 'Thank you, your information is complete.';
      case 'am':
        return 'እናመሰግናለን፣ መረጃዎ ተጠናቋል።';
      case 'om':
        return 'Galatoomaa, odeeffannoon keessan guutuu ta\'eera.';
      default:
        return 'Thank you.';
    }
  }
}