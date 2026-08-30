import { EvidenceRecord, Contradiction } from './types';
import { REQUIRED_FIELDS } from './schema';

export class ContradictionEngine {
  // Check for contradictions in evidence
  findContradictions(evidence: EvidenceRecord): Contradiction[] {
    const contradictions: Contradiction[] = [];

    // 1. Check ownership percentages sum to 100
    const womenPct = evidence['ownership_percentage_women']?.value;
    const menPct = evidence['ownership_percentage_men']?.value;
    
    if (womenPct !== undefined && menPct !== undefined) {
      const women = Number(womenPct);
      const men = Number(menPct);
      if (!isNaN(women) && !isNaN(men)) {
        const sum = women + men;
        if (Math.abs(sum - 100) > 0.01) {
          contradictions.push({
            fieldKey: 'ownership_percentage_women',
            fieldName: 'Ownership Percentage (Women/Men)',
            message: `Ownership percentages do not sum to 100%: women=${women}%, men=${men}% (sum=${sum}%)`,
            severity: 'high',
            conflictingValues: [women, men],
          });
        }
      }
    }

    // 2. Check years in operation vs license date (if available)
    const yearsInOp = evidence['years_in_operation']?.value;
    // Note: license_issue_date would need to be added to schema for full check

    // 3. Check growth indicator consistency (sales shouldn't drop dramatically without explanation)
    const salesFields = ['sales_etb_2022', 'sales_etb_2023', 'sales_etb_2024'] as const;
    const salesValues = salesFields.map(f => Number(evidence[f]?.value)).filter(v => !isNaN(v));
    if (salesValues.length >= 2) {
      for (let i = 1; i < salesValues.length; i++) {
        const prev = salesValues[i - 1];
        const curr = salesValues[i];
        if (prev > 0 && curr < prev * 0.5) {
          // Sales dropped more than 50% year over year
          contradictions.push({
            fieldKey: salesFields[i],
            fieldName: `Sales ETB ${salesFields[i].replace('sales_etb_', '')}`,
            message: `Significant sales drop detected: ${prev} → ${curr} (${((curr/prev)*100).toFixed(1)}% of previous year)`,
            severity: 'medium',
            conflictingValues: [prev, curr],
          });
        }
      }
    }

    // 4. Check employee count consistency
    const empFields = ['total_employees_2022', 'total_employees_2023', 'total_employees_2024'] as const;
    const empValues = empFields.map(f => Number(evidence[f]?.value)).filter(v => !isNaN(v));
    if (empValues.length >= 2) {
      for (let i = 1; i < empValues.length; i++) {
        const prev = empValues[i - 1];
        const curr = empValues[i];
        if (curr > prev * 3) {
          // Employee count more than tripled
          contradictions.push({
            fieldKey: empFields[i],
            fieldName: `Total Employees ${empFields[i].replace('total_employees_', '')}`,
            message: `Unusual employee growth: ${prev} → ${curr} (${((curr/prev)*100).toFixed(1)}% increase)`,
            severity: 'medium',
            conflictingValues: [prev, curr],
          });
        }
      }
    }

    // 5. Check female employees <= total employees
    for (const year of ['2022', '2023', '2024', '2025_projection', '2026_projection'] as const) {
      const female = Number(evidence[`female_employees_${year}`]?.value);
      const total = Number(evidence[`total_employees_${year}`]?.value);
      if (!isNaN(female) && !isNaN(total) && female > total) {
        contradictions.push({
          fieldKey: `female_employees_${year}`,
          fieldName: `Female Employees ${year}`,
          message: `Female employees (${female}) cannot exceed total employees (${total})`,
          severity: 'high',
          conflictingValues: [female, total],
        });
      }
    }

    // 6. Check youth employees <= total employees
    for (const year of ['2022', '2023', '2024', '2025_projection', '2026_projection'] as const) {
      const youth = Number(evidence[`youth_employees_18_24_${year}`]?.value);
      const total = Number(evidence[`total_employees_${year}`]?.value);
      if (!isNaN(youth) && !isNaN(total) && youth > total) {
        contradictions.push({
          fieldKey: `youth_employees_18_24_${year}`,
          fieldName: `Youth Employees (18-24) ${year}`,
          message: `Youth employees (${youth}) cannot exceed total employees (${total})`,
          severity: 'high',
          conflictingValues: [youth, total],
        });
      }
    }

    return contradictions;
  }

  // Check for contradictions between new input and existing evidence
  checkNewInputContradictions(newValues: Record<string, any>, existingEvidence: EvidenceRecord): Contradiction[] {
    const contradictions: Contradiction[] = [];

    for (const [fieldKey, newValue] of Object.entries(newValues)) {
      const existing = existingEvidence[fieldKey];
      if (existing && existing.value !== undefined && existing.value !== null && existing.value !== '') {
        const existingStr = String(existing.value).trim().toLowerCase();
        const newStr = String(newValue).trim().toLowerCase();
        
        if (existingStr !== newStr) {
          // Check if it's a numeric field
          const existingNum = Number(existing.value);
          const newNum = Number(newValue);
          
          if (!isNaN(existingNum) && !isNaN(newNum)) {
            const diff = Math.abs(existingNum - newNum);
            const avg = (existingNum + newNum) / 2;
            if (avg > 0 && (diff / avg) > 0.1) { // More than 10% difference
              contradictions.push({
                fieldKey,
                fieldName: fieldKey,
                message: `Value changed from ${existing.value} to ${newValue} (${((diff/avg)*100).toFixed(1)}% difference)`,
                severity: diff / avg > 0.5 ? 'high' : 'medium',
                conflictingValues: [existing.value, newValue],
              });
            }
          } else if (existingStr !== newStr) {
            // Text field contradiction
            contradictions.push({
              fieldKey,
              fieldName: fieldKey,
              message: `Conflicting text values: "${existing.value}" vs "${newValue}"`,
              severity: 'medium',
              conflictingValues: [existing.value, newValue],
            });
          }
        }
      }
    }

    return contradictions;
  }
}

export const contradictionEngine = new ContradictionEngine();