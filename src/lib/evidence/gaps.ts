import { EvidenceRecord, Gap } from './types';
import { REQUIRED_FIELDS, GROWTH_INDICATOR_FIELDS } from './schema';

export class GapEngine {
  findGaps(evidence: EvidenceRecord): Gap[] {
    const gaps: Gap[] = [];

    // Check required fields
    for (const fieldKey of REQUIRED_FIELDS) {
      const field = evidence[fieldKey];
      if (!field || field.value === undefined || field.value === null || field.value === '') {
        gaps.push(this.createGap(fieldKey, 'required'));
      } else if (field.state === 'not_established' || field.state === 'contradicted') {
        gaps.push(this.createGap(fieldKey, field.state));
      }
    }

    // Check growth indicators (at least 2022-2024 should be filled)
    for (const category of ['sales_etb', 'total_employees', 'female_employees', 'youth_employees_18_24'] as const) {
      for (const year of ['2022', '2023', '2024'] as const) {
        const fieldKey = `${category}_${year}`;
        const field = evidence[fieldKey];
        if (!field || field.value === undefined || field.value === null || field.value === '') {
          gaps.push(this.createGap(fieldKey, 'required'));
        }
      }
    }

    // Check at least one machinery entry
    const hasMachinery = evidence['machinery_description_1']?.value;
    if (!hasMachinery) {
      gaps.push(this.createGap('machinery_description_1', 'required'));
    }

    // Check at least one consultant entry
    const hasConsultant = evidence['consultant_problem_1']?.value;
    if (!hasConsultant) {
      gaps.push(this.createGap('consultant_problem_1', 'required'));
    }

    // Check at least one priority area
    const hasPriority = evidence['priority_area_1']?.value;
    if (!hasPriority) {
      gaps.push(this.createGap('priority_area_1', 'required'));
    }

    // Check at least one job position
    const hasJob = evidence['job_position_1']?.value;
    if (!hasJob) {
      gaps.push(this.createGap('job_position_1', 'required'));
    }

    // Check management team (at least 2 members would be ideal)
    const hasManagement = evidence['management_name_1']?.value;
    if (!hasManagement) {
      gaps.push(this.createGap('management_name_1', 'required'));
    }

    return gaps;
  }

  private createGap(fieldKey: string, reason: string): Gap {
    const fieldLabels: Record<string, string> = {
      company_name: 'Company Name',
      business_registration_number: 'Business Registration Number',
      address: 'Address',
      mobile_number: 'Mobile Number',
      email: 'Email',
      business_organization_form: 'Business Organization Form',
      years_in_operation: 'Years in Operation',
      business_type: 'Business Type/Sector',
      ownership_percentage_women: 'Women Ownership %',
      ownership_percentage_men: 'Men Ownership %',
      development_since_start: 'Development Since Start',
      motivation_to_apply: 'Motivation to Apply',
      business_goals: 'Business Goals',
      market_overview: 'Market Overview',
      product_service_1: 'Main Product/Service',
      market_served_1: 'Market Served',
      distribution_channels_1: 'Distribution Channels',
      product_service_uniqueness: 'Product/Service Uniqueness',
      raw_material_sourcing_pct: 'Raw Material Sourcing %',
      management_name_1: 'Management Team Member Name',
      management_position_1: 'Management Position',
      management_gender_1: 'Management Gender',
      problem_to_be_addressed: 'Problem to be Addressed',
      machinery_description_1: 'Machinery Description',
      machinery_quantity_1: 'Machinery Quantity',
      machinery_price_1: 'Machinery Price (ETB)',
      machinery_purpose_1: 'Machinery Purpose',
      consultant_problem_1: 'Consultant Problem',
      consultant_expertise_1: 'Consultant Expertise',
      expected_results: 'Expected Results',
      priority_area_1: 'Priority Area 1',
      priority_area_2: 'Priority Area 2',
      priority_area_3: 'Priority Area 3',
      job_creation_explanation: 'Job Creation Explanation',
      job_position_1: 'Job Position',
      job_count_1: 'Number of New Jobs',
      social_env_impact_osh: 'Social/Environmental Impact & OHS',
      osh_standards: 'Occupational Safety & Health Standards',
    };

    const growthLabels: Record<string, string> = {
      sales_etb_2022: 'Sales ETB 2022',
      sales_etb_2023: 'Sales ETB 2023',
      sales_etb_2024: 'Sales ETB 2024',
      sales_etb_2025_projection: 'Sales ETB 2025 Projection',
      sales_etb_2026_projection: 'Sales ETB 2026 Projection',
      total_employees_2022: 'Total Employees 2022',
      total_employees_2023: 'Total Employees 2023',
      total_employees_2024: 'Total Employees 2024',
      total_employees_2025_projection: 'Total Employees 2025 Projection',
      total_employees_2026_projection: 'Total Employees 2026 Projection',
      female_employees_2022: 'Female Employees 2022',
      female_employees_2023: 'Female Employees 2023',
      female_employees_2024: 'Female Employees 2024',
      female_employees_2025_projection: 'Female Employees 2025 Projection',
      female_employees_2026_projection: 'Female Employees 2026 Projection',
      youth_employees_18_24_2022: 'Youth Employees 2022',
      youth_employees_18_24_2023: 'Youth Employees 2023',
      youth_employees_18_24_2024: 'Youth Employees 2024',
      youth_employees_18_24_2025_projection: 'Youth Employees 2025 Projection',
      youth_employees_18_24_2026_projection: 'Youth Employees 2026 Projection',
    };

    const fieldName = fieldLabels[fieldKey] || growthLabels[fieldKey] || fieldKey;
    
    const actions: Record<string, string> = {
      required: `Please provide ${fieldName.toLowerCase()}.`,
      not_established: `Please clarify ${fieldName.toLowerCase()}.`,
      contradicted: `Please resolve the contradiction in ${fieldName.toLowerCase()}.`,
    };

    const severity = REQUIRED_FIELDS.includes(fieldKey as any) ? 'critical' : 'warning';

    return {
      fieldKey,
      fieldName,
      message: `${fieldName} is ${reason === 'required' ? 'missing' : reason}.`,
      severity,
      suggestedAction: actions[reason] || `Please provide ${fieldName.toLowerCase()}.`,
    };
  }
}

export const gapEngine = new GapEngine();