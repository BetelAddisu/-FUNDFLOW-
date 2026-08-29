# FundFlow — Source Status

This file records which challenge rules are confirmed from official source
material and which remain pending. FundFlow never invents pending rules.

## CONFIRMED

- Application form fields supplied by challenge source
  (company profile, overview, growth indicators, products, raw-material
  sourcing, management, intervention request, job creation, impact/OSH).
- Evaluation grid C1–C9 values supplied (totals 100):
  - C1 Success story 10, C2 Uniqueness 5, C3 Market served 5,
    C4 Supply chain 5, C5 Ownership/demography 15,
    C6 Expected result 20, C7 Job creation potential 25,
    C8 Management capacity 5, C9 Social/environmental impact 10.
- Supplied grids:
  - C1a sales growth `>50% = 5`, `25–50% = 3`, `0–24% = 0`
  - C1b employment `>20 = 5`, `11–20 = 3`, `6–10 = 1`, `0–5 = 0`
  - C2 USP `5/3/2/1`
  - C3 market `5/3/2`
  - C4 sourcing `>=75% = 5`, `40–74% = 3`, `20–39% = 1`, `<20% = 0`
  - C5.1 ownership `5/3/0`
  - C5.2 women employees `>50 = 5`, `41–50 = 4`, `30–40 = 3`, `1–29 = 2`, `0 = 0`
  - C5.3 youth employees same bands as C5.2
  - C6 expected results `3 = 20`, `2 = 15`, `1 = 10`
  - C7a employability `>400 = 25`, `300–399 = 20`, `200–299 = 15`
  - C7b investment readiness `>=25 = 25`, `20–24 = 15`, `15–19 = 5`
  - C8 management `4+ = 5`, `3 = 3`, `2 = 0`
  - C9 impact `green = 10`, `both = 8`, `either = 5`, `neither = 0`
- Eligibility E1/E2 supplied: legally registered; SME or parent organization
  more than two years old.
- C9 green-business examples (reference list supplied).

## PENDING

- Third exclusion factor (exact wording).
- Official declaration text.
- C7a/C7b routing rule — prototype computes and displays both variants,
  routing decision stays `pending`.
- C1 sales-growth band between `<24%` and `25–50%` (24–25% → `needs_review`).
- C6 band for zero/unresolved expected results (→ `needs_review`).
- C8 bands for 0 and 1 management members (→ `needs_review`).
- C7a band below 200 jobs (→ `needs_review`).
- C7b band below 15 (→ `needs_review`).

## Where each value lives

| Item | Location |
|---|---|
| Official grid + eligibility | `config/official-criteria.json` |
| Score derivation rules | `lib/rules/scoring.ts` |
| Evidence / provenance | `lib/evidence/*` |
| Knowledge for explanations | `lib/knowledge/*` |