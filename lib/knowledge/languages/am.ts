/**
 * Amharic question templates (same coverage contract as English).
 * Translated carefully; the structured evidence model stays language-neutral.
 */
import type { QuestionId } from "./en";

export const QUESTIONS: Record<QuestionId, string> = {
  consent:
    "ከመጀመራችን በፊት፡- FundFlow የሚከተለውን ለSME Support Scheme ግምገማ ሂደት ማመልከቻዎን ለማዘጋጀት የሚያካፍሉትን መረጃ ይሰበስባል እና ያከማቻል። መልሶችዎ የማመልከቻው ክፍል ሊሆኑ ይችላሉ። ለመቀጠል ይስማማሉ?",
  company_intro:
    "ስለ ኩባንያዎ ጥቂት ይንገሩኝ — ስሙ እና ምን እንደሚሰሩ።",
  registration_number:
    "የንግድ ምዝገባ ቁጥርዎ ስንት ነው? የንግድ ፍቃድዎ ካለዎት ፎቶውን መላክ ይችላሉ።",
  years_operating:
    "ንግዱ ስራ የጀመረው በየትኛው ዓመት ነው?",
  company_overview:
    "ኩባንያው ምን እንደሚሰራ አጭር መግለጫ ሊሰጡኝ ይችላሉ?",
  business_type:
    "የንግድ ዓይነትዎን እንዴት ይገልጻሉ (ለምሳሌ፡- ማምረቻ፣ ንግድ፣ አገልግሎት፣ ወይም ግብርና)?",
  ownership:
    "ኩባንያው በሴቶች ስንት በመቶ እና በወንዶች ስንት በመቶ ነው የተያዘው?",
  sales_2023:
    "ለ2023 ዓ.ም የሽያጮችዎ ግምት ስንት ነበር፣ በኢትዮጵያ ብር?",
  sales_2024:
    "ለ2024 ዓ.ምስ የሽያጮችዎ ግምት ስንት ነበር?",
  employees_2024:
    "በ2024 ዓ.ም የነበራችሁ ጠቅላላ ሰራተኞች ቁጥር ስንት ነበር?",
  female_employees:
    "በ2024 ዓ.ም ከእነዚህ ሰራተኞች ውስጥ ሴቶች ስንት ነበሩ?",
  youth_employees:
    "ከእነዚህ ሰራተኞች ውስጥ ከ18 እስከ 24 ዓመት የሆናቸው ስንት ናቸው?",
  market:
    "የት ይሸጣሉ? ለምሳሌ፡- በአካባቢ፣ በሀገር አቀፍ፣ በአለም አቀፍ፣ ወይም እንደ ማስመጣት ምትክ።",
  uniqueness:
    "ምርትዎ ወይም አገልግሎትዎ በኢትዮጵያ ካሉት እንዴት የተለየ ነው?",
  sourcing:
    "ከጥሬ ዕቃዎችዎ ስንት በመቶ በኢትዮጵያ ውስጥ ይገኛል?",
  management:
    "ዋና የአስተዳደር አባላትን (ስም እና ሀላፊነት) ሊዘረዝሩ ይችላሉ?",
  job_creation:
    "በዚህ ድጋፍ ስንት አዳዲስ የስራ ዕድሎች ለመፍጠር ይጠብቃሉ?",
  expected_results:
    "በዚህ ድጋፍ ምን ውጤቶች ያስገኛሉ ብለው ይጠብቃሉ? እስከ ሶስት ይዘርዝሩ።",
  impact:
    "ንግድዎ ማህበረሰቡን ወይም አካባቢን እንዴት ይነካል? ስለ የስራ ደህንነት እና ጤና ምን ያደርጋሉ?",
  acknowledge_contradiction:
    "ከዚህ ቀደም የሰጡት መረጃ የሚቃረን መሆኑን አስተዋልኩ። በትክክል ለመቀጠል፡- [CONTEXT]። ማብራራት ይችላሉ?",
  anything_else:
    "ለማመልከቻዎ ማከል የሚፈልጉት ሌላ ነገር አለ?",
  photo_license:
    "እባክዎ የንግድ ፍቃድዎ ፎቶ ይላኩ — ይህ የምዝገባ መረጃዎን ይደግፋል።",
  photo_workshop:
    "እባክዎ የእርስዎን ዎርክሾፕ ወይም የንግድ ቦታ ፎቶ ይላኩ።",
  complete:
    "እናመሰግናለን። ማመልከቻዎ አሁን በበቂ ሁኔታ ተጠናቋል። ያለንን ጠቅለል አድርጌ አቀርባለሁ። አሁንም መለወጥ ይችላሉ።",
};

export const HELPERS = {
  attached_photo: "ፎቶውን አስቀምጠናል። ሊነበብ የሚችል ዝርዝር እንደ ሰነድ የተደገፈ ማስረጃ ተደርጎ ይታያል።",
  audio_failed: "ይህን ድምጽ ማስኬድ አልቻልንም። ማመልከቻዎ ተቀምጧል። እንደገና መሞከር ወይም በጽሁፍ መቀጠል ይችላሉ።",
  audio_processing: "የድምጽ መልዕክትዎን በማስኬድ ላይ...",
  start: "ሰላም። የSME Support Scheme ማመልከቻን እንዲያጠናቅቁ ልረዳዎ እችላለሁ። መተየብ፣ መናገር፣ ወይም ፎቶ መላክ ይችላሉ።",
};

export const WELCOME = HELPERS.start;
export const LANGUAGE_LABEL = "አማርኛ";