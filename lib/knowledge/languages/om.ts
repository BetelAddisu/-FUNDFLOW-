/**
 * Afaan Oromo question templates (same coverage contract as English).
 * Sufficient for the demonstrated path; structured evidence stays
 * language-neutral.
 */
import type { QuestionId } from "./en";

export const QUESTIONS: Record<QuestionId, string> = {
  consent:
    "Odoo jalqabnuu dura: FundFlow odeeffannoo ati nuuf kennitu ni funaanaa fi ni kuusa, akka ijaarsa iyyata sagantaa SME Support Scheme. Deebiin kee kutaa iyyataa ta'uu danda'a. Itti fufuu ni jaalatta?",
  company_intro:
    "Waan dhimma dhaabbata keetii xinnoo naaf himi — maqaa isaa fi waan isin hojjattan.",
  registration_number:
    "Lakkoofsa galmee daldala keetii meeqa? Rakkoo yoo qabdu, suuraa ayyaana daldalaa kee nuuf erguu dandeessa.",
  years_operating:
    "Daldalli bara kam jalqabe?",
  company_overview:
    "Gabaasa gabaabaa waan dhaabbati hojjatu naaf kennuu dandeessaa?",
  business_type:
    "Gosa daldala kee akkamitti ibsita (fakkeenyaaf: oomisha, daldala, tajaajila, ykn qonna)?",
  ownership:
    "Dhaabbataan dhibbantaa meeqa dubartootaan fi dhibbantaa meeqa dhiiraan qabame?",
  sales_2023:
    "Gatii gurgurtaa bara 2023 kee meeqa ture, Birrii Itoophiyaatiin?",
  sales_2024:
    "Bara 2024 keessattis gatii gurgurtaa kee meeqa ture?",
  employees_2024:
    "Bara 2024 keessa hojjettoota waliigalaa meeqa turtan?",
  female_employees:
    "Bara 2024 keessa hojjettoota sana keessaa dubartoota meeqa turan?",
  youth_employees:
    "Hojjettoota sana keessaa umurii 18 hanga 24 jiruun meeqa?",
  market:
    "Eessa gurgurtuu? Fakkeenyaaf: naannoo, biyya, addunyaa, ykn bakka bu'aa galchaa.",
  uniqueness:
    "Waan ati oomishamtu ykn tajaajiltu Itiyoophiyaa keessattijiraan jiraatan irraa akkamitti adda?",
  sourcing:
    "Dhibbantaa meeqa wantoota (raw material) kee keessaa Itiyoophiyaa keessatti argama?",
  management:
    "Hojjettoota guddaa (maqaa fi itti gaafatamummaa) tarreessuu dandeessaa?",
  job_creation:
    "Gargaarsa kanaan hojii haaraa meeqa uumuu sireeffatta?",
  expected_results:
    "Gargaarsa kanaan bu'aa akkamii argachuu sireeffatta? Hanga sadii tarreessi.",
  impact:
    "Daldalli kee hawaasa ykn naannoo akkamitti dhiirra? Waa'ee nageenyaa fi fayyaa hojii maal hojjatta?",
  acknowledge_contradiction:
    "Odeeffannoon dura kennite wal faallessa ta'uu hubadhe. Haala sirriin itti fufuuf: [CONTEXT]. Hiikuu dandeessaa?",
  anything_else:
    "Waan iyyata kee irratti dabaluu barbaaddu jiraa?",
  photo_license:
    "Maaloo suuraa ayyaana daldalaa kee nuuf ergi — kun ragaa galmee kee deeggara.",
  photo_workshop:
    "Maaloo suuraa bakka hojii ykn mana daldala kee nuuf ergi.",
  complete:
    "Galatoomi. Iyyatni kee amma sirnaan xumurameera. Waan qabnu gabaabinaan siif hima. Amma illee jijjiiruu dandeessa.",
};

export const HELPERS = {
  attached_photo: "Suuraa kuusnee jirra. Ibsa dubbisuu danda'u ragaa ragaadhaan deeggare ta'ee ilaalama.",
  audio_failed: "Sagalee kana hojiirra oolchuu hin dandeenye. Iyyatni kee kuufamee jira. Ammas yeroon yaaluu ykn barreeffamaan itti fufuu dandeessa.",
  audio_processing: "Ergama sagalee kee hojiechaa jira...",
  start: "Akkam! Iyyata sagantaa SME Support Scheme xumuruu siif danda'a. Barreessuu, dubbachuu, ykn suuraa erguu dandeessa.",
};

export const WELCOME = HELPERS.start;
export const LANGUAGE_LABEL = "Afaan Oromoo";