import { QUESTIONS as EN_QUESTIONS, HELPERS as EN_HELPERS, WELCOME as EN_WELCOME, LANGUAGE_LABEL as EN_LABEL, type QuestionId } from "./en";
import { QUESTIONS as AM_QUESTIONS, HELPERS as AM_HELPERS, WELCOME as AM_WELCOME, LANGUAGE_LABEL as AM_LABEL } from "./am";
import { QUESTIONS as OM_QUESTIONS, HELPERS as OM_HELPERS, WELCOME as OM_WELCOME, LANGUAGE_LABEL as OM_LABEL } from "./om";

export type LanguageCode = "en" | "am" | "om";

export interface LanguagePack {
  code: LanguageCode;
  label: string;
  questions: Record<QuestionId, string>;
  helpers: typeof EN_HELPERS;
  welcome: string;
}

export const LANGUAGE_PACKS: Record<LanguageCode, LanguagePack> = {
  en: { code: "en", label: EN_LABEL, questions: EN_QUESTIONS, helpers: EN_HELPERS, welcome: EN_WELCOME },
  am: { code: "am", label: AM_LABEL, questions: AM_QUESTIONS, helpers: AM_HELPERS, welcome: AM_WELCOME },
  om: { code: "om", label: OM_LABEL, questions: OM_QUESTIONS, helpers: OM_HELPERS, welcome: OM_WELCOME },
};

export function languagePack(code: string): LanguagePack {
  if (code === "am" || code === "om" || code === "en") return LANGUAGE_PACKS[code];
  return LANGUAGE_PACKS.en;
}

export type { QuestionId };
export { detectLanguage } from "./detect";