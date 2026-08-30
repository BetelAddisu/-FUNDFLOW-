import { ScoringInput } from './types';
import config from '@/config/official-criteria.json';

export interface ExclusionResult {
  eligible: boolean | 'needs_review';
  exclusions: Array<{ id: string; status: 'confirmed' | 'pending'; triggered?: boolean; reason?: string }>;
}

export function checkEligibility(input: ScoringInput): ExclusionResult {
  const exclusions: ExclusionResult['exclusions'] = [];

  const e1 = config.exclusionFactors.find((e) => e.id === 'E1');
  if (e1) {
    const triggered = input.legally_registered_and_years === false;
    exclusions.push({
      id: 'E1',
      status: 'confirmed',
      triggered,
      reason: triggered ? 'Not legally registered or under 2 years old' : undefined,
    });
  }

  const e2 = config.exclusionFactors.find((e) => e.id === 'E2');
  if (e2) {
    const triggered = input.privately_owned === false;
    exclusions.push({
      id: 'E2',
      status: 'confirmed',
      triggered,
      reason: triggered ? 'State-owned (not privately owned)' : undefined,
    });
  }

  const e3 = config.exclusionFactors.find((e) => e.id === 'E3');
  if (e3) {
    exclusions.push({
      id: 'E3',
      status: 'pending',
      triggered: undefined,
    });
  }

  const anyTriggered = exclusions.some((ex) => ex.status === 'confirmed' && ex.triggered);
  if (anyTriggered) {
    return { eligible: false, exclusions };
  }

  if (e3) {
    return { eligible: 'needs_review', exclusions };
  }

  return { eligible: true, exclusions };
}