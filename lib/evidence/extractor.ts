/**
 * Extraction Agent — turns conversation turns (and legible document
 * observations) into field-level evidence updates.
 *
 * The extractor never scores, ranks, or decides eligibility. It preserves
 * precision/uncertainty, keeps separate values when contradicting evidence
 * arrives, and never invents missing values.
 */
import type { Application } from "@/lib/db/schema";
import type {
  EvidenceField,
  EvidenceMap,
  EvidenceRef,
  Precision,
} from "@/lib/evidence/types";
import { makeEvidenceField } from "@/lib/evidence/types";

export interface ExtractResult {
  application: Application;
  evidence: EvidenceMap;
  applied: Array<{ field: string; status: string; note: string }>;
}

export interface ExtractionInput {
  text: string;
  language: "en" | "am" | "om" | "unknown";
  evidenceRef: EvidenceRef;
  /** Optional document-derived observations (business license photo etc). */
  documentExtractions?: Array<{ field: string; value: string; source: "document_supported" }>;
  /** Existing app + evidence to merge into. */
  currentApplication: Application;
  currentEvidence: EvidenceMap;
}

const APPROX = /(about|around|approximately|roughly|near|almost|cerca de|±|\+\/-|~)/i;
const RANGE = /(between)\s+(\d+(?:\.\d+)?)\s+(?:and|-|to)\s+(\d+(?:\.\d+)?)/i;

function precisionOf(text: string): Precision {
  if (RANGE.test(text)) return "range";
  if (APPROX.test(text)) return "approximate";
  return "exact";
}

function numFromText(text: string): number | null {
  const m = text.replace(/,/g, "").match(/[-+]?\d+(?:\.\d+)?/);
  if (!m) return null;
  const v = parseFloat(m[0]);
  return Number.isFinite(v) ? v : null;
}

function percentFromText(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

function parseRange(text: string): [number, number] | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:-|to|and)\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2])];
}

const NAV_ORDER = ["2022", "2023", "2024", "2025_projection", "2026_projection"];

/** Guess which growth year a sales/employee sentence refers to. */
function inferYear(text: string): string | null {
  const m = text.match(/(20\d{2})/);
  if (!m) return null;
  const y = m[1];
  if (NAV_ORDER.includes(y) && !y.includes("_projection")) return y;
  return null;
}

/**
 * Write a value into the canonical application structure at a dotted path
 * (e.g. "growth.2024.sales_etb"). Index segments like "products.rows[0]"
 * are not handled here — callers mutate those directly.
 */
function setPathValue(root: Record<string, unknown>, field: string, value: unknown): void {
  const segments = field.split(".");
  let cursor: Record<string, unknown> = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const current = cursor[seg];
    if (current === null || current === undefined || typeof current !== "object") {
      cursor[seg] = {};
    }
    cursor = cursor[seg] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1]] = value;
}

/** Apply a single evidence field using "contradiction-preserving" merge. */
function applyField(
  app: Application,
  evidence: EvidenceMap,
  field: string,
  value: unknown,
  source: EvidenceField["source"],
  precision: Precision,
  ref: EvidenceRef,
  language: "en" | "am" | "om" | "unknown",
  confidence: number
): EvidenceField {
  const existing: EvidenceField | undefined = evidence[field];
  const sameValue =
    existing?.value !== null &&
    existing?.value !== undefined &&
    value !== null &&
    value !== undefined &&
    String(existing.value) === String(value);

  if (existing && existing.status === "established" && !sameValue) {
    const contradiction: EvidenceField = {
      ...makeEvidenceField(field, null, {
        status: "contradicted",
        source: existing.source,
        confidence: null,
        precision: "unknown",
        language,
      }),
      values: [
        { ...existing, field },
        {
          field,
          value: value as typeof existing.value,
          source,
          status: "established" as const,
          confidence,
          precision,
          evidenceRef: ref,
          language,
          updatedAt: new Date().toISOString(),
        },
      ],
      reason: "Conflicting statements recorded; not auto-resolved.",
    };
    evidence[field] = contradiction;
    return contradiction;
  }
  const update = makeEvidenceField(field, value, {
    source,
    status: value === null || value === undefined ? "not_established" : "established",
    precision,
    evidenceRef: ref,
    language,
    confidence: value === null || value === undefined ? null : confidence,
  });
  evidence[field] = update;
  return update;
}

export function extractFromTurn(input: ExtractionInput): ExtractResult {
  const { text, language, evidenceRef, currentApplication, currentEvidence, documentExtractions } = input;
  const app: Application = structuredClone(currentApplication);
  const evidence: EvidenceMap = structuredClone(currentEvidence);

  const applied: ExtractResult["applied"] = [];
  const apply = (
    field: string,
    value: unknown,
    source: EvidenceField["source"],
    precision: Precision,
    confidence: number,
    ref: EvidenceRef = evidenceRef
  ) => {
    const f = applyField(app, evidence, field, value, source, precision, ref, language, confidence);
    if (f.status !== "contradicted") {
      setPathValue(app as unknown as Record<string, unknown>, field, value);
    }
    applied.push({ field, status: f.status, note: String(value ?? "(no value)") });
    return f;
  };

  const lower = text.toLowerCase();
  const has = (...tokens: string[]) => tokens.some((t) => lower.includes(t));

  // --- Photo / document contributions first ---
  for (const doc of documentExtractions ?? []) {
    apply(doc.field, doc.value, "document_supported", "exact", 0.95, evidenceRef);
  }

  // --- Company name (independent of intro phrasing so "Selam Logistics
  // runs..." and "Kebede Family Farm PLC is..." are captured too) ---
  if (!app.company_profile.company_name) {
    const nameEnd = /(?:[,.;—-]|\s+which\b|\s+that\b|\s+who\b|\s+we\b|\s+it\b|\s+located\b|\s+based\b|\s+\(|$)/i;
    const nameChar = "[A-Za-z0-9&'.\\- ]";
    const patterns = [
      new RegExp(`(?:called|named|name is|company name is)\\s+["']?(${nameChar}+?)${nameEnd.source}`, "i"),
      new RegExp(`(?:our company|our name|our business)\\s+(?:is|are)\\s+["']?(${nameChar}+?)${nameEnd.source}`, "i"),
      new RegExp(`we are\\s+([A-Z]${nameChar}+?)${nameEnd.source}`, "i"),
      new RegExp(`^([A-Z]${nameChar}+?)\\s+(?:runs|is|manufactures|produces|makes|provides|sells|repairs|operates|distribut)`, "i"),
      new RegExp(`([A-Z]${nameChar}+(?:Plc|PLC|Ltd|LLC|SC|Share Company|Trading|Manufacturing|Enterprise|Cooperative|Limited))`),
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (!m) continue;
      const name = m[1].trim().replace(/[.,]$/, "");
      // Ignore phrases that clearly are not a company name.
      if (
        name.length >= 3 &&
        !/^(we are|our company|our business|it is|i am)$/i.test(name) &&
        !/\b(one of|some of|most of|all of|none of|the)\b/i.test(name) &&
        !/^[a-z]/.test(name)
      ) {
        apply("company_profile.company_name", name.replace(/\s+/g, " "), "self_reported", "exact", 0.85);
        break;
      }
    }
  }

  // --- Company intro/overview ---
  if (has("we are", "we're", "i am", "our company", "i run", "we manufacture", "we produce", "we provide", "we sell", "we make", "company name", "called")) {
    if (!app.company_overview.company_overview && text.length > 15) {
      apply("company_overview.company_overview", text.trim(), "self_reported", precisionOf(text), 0.7);
    }
  }

  // --- Business type (independent of intro phrasing) ---
  if (!app.company_profile.business_type) {
    const typeMap: Array<[RegExp, string]> = [
      [/manufacture|produce|factory|production|ceramic|textile|metal works|fabrication/i, "Manufacturing"],
      [/trade|import|export|wholesale|retail|trading/i, "Trading"],
      [/service|consult|repair|cleaning|logistics|transport|salon|beauty|hair/i, "Service"],
      [/farm|agriculture|crop|livestock|poultry/i, "Agriculture"],
      [/energy|solar|installation/i, "Technology/Energy"],
    ];
    for (const [re, t] of typeMap) {
      if (re.test(text)) {
        apply("company_profile.business_type", t, "self_reported", "exact", 0.8);
        break;
      }
    }
  }

  // --- Registration number ---
  // Capture any code-like token after "registration number".
  const regMatch = text.match(/registration\s+number\s*(?:is|:|=)?\s*([A-Za-z0-9][A-Za-z0-9\-/._]*)/i) ||
    text.match(/reg(?:istration)?\.?\s*(?:number|no\.?)?\s*(?:is|:|=)?\s*([A-Za-z0-9][A-Za-z0-9\-/._]*)/i) ||
    text.match(/license\s*(?:number|no\.?)?\s*(?:is|:|=)?\s*([A-Za-z0-9][A-Za-z0-9\-/._]*)/i);
  if (regMatch && !app.company_profile.business_registration_number) {
    const regCode = regMatch[1].replace(/[.。]$/, "");
    if (regCode && regCode !== "is" && regCode !== "and" && regCode.length >= 4) {
      apply("company_profile.business_registration_number", regCode, "self_reported", "exact", 0.85);
    }
  }

  // --- Years in operation / start year ---
  if (has("years", "year old", "started", "began", "operating since", "since", "founded", "established", "operating for")) {
    const startYearMatch =
      text.match(/(?:started|began|founded|established|operating\s+since|since|we\s+started|established\s+in)\s+(?:in\s+)?((?:19|20)\d{2})/i) ??
      text.match(/((?:19|20)\d{2})\s*(?:\.|,|;|\)|\)\.|\s)/);
    const startKw = has("since", "started", "began", "established", "founded");
    if (startYearMatch && startKw) {
      const startYear = parseInt(startYearMatch[1], 10);
      if (startYear > 1980 && startYear <= new Date().getFullYear()) {
        apply("company_profile.years_in_operation", new Date().getFullYear() - startYear, "self_reported", "approximate", 0.8);
      }
    } else {
      const years = numFromText(text.replace(/(19|20)\d{2}/g, ""));
      if (years !== null && has("year", "years") && !has("employees", "staff", "workers") && years > 0 && years < 60) {
        apply("company_profile.years_in_operation", Math.round(years), "self_reported", precisionOf(text.replace(/(19|20)\d{2}/g, "")), 0.8);
      }
    }
  }

  // --- Ownership percentages ---
  const femaleMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%\s*(?:by\s+)?(women|female)/gi)];
  const maleMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%\s*(?:by\s+)?(men|male)/gi)];
  const ownedByWomen = text.match(/(?:owned|held)\s+(\d+(?:\.\d+)?)\s*%\s*by\s+women/i);
  const ownedByMen = text.match(/(?:owned|held)\s+(\d+(?:\.\d+)?)\s*%\s*by\s+men/i);
  const womenOwn = femaleMatches.length > 0
    ? parseFloat(femaleMatches[0][1])
    : ownedByWomen ? parseFloat(ownedByWomen[1]) : null;
  const menOwn = maleMatches.length > 0
    ? parseFloat(maleMatches[0][1])
    : ownedByMen ? parseFloat(ownedByMen[1]) : null;
  if (has("women", "owned", "percent", "%") && (womenOwn !== null || menOwn !== null)) {
    if (womenOwn !== null && (app.company_profile.ownership_percentage?.women_pct === null || app.company_profile.ownership_percentage?.women_pct === undefined)) {
      apply("company_profile.ownership_percentage.women_pct", womenOwn, "self_reported", precisionOf(text), 0.8);
    }
    if (menOwn !== null && (app.company_profile.ownership_percentage?.men_pct === null || app.company_profile.ownership_percentage?.men_pct === undefined)) {
      apply("company_profile.ownership_percentage.men_pct", menOwn, "self_reported", precisionOf(text), 0.8);
    }
  } else if (has("100% women", "fully women-owned", "women owned", "women-owned") && (app.company_profile.ownership_percentage?.women_pct === null || app.company_profile.ownership_percentage?.women_pct === undefined)) {
    apply("company_profile.ownership_percentage.women_pct", 100, "self_reported", "exact", 0.8);
  } else if (has("100% men", "fully men-owned", "men owned") && (app.company_profile.ownership_percentage?.men_pct === null || app.company_profile.ownership_percentage?.men_pct === undefined)) {
    apply("company_profile.ownership_percentage.men_pct", 100, "self_reported", "exact", 0.8);
  }

  // --- Growth indicators ---
  // Sales: sentence-level extraction. One sales figure per sentence is
  // typical; the closest year token anchors the target year. Handles:
  // "in 2024 our sales were 3 million", "2023 they were 8 million",
  // "9 million birr in 2024 sales".
  const UNIT_SCALE: Record<string, number> = { million: 1_000_000, thousand: 1_000, m: 1_000_000, k: 1_000 };
  const salesSuite = /(?:sales|revenue|turnover)/i;
  const applySales = (value: number, targetYear: string, src: string) => {
    if (!["2022", "2023", "2024"].includes(targetYear)) return;
    // Always apply — applyField turns a conflicting second value into a
    // contradiction instead of silently keeping the latest number.
    apply(`growth.${targetYear}.sales_etb`, value, "self_reported", precisionOf(src), 0.75);
  };
  if (salesSuite.test(text)) {
    // figure arrays: [full, number, unit] for figOnly; [full, year, number, unit] for yrLead.
    const valueOf = (num: string, unitTok: string) => {
      const u = unitTok.toLowerCase();
      return UNIT_SCALE[u] ? parseFloat(num.replace(/,/g, "")) * UNIT_SCALE[u] : parseFloat(num.replace(/,/g, ""));
    };
    const sentences = text.split(/(?<=[.;!?])\s+|(?<=;)\s+/).filter(Boolean);
    for (const sent of sentences) {
      if (!salesSuite.test(sent)) continue;
      const yrLead = [...sent.matchAll(/((?:19|20)\d{2})[^0-9]{0,40}?(\d[\d.,]*)\s*(million|thousand|[mk])\b/gi)];
      if (yrLead.length > 0) {
        for (const m of yrLead) applySales(valueOf(m[2], m[3] ?? ""), m[1], sent);
        continue;
      }
      // figure "birr" then an explicit year then the sales word
      const figThenYear = sent.match(/(\d[\d.,]*)\s*(million|thousand|[mk])?\s*(?:birr|ETB)?[^0-9]{0,24}?((?:19|20)\d{2})\s*(?:sales|revenue|turnover)\b/i);
      if (figThenYear) {
        applySales(valueOf(figThenYear[1], figThenYear[2] ?? ""), figThenYear[3], sent);
        continue;
      }
      const figOnly = sent.match(/(\d[\d.,]*)\s*(million|thousand|[mk])\b/i);
      if (figOnly) {
        const yearToken = sent.match(/((?:19|20)\d{2})/);
        const y = yearToken ? yearToken[1] : /last\s+year/i.test(sent) ? "2024" : "2024";
        applySales(valueOf(figOnly[1], figOnly[2] ?? ""), y, sent);
      }
    }
  }

  // --- Ethiopic-script pass (Amharic/Oromo) ---
  if (/[\u1200-\u137F]/.test(text)) {
    // Company name in Amharic: "ስማችን X ነው" (our name is X), "የእኔ ስራ X ነው" (my business is X).
    if (!app.company_profile.company_name) {
      const amName = text.match(/(?:ስማችን|ስሜ|ስሙ)\s+([\u1200-\u137F][\u1200-\u137F\s0-9&'.-]{2,60}?)\s*ነው/);
      const amBiz = text.match(/(?:የእኔ ስራ|ስራችን|የእኛ ስራ)\s+([\u1200-\u137F][\u1200-\u137F\s0-9&'.-]{2,60}?)\s*ነው/);
      const amMatch = amName ?? amBiz;
      if (amMatch) {
        const nm = amMatch[1].trim();
        if (nm.length >= 3 && !/^(ነው|ነ።)$/.test(nm)) {
          apply("company_profile.company_name", nm.replace(/\s+/g, " "), "self_reported", "exact", 0.85);
        }
      }
    }
  }
  if (/[\u1200-\u137F]/.test(text) && /\d/.test(text)) {
    const amUnit: Record<string, number> = { ሚሊዮን: 1_000_000, ሚልዮን: 1_000_000, ሺህ: 1_000, ሺ: 1_000 };
    // Sales/revenue equivalents used in fixtures: ሽያጭ (sales), ገቢ (income).
    const amSalesWord = /ሽያጭ|ገቢ|ገቢዬ|ሽያጮች/.test(text);
    if (amSalesWord) {
      for (const seg of text.split(/[።.!?]/)) {
        const figure = seg.match(/(\d[\d.,]*)\s*(ሚሊዮን|ሚልዮን|ሺህ|ሺ)/);
        const year = seg.match(/((?:19|20)\d{2})/);
        if (figure && year) {
          const u = amUnit[figure[2]] ?? 1;
          const v = parseFloat(figure[1].replace(/,/g, "")) * u;
          if (Number.isFinite(v)) applySales(v, year[1], seg);
        }
      }
    }
    // "N አዳዲስ ስራዎች" (N new jobs) or "N ተጨማሪ ሰራተኞች" (N more employees),
    // only when job-creation intent (እናቅዳለን/መፍጠር/መቅጠር/እፈልጋለሁ) is present.
    const amPlansToCreate = /መፍጠር|እናቅዳለን|እናቅዳለን|መቅጠር|እፈልጋለሁ/.test(text);
    const amJobs = text.match(/(\d[\d.,]*)\s*(?:አዳዲስ|አዲስ|ተጨማሪ)?\s*(?:ስራ|ስራዎች|ሰራተኞች|ሰራተኛ)/i);
    if (amJobs && amPlansToCreate) {
      const num = Math.round(parseFloat(amJobs[1].replace(/,/g, "")));
      apply("job_creation.projected_new_jobs", num, "self_reported", precisionOf(text), 0.7);
    }
    const amStaff = text.match(/(\d[\d.,]*)\s*(ሰራተኞች|ሰራተኛ|ሰራተኞቻችን|ሰራተኞቼ)/i);
    if (amStaff && (app.growth["2024"]?.total_employees === null || app.growth["2024"]?.total_employees === undefined)) {
      apply("growth.2024.total_employees", Math.round(parseFloat(amStaff[1].replace(/,/g, ""))), "self_reported", precisionOf(text), 0.7);
    }
    const amWomen = text.match(/(\d[\d.,]*)\s*(?:የሴቶች|ሴቶች|ሴት)/i);
    if (amWomen) {
      apply("growth.2024.female_employees", Math.round(parseFloat(amWomen[1].replace(/,/g, ""))), "self_reported", precisionOf(text), 0.7);
    }
  }

  // Youth/age range capture: "40 workers aged between 18 and 24", "aged 18-24".
  if ((app.growth["2024"]?.youth_employees_18_24 === null || app.growth["2024"]?.youth_employees_18_24 === undefined) &&
      /aged?\s+(?:between\s+)?(?:1[6-9]|2[0-9])\s*(?:and|to|-|–)\s*(?:2[0-9]|3[0-5])/i.test(text)) {
    // "N workers aged between 18 and 24" or "7 of our staff are aged 18-24"
    // — the count precedes the people term.
    const ageCount =
      text.match(/(\d[\d.,]*)\s*(?:workers|employees|staff|people|of\s+our\s+staff|of\s+them)\s+(?:are\s+|is\s+)?aged\b/i) ??
      text.match(/(\d[\d.,]*)\s+(?:of\s+our\s+)?(?:staff|workers|people|employees)\s+are\s+aged\b/i) ??
      text.match(/(\d[\d.,]*)\s+(?:aged|years?)\b/i);
    if (ageCount) {
      apply("growth.2024.youth_employees_18_24", Math.round(parseFloat(ageCount[1].replace(/,/g, ""))), "self_reported", precisionOf(text), 0.75);
    }
  }

  // Year-anchored headcount: "In 2023 we had 130 employees" → growth.2023,
// "in 2024 we employ 40 people" → growth.2024.
  {
    const yearCounts = [
      ...text.matchAll(/(?:in\s+)?(20\d{2})\s+[^.!?;]*?(\d[\d.,]*)\s*(employees|staff|workers|people)/gi),
      ...text.matchAll(/(?:we\s+)?had\s+(\d[\d.,]*)\s*(employees|staff|workers|people)\s+(?:in|by)\s+(20\d{2})/gi),
    ];
    for (const m of yearCounts) {
      const yearLead = /^\d{4}$/.test(m[1] ?? "") && (m[2] ?? "").length > 0;
      const year = yearLead ? m[1] : m[4];
      const num = Math.round(parseFloat((yearLead ? m[2] : m[1]).replace(/,/g, "")));
      const row = app.growth[year as keyof typeof app.growth];
      if (row && (row.total_employees === null || row.total_employees === undefined) && Number.isFinite(num)) {
        apply(`growth.${year}.total_employees`, num, "self_reported", precisionOf(text), 0.75);
      }
    }
  }

  // Employees: total + female + youth handled independently so a single
  // sentence like "25 employees, 12 women, 10 youth" fills all three.
  const employeesKeywords = has("employees", "staff", "workers", "people", "headcount");
  if (employeesKeywords) {
    // Strip year tokens so "in 2023 we had 35 people" doesn't yield 2023.
    const totalEmps = numFromText(text.replace(/\b(19|20)\d{2}\b/g, ""));
    const numBearer = (): Array<[string, number]> => {
      // "12 of them are women" | "12 are women" | "80 of them women" | "10 women"
      const out: Array<[string, number]> = [];
      const mw = text.match(/(\d[\d.,]*)\s*(?:of\s+them\s+|of\s+our\s+)?(?:(?:are|is)\s+)?(women|female)\b/i);
      if (mw) out.push([mw[2].toLowerCase().startsWith("w") ? "female" : "female", Math.round(parseFloat(mw[1].replace(/,/g, "")))]);
      const my = text.match(/(\d[\d.,]*)\s*(?:of\s+them\s+|of\s+our\s+)?(?:(?:are|is)\s+)?(youth|young(?: people)?|aged)/i);
      if (my) out.push(["youth", Math.round(parseFloat(my[1].replace(/,/g, "")))]);
      return out;
    };
    const row2024 = app.growth["2024"];
    for (const [kind, count] of numBearer()) {
      if (kind === "female" && (row2024?.female_employees === null || row2024?.female_employees === undefined)) {
        apply("growth.2024.female_employees", count, "self_reported", precisionOf(text), 0.75);
      } else if (kind === "youth" && (row2024?.youth_employees_18_24 === null || row2024?.youth_employees_18_24 === undefined)) {
        apply("growth.2024.youth_employees_18_24", count, "self_reported", precisionOf(text), 0.75);
      }
    }
    if (totalEmps !== null && (row2024?.total_employees === null || row2024?.total_employees === undefined)) {
      const targetYear = "2024";
      const row = app.growth[targetYear as keyof typeof app.growth];
      if (row?.total_employees === null || row?.total_employees === undefined)
        apply(`growth.${targetYear}.total_employees`, Math.round(totalEmps), "self_reported", precisionOf(text), 0.75);
    }
  }

  // --- Market served ---
  if (has("sell", "market", "customer", "export", "import", "local")) {
    if (!app.products.rows.find((r) => r.market_served)) {
      let market = "";
      if (has("international", "export", "abroad", "overseas")) market = "Reachable to international market";
      else if (has("import substitute", "import-substituting", "replace import")) market = "Import-substituting product/service";
      else if (has("local", "ethiopia", "addis")) market = "Local market only";
      if (market) {
        apply("products.rows.market_served", market, "self_reported", "exact", 0.7);
        if (app.products.rows.length === 0) {
          app.products.rows.push({
            product_or_service: app.company_profile.business_type ?? null,
            market_served: market,
            distribution_channels: null,
          });
        } else if (!app.products.rows[0].market_served) {
          app.products.rows[0].market_served = market;
        }
      }
    }
  }

  // --- Uniqueness ---
  if (has("unique", "different", "first", "only", "new to", "competitor", "usP")) {
    const existing = evidence["products.product_service_uniqueness"];
    if (!existing || existing.status !== "established") {
      let category = "";
      if (has("new to ethiopia", "first company", "first in", "only company", "first ethiopian", "only logistics", "only producer", "only firm")) category = "New product/service in Ethiopia";
      else if (has("different from competitor", "different from what", "unlike others", "unique selling", "differentiate", "distinguish", "no competitor", "unique")) category = "Not new but different from competitors";
      else if (has("essential", "necessary", "critical for ethiopia")) category = "Essential product to Ethiopia";
      else if (has("no unique", "same as others", "nothing special")) category = "No unique features";
      if (category) {
        apply("products.product_service_uniqueness", category, "self_reported", "exact", 0.7);
      } else {
        apply("products.product_service_uniqueness", text.trim(), "self_reported", precisionOf(text), 0.7);
      }
    }
  }

  // --- Local sourcing ---
  const sourcingPct = percentFromText(text);
  if (app.sourcing.local_raw_material_percentage === null || app.sourcing.local_raw_material_percentage === undefined) {
    if (has("no local", "100% imported", "all imported", "import 100%", "none locally")) {
      apply("sourcing.local_raw_material_percentage", 0, "self_reported", "exact", 0.75);
    } else if (has("import")) {
      const importPct = text.match(/(\d+(?:\.\d+)?)\s*%\s*import/i);
      if (importPct) {
        const local = Math.max(0, 100 - parseFloat(importPct[1]));
        apply("sourcing.local_raw_material_percentage", local, "self_reported", "exact", 0.6);
      }
    } else if (has("local", "sourcing", "raw material", "purchased locally", "locally") && sourcingPct !== null) {
      apply("sourcing.local_raw_material_percentage", sourcingPct, "self_reported", precisionOf(text), 0.75);
    }
  }

  // --- Management members ---
  if (has("manager", "director", "general manager", "team", "management", "ceo", "founder")) {
    const dashRegex = /([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s*[–—:-]\s*([A-Za-z][a-zA-Z ]+)/g;
    const asRegex = /([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s+as\s+(?:the\s+)?([A-Za-z][a-zA-Z ]+)(?:\s+and\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s+as\s+(?:the\s+)?([A-Za-z][a-zA-Z ]+))?/g;
    const members: Array<{ name: string; position: string }> = [];
    let m;
    let guard = 0;
    while ((m = dashRegex.exec(text)) && guard++ < 10) {
      const name = m[1].trim();
      const position = m[2].trim().replace(/[.。]$/, "");
      if (name.includes(" ")) members.push({ name, position: position.split(/\band\b/i)[0].trim() });
    }
    for (const am of text.matchAll(/([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s+as\s+(?:the\s+)?([A-Z][A-Za-z ]*?)\s*(?:,|\s+and\s+|\.|;|$)/g)) {
      const nameA = am[1].trim();
      const positionA = am[2].trim().replace(/[.。]$/, "");
      if (nameA.includes(" ") && positionA.length >= 3 && !/\b(manager|director|lead|head|officer|founder|owner|ceo)\b/i.test(nameA)) {
        members.push({ name: nameA, position: positionA });
      }
    }
    for (const member of members) {
      if (app.management.members.length >= 5) break;
      if (!app.management.members.some((x) => x.name === member.name)) {
        app.management.members.push({ name: member.name, position: member.position, gender: "unknown" });
        applied.push({ field: `management.members[${app.management.members.length - 1}].name`, status: "established", note: member.name });
      }
    }
  }

  // --- Job creation ---
  const jobMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:new\s+)?jobs?/gi)];
  if (jobMatches.length > 0 && has("create", "plan", "expect", "aim", "will", "add", "hire", "more", "jobs")) {
    for (const jm of jobMatches) {
      const num = Math.round(parseFloat(jm[1]));
      // Always apply so a conflicting ("10 then 25") projection surfaces as a
      // contradiction rather than silently keeping the latest number.
      apply("job_creation.projected_new_jobs", num, "self_reported", precisionOf(text), 0.75);
    }
    const jobNum = Math.round(parseFloat(jobMatches[0][1]));
    const pos = {
      job_position: text.split(/create|expect|plan|aim|add|hire/)[0]?.trim().slice(0, 60) || "New positions",
      number_of_new_jobs: jobNum,
    };
    if (!app.job_creation.positions.some((p) => p.number_of_new_jobs === jobNum)) {
      app.job_creation.positions.push(pos);
    }
    if (app.growth["2024"]?.total_employees !== null && app.growth["2024"]?.total_employees !== undefined) {
      const base = app.growth["2024"].total_employees ?? 0;
      const resolved = app.job_creation.projected_new_jobs !== null && app.job_creation.projected_new_jobs !== undefined
        ? app.job_creation.projected_new_jobs
        : jobNum;
      app.job_creation.total_future_employees = base + resolved;
    }
  }

  // --- Investment readiness (C7b input) ---
  const invReadiness = text.match(/investment\s+readiness(?:\s+score)?\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:out\s+of\s+(\d+))?/i) ??
    text.match(/(\d+(?:\.\d+)?)\s*out\s+of\s+(\d+)\s*(?:investment\s+readiness|readiness\s+score)/i);
  if (invReadiness) {
    apply("intervention.investment_readiness", Math.round(parseFloat(invReadiness[1])), "self_reported", precisionOf(text), 0.75);
  }

  // --- Expected results ---
  // Only capture explicit expected-result statements ("Expected results: ...",
  // "We expect to ..."), not job-projection sentences.
  if (has("result", "goal", "achieve", "improve", "increase", "reduce", "expected")) {
    const explicit = text.match(/expected\s+results?\s*[:.]\s*(.+)/i) ??
      text.match(/(?:we|our)\s+(?:expect|hope|plan|aim)\s+to\s+([^.!?;]+)/i);
    if (explicit && !app.intervention.expected_results) {
      const condensed = explicit[1].trim().replace(/[.!?]$/, "");
      if (condensed.length > 10) {
        apply("intervention.expected_results", condensed, "self_reported", precisionOf(text), 0.7);
        app.intervention.intervention_requested = true;
      }
    }
  }

  // --- Impact / OSH ---
  if (has("impact", "community", "environment", "waste", "recycl", "solar", "safety", "health", "osh", "women", "youth") && text.length > 15) {
    if (!app.impact.social_environmental_impact_osh) {
      apply("impact.social_environmental_impact_osh", text.trim(), "self_reported", precisionOf(text), 0.7);
      if (has("safety", "health", "protective", "training on safety")) {
        apply("impact.occupational_safety_health_standards", text.trim().slice(0, 200), "self_reported", precisionOf(text), 0.6);
      }
    }
  }

  return { application: app, evidence, applied };
}