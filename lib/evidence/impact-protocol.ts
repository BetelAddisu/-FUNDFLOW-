import { sdgs } from '@/lib/knowledge/sdgs';
import { Evidence } from './schema';

export interface SDGSuggestion {
  sdgId: number;
  title: string;
  reason: string;
  evidenceSource: string;
  alignmentStatus: 'potential_alignment';
}

export function generateSDGSuggestions(evidence: Partial<Evidence>): SDGSuggestion[] {
  const suggestions: SDGSuggestion[] = [];

  const sector = evidence.company_profile?.business_type?.value;
  const impactCategory = evidence.intervention_requested?.social_environmental_impact_osh?.value;

  if (typeof sector === 'string') {
    const sectorLower = sector.toLowerCase();
    for (const sdg of sdgs) {
      if (sdg.keywords.some((kw) => sectorLower.includes(kw))) {
        suggestions.push({
          sdgId: sdg.id,
          title: sdg.title,
          reason: `The business operates in a sector related to "${sdg.title}" (business type: ${sector}).`,
          evidenceSource: 'company_profile.business_type',
          alignmentStatus: 'potential_alignment',
        });
      }
    }
  }

  if (typeof impactCategory === 'string') {
    const impactLower = impactCategory.toLowerCase();
    if (impactLower.includes('green')) {
      suggestions.push({
        sdgId: 13,
        title: 'Climate Action',
        reason: 'The applicant reported a green business model.',
        evidenceSource: 'intervention_requested.social_environmental_impact_osh',
        alignmentStatus: 'potential_alignment',
      });
      suggestions.push({
        sdgId: 7,
        title: 'Affordable and Clean Energy',
        reason: 'Green business may involve clean energy.',
        evidenceSource: 'intervention_requested.social_environmental_impact_osh',
        alignmentStatus: 'potential_alignment',
      });
    } else if (impactLower.includes('social')) {
      suggestions.push({
        sdgId: 8,
        title: 'Decent Work and Economic Growth',
        reason: 'Positive social impact reported.',
        evidenceSource: 'intervention_requested.social_environmental_impact_osh',
        alignmentStatus: 'potential_alignment',
      });
    }
  }

  const unique = new Map<number, SDGSuggestion>();
  for (const s of suggestions) {
    if (!unique.has(s.sdgId)) {
      unique.set(s.sdgId, s);
    }
  }
  return Array.from(unique.values());
}