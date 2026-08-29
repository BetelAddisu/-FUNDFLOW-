/**
 * English question templates. The interview drives by coverage gaps, but
 * templates keep the questions neutral, non-leading, and conversational.
 * Leading = clarifying incomplete answers, never coaching eligibility.
 */

export type QuestionId =
  | "consent"
  | "company_intro"
  | "registration_number"
  | "years_operating"
  | "company_overview"
  | "business_type"
  | "ownership"
  | "sales_2023"
  | "sales_2024"
  | "employees_2024"
  | "female_employees"
  | "youth_employees"
  | "market"
  | "uniqueness"
  | "sourcing"
  | "management"
  | "job_creation"
  | "expected_results"
  | "impact"
  | "acknowledge_contradiction"
  | "anything_else"
  | "photo_license"
  | "photo_workshop"
  | "complete";

export const QUESTIONS: Record<QuestionId, string> = {
  consent:
    "Before we begin: FundFlow will collect and store the information you share so it can prepare your application for the SME Support Scheme review process. Your answers may become part of the application record. Do you agree to continue?",
  company_intro:
    "Tell me a little about your company — its name, and what you do.",
  registration_number:
    "What is your business registration number? If you have your business license, you can send a photo of it instead.",
  years_operating:
    "What year did the business begin operating?",
  company_overview:
    "Could you give me a short overview of what the company does?",
  business_type:
    "How would you describe your business type (for example, manufacturing, trading, service, or agriculture)?",
  ownership:
    "What percentage of the company is owned by women, and what percentage by men?",
  sales_2023:
    "What were your approximate sales for 2023, in Ethiopian Birr?",
  sales_2024:
    "And for 2024, what were the approximate sales?",
  employees_2024:
    "Approximately how many total employees did you have in 2024?",
  female_employees:
    "Approximately how many of those employees in 2024 were women?",
  youth_employees:
    "Approximately how many of those employees were between 18 and 24 years old?",
  market:
    "Where do you sell? For example, local, national, international, or as an import substitute.",
  uniqueness:
    "What makes your product or service different from what is already available in Ethiopia?",
  sourcing:
    "Approximately what percentage of your raw materials are sourced locally in Ethiopia?",
  management:
    "Could you list the core management members (name and position)?",
  job_creation:
    "How many new jobs do you expect to create with the support from the intervention?",
  expected_results:
    "What results do you expect to achieve with this intervention? Please list up to three.",
  impact:
    "How does your business affect the community or the environment? What do you do about occupational safety and health?",
  acknowledge_contradiction:
    "I noticed the information you provided earlier conflicts. To continue accurately: [CONTEXT]. Could you clarify?",
  anything_else:
    "Is there anything else you would like to add to your application?",
  photo_license:
    "Please send a photo of your business license — this helps support your registration details.",
  photo_workshop:
    "Please send a photo of your workshop or business premises.",
  complete:
    "Thank you. Your application is now reasonably complete. I will summarize what we have. You can still make changes.",
};

export const HELPERS = {
  attached_photo: "We saved the photo and will treat any legible details as document-supported evidence.",
  audio_failed: "We could not process this audio. Your application has been saved. You can retry or continue with text.",
  audio_processing: "Processing your voice message...",
  start: "Hello. I can help you complete the SME Support Scheme application. You can type, speak, or send photos.",
};

export const WELCOME = HELPERS.start;

export const LANGUAGE_LABEL = "English";