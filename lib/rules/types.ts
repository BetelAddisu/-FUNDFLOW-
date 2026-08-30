export interface ScoringInput {
  sales_growth_pct?: number;
  total_employees?: number;
  uniqueness?: 'new_in_ethiopia' | 'different_from_competitors' | 'essential' | 'no_unique';
  market_served?: 'international' | 'import_substituting' | 'local_only';
  local_sourcing_pct?: number;
  ownership?: 'women_owned' | 'women_managed' | 'neither';
  women_employee_pct?: number;
  youth_employee_pct?: number;
  expected_results_count?: number;
  job_count?: number;
  investment_readiness?: number;
  management_team_size?: number;
  impact_category?: 'green_business_model' | 'both_social_env' | 'either_social_or_env' | 'neither';
  legally_registered_and_years?: boolean;
  privately_owned?: boolean;
}

export interface CriterionScore {
  criterionId: string;
  name: string;
  points: number;
  maxPoints: number;
  reviewFlag?: string;
}

export interface ScoringResult {
  eligible: boolean | 'needs_review';
  exclusions: Array<{ id: string; status: 'confirmed' | 'pending'; triggered?: boolean; reason?: string }>;
  criterionScores: CriterionScore[];
  totalPointsVariantA: number;
  totalPointsVariantB: number;
  reviewFlags: string[];
}