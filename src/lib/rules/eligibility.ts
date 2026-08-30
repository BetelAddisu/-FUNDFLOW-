import { ScoringInput, ExclusionResult } from './types';
import { loadOfficialCriteria } from '@/config';

export function checkEligibility(input: ScoringInput): { eligible: boolean; needsReview: boolean; exclusions: ExclusionResult[] } {
  const criteria = loadOfficialCriteria();
  const exclusions: ExclusionResult[] = [];
  let needsReview = false;

  // E1: Not legally registered / SME or parent org under 2 years old
  const e1 = criteria.exclusionFactors.find(f => f.id === 'E1');
  if (e1 && e1.status === 'confirmed') {
    const triggered = input.legally_registered_and_years === false;
    exclusions.push({
      id: 'E1',
      name: e1.name,
      triggered,
      reason: triggered ? 'Not legally registered or SME/parent organization under 2 years old' : undefined,
    });
    if (triggered) {
      return { eligible: false, needsReview: false, exclusions };
    }
  }

  // E2: State-owned (not privately owned)
  const e2 = criteria.exclusionFactors.find(f => f.id === 'E2');
  if (e2 && e2.status === 'confirmed') {
    const triggered = input.privately_owned === false;
    exclusions.push({
      id: 'E2',
      name: e2.name,
      triggered,
      reason: triggered ? 'State-owned (not privately owned)' : undefined,
    });
    if (triggered) {
      return { eligible: false, needsReview: false, exclusions };
    }
  }

  // E3: Third exclusion factor (pending)
  const e3 = criteria.exclusionFactors.find(f => f.id === 'E3');
  if (e3 && e3.status === 'pending') {
    exclusions.push({
      id: 'E3',
      name: e3.name,
      triggered: false,
      reason: 'Pending confirmation from challenge owner',
    });
    needsReview = true;
  }

  return { eligible: true, needsReview, exclusions };
}