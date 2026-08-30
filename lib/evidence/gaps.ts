import { EvidenceField } from './types';

export interface Gap {
  field: string;
  message: string;
  action: string;
  severity: 'critical' | 'warning';
}

function isMissing(field: EvidenceField | undefined): boolean {
  if (!field) return true;
  if (field.state === 'not_established' || field.state === 'contradicted') return true;
  if (field.value === undefined || field.value === null || field.value === '') return true;
  if (Array.isArray(field.value) && field.value.length === 0) return true;
  return false;
}

function generateAction(fieldPath: string): string {
  const parts = fieldPath.split('.');
  const leaf = parts[parts.length - 1].replace(/\[\d+\]/g, '');
  return `Ask applicant to provide ${leaf.replace(/_/g, ' ')}.`;
}

const requiredArrayPaths = new Set([
  'company_overview.main_products_services',
  'management.core_management_team',
  'intervention_requested.requested_support_machinery',
  'intervention_requested.requested_support_consultants',
  'intervention_requested.job_creation.positions_table',
  'intervention_requested.priority_areas',
]);

export function findGaps(evidence: any, prefix = ''): Gap[] {
  const gaps: Gap[] = [];

  if (evidence === null || typeof evidence !== 'object') {
    return gaps;
  }

  if ('state' in evidence) {
    const field = evidence as EvidenceField;
    if (isMissing(field)) {
      gaps.push({
        field: prefix,
        message: `Field "${prefix}" is ${field.state || 'missing'}.`,
        action: generateAction(prefix),
        severity: 'critical',
      });
    }
    return gaps;
  }

  for (const key of Object.keys(evidence)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    const value = evidence[key];

    if (Array.isArray(value)) {
      if (value.length === 0 && requiredArrayPaths.has(newPrefix)) {
        gaps.push({
          field: newPrefix,
          message: `Field "${newPrefix}" is empty.`,
          action: `Ask applicant to provide at least one entry for ${newPrefix.split('.').pop()}.`,
          severity: 'critical',
        });
      } else {
        value.forEach((item: any, index: number) => {
          gaps.push(...findGaps(item, `${newPrefix}[${index}]`));
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      gaps.push(...findGaps(value, newPrefix));
    }
  }

  return gaps;
}