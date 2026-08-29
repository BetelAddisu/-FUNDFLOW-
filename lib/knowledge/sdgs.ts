/**
 * Static SDG reference knowledge. Used to draft *potential* alignment
 * notes from established impact information. Never certifies impact.
 */

export interface SdgDef {
  number: number;
  short: string;
  name: string;
  potentialSignals: string[];
}

export const SDGS: SdgDef[] = [
  {
    number: 1,
    short: "SDG 1",
    name: "No Poverty",
    potentialSignals: ["income", "poverty", "livelihood", "households", "wages"],
  },
  {
    number: 2,
    short: "SDG 2",
    name: "Zero Hunger",
    potentialSignals: ["food", "agriculture", "farm", "crop", "nutrition", "livestock"],
  },
  {
    number: 5,
    short: "SDG 5",
    name: "Gender Equality",
    potentialSignals: ["women", "female", "gender", "women-owned", "women employed"],
  },
  {
    number: 7,
    short: "SDG 7",
    name: "Affordable and Clean Energy",
    potentialSignals: ["energy", "solar", "renewable", "electric", "power"],
  },
  {
    number: 8,
    short: "SDG 8",
    name: "Decent Work and Economic Growth",
    potentialSignals: ["job", "jobs", "employment", "employee", "work", "economic growth", "growth"],
  },
  {
    number: 9,
    short: "SDG 9",
    name: "Industry, Innovation and Infrastructure",
    potentialSignals: ["industry", "manufacturing", "machinery", "innovation", "infrastructure", "technology"],
  },
  {
    number: 11,
    short: "SDG 11",
    name: "Sustainable Cities and Communities",
    potentialSignals: ["city", "urban", "housing", "construction", "transport"],
  },
  {
    number: 12,
    short: "SDG 12",
    name: "Responsible Consumption and Production",
    potentialSignals: ["recycl", "waste", "efficient", "sustainable production", "circular"],
  },
  {
    number: 13,
    short: "SDG 13",
    name: "Climate Action",
    potentialSignals: ["climate", "emission", "carbon", "greenhouse"],
  },
  {
    number: 14,
    short: "SDG 14",
    name: "Life Below Water",
    potentialSignals: ["fisher", "ocean", "marine", "aquaculture"],
  },
  {
    number: 15,
    short: "SDG 15",
    name: "Life on Land",
    potentialSignals: ["forest", "land", "biodiversity", "tree"],
  },
];

export interface SdgAlignmentDraft {
  sdg: string;
  name: string;
  reason: string;
  evidenceRef: string | null;
  status: "potential_alignment";
}

/**
 * Produce potential SDG alignment drafts from established application info.
 * Outputs are drafts for the reviewer, never verified impact.
 */
export function draftSdgAlignments(
  establishedSignals: Array<{ text: string; evidenceRef: string | null }>
): SdgAlignmentDraft[] {
  const hits: SdgAlignmentDraft[] = [];
  for (const sdg of SDGS) {
    const matched = establishedSignals.filter((s) =>
      sdg.potentialSignals.some((k) => s.text.toLowerCase().includes(k.toLowerCase()))
    );
    if (matched.length > 0) {
      hits.push({
        sdg: sdg.short,
        name: sdg.name,
        reason: `Application reports: ${matched.map((m) => m.text).slice(0, 3).join("; ")}.`,
        evidenceRef: matched[0]?.evidenceRef ?? null,
        status: "potential_alignment",
      });
    }
  }
  return hits;
}