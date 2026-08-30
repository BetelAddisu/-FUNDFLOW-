import { OfficialCriteria } from '@/config';

export interface ScoringInput {
  // C1.1 Sales growth
  sales_growth_pct?: number;
  // C1.2 Employment
  total_employees?: number;
  // C2 Uniqueness
  uniqueness?: 'new_in_ethiopia' | 'different_from_competitors' | 'essential' | 'no_unique';
  // C3 Market served
  market_served?: 'international' | 'import_substituting' | 'local_only';
  // C4 Supply chain
  local_sourcing_pct?: number;
  // C5.1 Ownership/management
  ownership?: 'women_owned' | 'women_managed' | 'neither';
  // C5.2 Women employees
  women_employee_pct?: number;
  // C5.3 Youth employees
  youth_employee_pct?: number;
  // C6 Expected results
  expected_results_count?: number;
  // C7a Employability (job count)
  job_count?: number;
  // C7b Investment readiness
  investment_readiness?: number;
  // C8 Management capacity
  management_team_size?: number;
  // C9 Impact
  impact_category?: 'green_business_model' | 'both_social_env' | 'either_social_or_env' | 'neither';
  // Exclusions
  legally_registered_and_years?: boolean;
  privately_owned?: boolean;
}

export interface CriterionScore {
  criterionId: string;
  name: string;
  points: number;
  maxPoints: number;
  reviewFlag?: string;
  bandMatched?: string;
}

export interface ExclusionResult {
  id: string;
  name: string;
  triggered: boolean;
  reason?: string;
}

export interface ScoringResult {
  eligible: boolean;
  eligibilityStatus: 'eligible' | 'ineligible' | 'needs_review';
  exclusions: ExclusionResult[];
  criterionScores: CriterionScore[];
  totalPointsVariantA: number; // Using C7a
  totalPointsVariantB: number; // Using C7b
  reviewFlags: string[];
  readinessScore: number;
}

export interface Band {
  label: string;
  points: number;
  min?: number;
  max?: number;
}