import { z } from 'zod';

const BandSchema = z.object({
  label: z.string(),
  points: z.number(),
  note: z.string().optional(),
});

const SubcriterionSchema = z.object({
  id: z.string(),
  name: z.string(),
  maxPoints: z.number(),
  bands: z.array(BandSchema).optional(),
  note: z.string().optional(),
});

const CriterionSchema = z.object({
  id: z.string(),
  name: z.string(),
  maxPoints: z.number(),
  subcriteria: z.array(SubcriterionSchema).optional(),
  bands: z.array(BandSchema).optional(),
  note: z.string().optional(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        maxPoints: z.number(),
        bands: z.array(BandSchema),
        note: z.string().optional(),
      })
    )
    .optional(),
});

const ExclusionFactorSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['confirmed', 'pending']),
  source: z.string().optional(),
});

const DeclarationSchema = z.object({
  id: z.string(),
  text_en: z.string(),
  text_am: z.string(),
  text_om: z.string(),
});

export const OfficialCriteriaSchema = z.object({
  version: z.string(),
  source: z.string(),
  totalPoints: z.number(),
  criteria: z.array(CriterionSchema),
  exclusionFactors: z.array(ExclusionFactorSchema),
  declarations: z.array(DeclarationSchema),
});

export type OfficialCriteria = z.infer<typeof OfficialCriteriaSchema>;