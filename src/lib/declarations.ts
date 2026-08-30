import { loadOfficialCriteria } from '@/config';

export type Language = 'en' | 'am' | 'om';

export interface DeclarationStatus {
  id: string;
  text: string;
  explained: boolean;
  explainedLanguage?: Language;
  understandingConfirmed: boolean;
  systemTicked: boolean;
}

export class DeclarationManager {
  private statuses: Map<string, DeclarationStatus> = new Map();
  private declarations: ReturnType<typeof loadOfficialCriteria>['declarations'];

  constructor() {
    const criteria = loadOfficialCriteria();
    this.declarations = criteria.declarations;
    
    for (const decl of this.declarations) {
      this.statuses.set(decl.id, {
        id: decl.id,
        text: decl.text_en, // default to English
        explained: false,
        understandingConfirmed: false,
        systemTicked: false,
      });
    }
  }

  getStatus(id: string): DeclarationStatus | undefined {
    return this.statuses.get(id);
  }

  getAllStatuses(): DeclarationStatus[] {
    return Array.from(this.statuses.values());
  }

  getDeclarationText(id: string, language: Language): string {
    const decl = this.declarations.find(d => d.id === id);
    if (!decl) throw new Error(`Unknown declaration ${id}`);
    
    switch (language) {
      case 'en': return decl.text_en;
      case 'am': return decl.text_am;
      case 'om': return decl.text_om;
      default: return decl.text_en;
    }
  }

  explain(id: string, language: Language): boolean {
    const status = this.statuses.get(id);
    if (!status) return false;
    
    status.explained = true;
    status.explainedLanguage = language;
    status.text = this.getDeclarationText(id, language);
    return true;
  }

  confirmUnderstanding(id: string): boolean {
    const status = this.statuses.get(id);
    if (!status || !status.explained) return false;
    
    status.understandingConfirmed = true;
    return true;
  }

  authorizedTick(id: string): boolean {
    const status = this.statuses.get(id);
    if (!status || !status.understandingConfirmed) return false;
    
    status.systemTicked = true;
    return true;
  }

  // Check if all declarations are ready for submission
  allReady(): boolean {
    for (const status of this.statuses.values()) {
      if (!status.systemTicked) return false;
    }
    return true;
  }

  // Reset for new session
  reset(): void {
    for (const status of this.statuses.values()) {
      status.explained = false;
      status.explainedLanguage = undefined;
      status.understandingConfirmed = false;
      status.systemTicked = false;
      // Reset text to default English
      const decl = this.declarations.find(d => d.id === status.id);
      if (decl) status.text = decl.text_en;
    }
  }
}