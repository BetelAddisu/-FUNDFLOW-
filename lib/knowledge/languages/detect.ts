/**
 * Lightweight language detection for the three supported languages.
 * Amharic text (Ethiopic script) and common Oromo markers are detected
 * client- and server-side without a model. Structured evidence stays
 * language-neutral.
 */

const ETHIOPIC = /[\u1200-\u137F]/;

const OROMO_MARKERS =
  /(fakkeenya|galatoomi|akkam|mee|dandeessa|dhaabbata|gurgurtaa|hanga|meeqa|sireeffatta|iyyata)/i;

const ENGLISH_MARKERS = /\b(the|and|for|our|company|business|employees|sales|years|products)\b/i;

export function detectLanguage(text: string): "en" | "am" | "om" | "unknown" {
  if (ETHIOPIC.test(text)) return "am";
  if (OROMO_MARKERS.test(text)) return "om";
  if (ENGLISH_MARKERS.test(text)) return "en";
  // Default to the active UI language when we can't tell; the interview
  // service preserves the session language on short acknowledgements.
  return "unknown";
}

export function isSupportedLanguage(code: string): code is "en" | "am" | "om" {
  return code === "en" || code === "am" || code === "om";
}