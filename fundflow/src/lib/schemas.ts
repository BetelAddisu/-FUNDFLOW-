import { z } from 'zod';

export const BandSchema = z.object({
  label: z.string(),
  points: z.number().int().nonnegative(),
});

export const SubcriterionSchema = z.object({
  id: z.string(),
  name: z.string(),
  maxPoints: z.number().int().positive(),
  bands: z.array(BandSchema).min(1),
  note: z.string().optional(),
});

export const CriterionSchema = z.object({
  id: z.string(),
  name: z.string(),
  maxPoints: z.number().int().positive(),
  bands: z.array(BandSchema).optional(),
  subcriteria: z.array(SubcriterionSchema).optional(),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    maxPoints: z.number().int().positive(),
    bands: z.array(BandSchema).min(1),
    note: z.string().optional(),
  })).optional(),
  note: z.string().optional(),
}).refine(
  (c) => (c.bands && c.bands.length > 0) || (c.subcriteria && c.subcriteria.length > 0) || (c.variants && c.variants.length > 0),
  { message: 'Criterion must have bands, subcriteria, or variants' }
);

export const ExclusionFactorSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['confirmed', 'pending']),
  source: z.string().optional(),
});

export const DeclarationSchema = z.object({
  id: z.string(),
  text_en: z.string(),
  text_am: z.string(),
  text_om: z.string(),
});

export const OfficialCriteriaSchema = z.object({
  version: z.string(),
  source: z.string(),
  totalPoints: z.number().int().positive(),
  criteria: z.array(CriterionSchema).min(1),
  exclusionFactors: z.array(ExclusionFactorSchema).min(1),
  declarations: z.array(DeclarationSchema).length(3),
});

export type Band = z.infer<typeof BandSchema>;
export type Subcriterion = z.infer<typeof SubcriterionSchema>;
export type Criterion = z.infer<typeof CriterionSchema>;
export type ExclusionFactor = z.infer<typeof ExclusionFactorSchema>;
export type Declaration = z.infer<typeof DeclarationSchema>;
export type OfficialCriteria = z.infer<typeof OfficialCriteriaSchema>;

export const ChannelInputSchema = z.object({
  sessionId: z.string().uuid(),
  channel: z.enum(['web', 'telegram']),
  userId: z.string(),
  language: z.enum(['en', 'am', 'om']),
  input: z.union([
    z.object({ type: z.literal('text'), content: z.string() }),
    z.object({ type: z.literal('voice'), audioUrl: z.string().url(), durationSec: z.number().positive() }),
    z.object({ type: z.literal('photo'), imageUrl: z.string().url(), caption: z.string().optional() }),
  ]),
  timestamp: z.string().datetime(),
});

export type ChannelInput = z.infer<typeof ChannelInputSchema>;

export const EvidenceStateSchema = z.enum([
  'self_reported',
  'document_supported',
  'visually_observed',
  'verified',
  'not_established',
  'contradicted',
]);

export type EvidenceState = z.infer<typeof EvidenceStateSchema>;

export const EvidenceValueSchema = z.object({
  value: z.unknown(),
  state: EvidenceStateSchema,
  confidence: z.number().min(0).max(1),
  sourceTurnIds: z.array(z.string().uuid()).optional(),
  contradictionNote: z.string().optional(),
});

export type EvidenceValue = z.infer<typeof EvidenceValueSchema>;

export const LanguageSchema = z.enum(['en', 'am', 'om']);
export type Language = z.infer<typeof LanguageSchema>;

export const SessionStatusSchema = z.enum(['active', 'completed', 'abandoned', 'submitted']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;