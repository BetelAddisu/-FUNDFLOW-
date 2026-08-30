import { Language } from '@/lib/interview/types';
import config from '@/config/official-criteria.json';

export interface DeclarationStatus {
  id: string;
  explained: boolean;
  explainedLanguage?: Language;
  understandingConfirmed: boolean;
  systemTicked: boolean;
}

export class DeclarationManager {
  private statuses: Record<string, DeclarationStatus>;

  constructor() {
    this.statuses = {};
    for (const decl of config.declarations) {
      this.statuses[decl.id] = {
        id: decl.id,
        explained: false,
        understandingConfirmed: false,
        systemTicked: false,
      };
    }
  }

  getStatus(id: string): DeclarationStatus {
    return this.statuses[id];
  }

  getDeclarationText(id: string, language: Language): string {
    const decl = config.declarations.find((d) => d.id === id);
    if (!decl) throw new Error(`Unknown declaration ${id}`);
    switch (language) {
      case 'en':
        return decl.text_en;
      case 'am':
        return decl.text_am;
      case 'om':
        return decl.text_om;
      default:
        return decl.text_en;
    }
  }

  explain(id: string, language: Language): void {
    const status = this.statuses[id];
    if (!status) throw new Error(`Unknown declaration ${id}`);
    status.explained = true;
    status.explainedLanguage = language;
  }

  confirmUnderstanding(id: string): boolean {
    const status = this.statuses[id];
    if (!status) throw new Error(`Unknown declaration ${id}`);
    if (status.explained) {
      status.understandingConfirmed = true;
      return true;
    }
    return false;
  }

  authorizedTick(id: string): boolean {
    const status = this.statuses[id];
    if (!status) throw new Error(`Unknown declaration ${id}`);
    if (status.understandingConfirmed) {
      status.systemTicked = true;
      return true;
    }
    return false;
  }
}