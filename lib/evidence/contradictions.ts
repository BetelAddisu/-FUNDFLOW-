import { EvidenceField } from './types';
import { Evidence } from './schema';

export interface Contradiction {
  field: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

function isEstablished(field?: EvidenceField): boolean {
  if (!field) return false;
  if (field.state === 'not_established' || field.state === 'contradicted') return false;
  if (field.value === undefined || field.value === null || field.value === '') return false;
  if (Array.isArray(field.value) && field.value.length === 0) return false;
  return true;
}

function extractYear(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/\b(19|20)\d{2}\b/);
    if (match) return parseInt(match[0], 10);
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date.getFullYear();
  }
  return null;
}

export function findContradictions(evidence: Partial<Evidence>): Contradiction[] {
  const contradictions: Contradiction[] = [];

  const profile = evidence.company_profile;
  if (profile) {
    const licenseIssueDateField = profile.license_issue_date;
    const yearsInOperationField = profile.years_in_operation;

    if (isEstablished(licenseIssueDateField) && isEstablished(yearsInOperationField)) {
      const licenseYear = extractYear(licenseIssueDateField!.value);
      const yearsInOp = yearsInOperationField!.value;
      const yearsNum = typeof yearsInOp === 'number' ? yearsInOp : parseFloat(String(yearsInOp));

      if (licenseYear !== null && !isNaN(yearsNum)) {
        const currentYear = new Date().getFullYear();
        const maxYearsFromLicense = currentYear - licenseYear;
        if (yearsNum > maxYearsFromLicense) {
          contradictions.push({
            field: 'company_profile.years_in_operation',
            message: `Claimed ${yearsNum} years in operation but license issued in ${licenseYear}, which implies at most ${maxYearsFromLicense} years.`,
            severity: 'high',
          });
        }
      }
    }

    const womenPct = profile.ownership_percentage?.women_pct;
    const menPct = profile.ownership_percentage?.men_pct;
    if (isEstablished(womenPct) && isEstablished(menPct)) {
      const womenVal = parseFloat(String(womenPct!.value));
      const menVal = parseFloat(String(menPct!.value));
      if (!isNaN(womenVal) && !isNaN(menVal)) {
        const sum = womenVal + menVal;
        if (Math.abs(sum - 100) > 0.01) {
          contradictions.push({
            field: 'company_profile.ownership_percentage',
            message: `Ownership percentages do not sum to 100: women=${womenVal}%, men=${menVal}% (sum=${sum}%).`,
            severity: 'high',
          });
        }
      }
    }
  }

  return contradictions;
}