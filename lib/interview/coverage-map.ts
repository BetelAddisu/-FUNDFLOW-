import { Language } from './types';

export interface FieldDefinition {
  id: string;
  required: boolean;
  priority: number;
  question: Record<Language, string>;
  followUpQuestion?: Record<Language, string>;
}

export const coverageMap: FieldDefinition[] = [
  {
    id: 'company_name',
    required: true,
    priority: 1,
    question: {
      en: 'What is the name of your company?',
      am: 'የኩባንያዎ ስም ማን ይባላል?',
      om: 'Maqaan kaampaaniya keessanii maali?',
    },
  },
  {
    id: 'business_registration_number',
    required: true,
    priority: 2,
    question: {
      en: 'What is your business registration number?',
      am: 'የንግድ ምዝገባ ቁጥርዎ ስንት ነው?',
      om: 'Lakkoofsi galmee daldalaa keessanii meeqa?',
    },
  },
  {
    id: 'years_in_operation',
    required: true,
    priority: 3,
    question: {
      en: 'How many years has your business been operating?',
      am: 'ንግድዎ ስንት ዓመት ሆኖታል?',
      om: 'Daldalli keessan waggaa meeqa tajaajilaa jira?',
    },
  },
  {
    id: 'growth_indicators',
    required: true,
    priority: 4,
    question: {
      en: 'Please provide your sales and employee numbers for 2022, 2023, and 2024.',
      am: 'እባክዎ ለ2022፣ 2023 እና 2024 የሽያጭ እና የሰራተኛ ቁጥሮችን ያቅርቡ።',
      om: 'Lakkoofsota gurgurtaa fi hojjettoota 2022, 2023, fi 2024 irratti kennuu danda\'u?',
    },
    followUpQuestion: {
      en: 'The numbers you provided for sales seem inconsistent (e.g., 2025 is lower than 2022). Can you explain?',
      am: 'የሰጡት የሽያጭ ቁጥሮች ወጥነት የሌላቸው ይመስላሉ (ለምሳሌ 2025 ከ2022 ያነሰ ነው)። ማብራራት ይችላሉ?',
      om: 'Lakkoofsota gurgurtaa kennitan wal faallessa fakkaata (fkn 2025 irra xiqqaa 2022) . Ibsuu dandeessu?',
    },
  },
  {
    id: 'women_ownership_pct',
    required: true,
    priority: 5,
    question: {
      en: 'What percentage of the company is owned by women?',
      am: 'የኩባንያው ባለቤትነት ሴቶች ስንት በመቶ ነው?',
      om: 'Dhibbantaan qabiyyee kaampaaniyaa dubartootaan qabame meeqa?',
    },
  },
  {
    id: 'business_type',
    required: true,
    priority: 6,
    question: {
      en: 'What type of business do you operate? (e.g., textile, leather, service, metal, agriculture)',
      am: 'የትኛውን ዓይነት የንግድ አድርገዋል? (ለምሳሌ የሽጭነት፣ የበረቱ፣ አገልግሎት፣ ማዕድ፣ የምርት)',
      om: 'Daldala meeqaa tajaajilluu qaba? (fkn, gossa, dakaa, tajaajila, maatii, injeraa)',
    },
  },
  {
    id: 'main_products_services',
    required: true,
    priority: 7,
    question: {
      en: 'What are your main products or services? Please describe up to 4.',
      am: 'ዋናዎች የሽያጭ ምርቶችዎ ወይም አገልግሎቶችዎ ምንድን ናቸው? እስከ 4 ድረስ ያስተላልፉ።',
      om: 'Muraasni gurgurta keessan maali? Illee 4tti geessuu.',
    },
  },
  {
    id: 'market_served',
    required: true,
    priority: 8,
    question: {
      en: 'Which markets do you serve? (local, national, international)',
      am: 'ወደ የትኛው ገበያ ይገባሉ? (የአካባቢው፣ ብሔራዊ፣ ዓለም አቀፍ)',
      om: 'Gaba kee gaba keessa jira? (naannoo, tokkummaa, iddoo)',
    },
  },
  {
    id: 'requested_support_machinery',
    required: true,
    priority: 9,
    question: {
      en: 'What machinery or equipment do you need? Please describe up to 4 items with quantity and estimated price.',
      am: 'የትኛውን ማሽን ወይም ቁሳቁስ አስፈላጊዎታል? እስከ 4 ድረስ ከቁጥር እና የተገለጸ ዋጋ ጋር ያስተላልፉ።',
      om: 'Maashinii ykn qulqulluu meeqaa barbaachisaa? Illee 4tti kibbaa fi qima gubaallee geessuu.',
    },
  },
  {
    id: 'job_creation',
    required: true,
    priority: 10,
    question: {
      en: 'How many new jobs will this create in the next 15 months? Please list positions and numbers.',
      am: 'በሚቀጥለው 15 ወር ስንት አዲስ ሰራተኞች ይፈጠራሉ? ሰራተኛ ዋና ሚያዎችን እና ቁጥራቸውን ያስቀምጡ።',
      om: 'Waggaa 15 keessa jiraa hojii addaa meeqaa dabalataa? Turuuwwan hojii fi ibsani geessuu.',
    },
  },
  {
    id: 'social_environmental_impact_osh',
    required: false,
    priority: 11,
    question: {
      en: 'What positive social or environmental impact does your business have? (optional)',
      am: 'ንግድዎ የትኛውን ጠቀሜታ ማህበራዊ ወይም የአካባቢ ተብሎ ይደርሳል? (አልባት)',
      om: 'Daldalli keessan maaloo walumaagalatti ykn aadaa mala hojii qaba? (hin murruu)',
    },
  },
];