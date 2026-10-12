import type { SilecKnowledgeInput } from "./SilecContentAdapter";
import type { NarrativeArchitecture } from "../strategy/CreativeDiversityDirector";

export const AULA_SILEC_AUDIOVISUAL_VERSION = "aula-silec-audiovisual-v3-sourcebound";

const clean = (value: string) => (value || "").replace(/\s+/g, " ").trim();
const sentence = (value: string) => {
  const text = clean(value);
  return text ? (/[.!?…]$/.test(text) ? text : `${text}.`) : "";
};
const key = (value: string) => clean(value).toLocaleLowerCase("es")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9ñ]+/g, " ").trim();
const words = (value: string) => key(value).split(/\s+/).filter(Boolean);
const wordCount = (value: string) => clean(value).split(/\s+/).filter(Boolean).length;

// Retain source material; only discard text already represented elsewhere.
// Lexical overlap is not proof of legal equivalence: suppress ONLY nearly
// identical propositions, never claims which merely discuss the same subject.
function redundant(a: string, b: string): boolean {
  const x = words(a), y = words(b);
  if (!x.length || !y.length) return false;
  if (x.join(" ") === y.join(" ")) return true;
  if (Math.min(x.length, y.length) < 10) return false;
  // La repetición lexical NO autoriza eliminar negaciones, modalidades,
  // fechas, cifras ni calificaciones jurídicas distintas.
  const critical = (items: string[]) => items.filter((w) =>
    /^(no|si|nunca|salvo|excepto|debe|deben|puede|pueden|podra|podran|debera|deberan|admisible|inadmisible|procedente|improcedente|valido|invalido|nulo|nulidad|prescribe|prescrito|vigente)$/.test(w)
    || /^[0-9]+$/.test(w)).sort().join("|");
  if (critical(x) !== critical(y)) return false;
  const shingles = (tokens: string[]) => new Set(
    Array.from({ length: Math.max(0, tokens.length - 2) }, (_, i) =>
      tokens.slice(i, i + 3).join(" ")),
  );
  const sx = shingles(x), sy = shingles(y);
  let intersection = 0;
  for (const s of sx) if (sy.has(s)) intersection++;
  const min = Math.min(sx.size, sy.size);
  // Near containment, not general semantic similarity.
  return min > 0 && intersection / min >= 0.88 &&
    Math.min(x.length, y.length) / Math.max(x.length, y.length) >= 0.74;
}

export type AulaSilecAudiovisualPlan = {
  version: string;
  productionCode: string;
  internalLayer: true;
  publicExposure: "none";
  purpose: string;
  structure: {
    humanSituation: string;
    whyItMatters: string;
    decisiveIdea: string;
    learningSteps: string[];
    practicalTakeaway: string;
    professionalValue: string;
  };
  variation: number;
  narration: string;
  audit: {
    preservesReviewedClaims: true;
    addsNewLegalClaims: false;
    exposesInternalMethodName: false;
    sourceWords: number;
    narrationWords: number;
    droppedRepeatedPropositions: number;
  };
};

/**
 * Aula SILEC V3 — assembled EXCLUSIVELY from reviewed input strings.
 * No invented microcase, universal rule, transition, article or legal remedy.
 * If the reviewed material lacks specific teaching, the downstream editorial
 * gate MUST reject it: the renderer must not improvise procedural law.
 */
export function buildAulaSilecAudiovisualPlan(
  input: SilecKnowledgeInput,
  _architecture: NarrativeArchitecture,
): AulaSilecAudiovisualPlan {
  type Slot = { role: string; text: string; priority: number; order: number };
  const candidate = [
    { role: "hook", text: input.hook, priority: 100 },
    { role: "problem", text: input.problem, priority: 65 },
    { role: "centralThesis", text: input.centralThesis, priority: 70 },
    ...input.reasoningChain.map((text) => ({ role: "reasoning", text, priority: 30 })),
    { role: "conclusion", text: input.conclusion, priority: 90 },
    { role: "closingIdea", text: input.closingIdea, priority: 95 },
    { role: "cta", text: input.cta, priority: 98 },
  ].map((s, index): Slot => ({ ...s, text: clean(s.text), order: index }))
    .filter((s) => s.text);

  // Select mandatory end material first, then keep distinct evidence/analysis.
  // The selection does NOT edit any surviving source proposition.
  const chosen: Slot[] = [];
  for (const slot of [...candidate].sort((a, b) => b.priority - a.priority || a.order - b.order)) {
    if (chosen.some((s) => redundant(s.text, slot.text))) continue;
    chosen.push(slot);
  }
  chosen.sort((a, b) => a.order - b.order);
  const reasoning = chosen.filter((s) => s.role === "reasoning").map((s) => s.text);
  const narration = chosen.map((s) => sentence(s.text)).join(" ");
  const selected = (role: string) => chosen.find((s) => s.role === role)?.text || "";
  const sourceText = candidate.map((s) => s.text).join(" ");
  return {
    version: AULA_SILEC_AUDIOVISUAL_VERSION,
    productionCode: input.productionCode,
    internalLayer: true,
    publicExposure: "none",
    purpose: "Enseñar mediante proposiciones jurídicas revisadas, sin transiciones ficticias ni repeticiones.",
    structure: {
      humanSituation: clean(input.problem),
      whyItMatters: clean(input.hook),
      decisiveIdea: clean(input.centralThesis),
      learningSteps: reasoning,
      practicalTakeaway: clean(input.conclusion),
      professionalValue: selected("closingIdea") || selected("conclusion"),
    },
    variation: 0,
    narration,
    audit: {
      preservesReviewedClaims: true,
      addsNewLegalClaims: false,
      exposesInternalMethodName: false,
      sourceWords: wordCount(sourceText),
      narrationWords: wordCount(narration),
      droppedRepeatedPropositions: candidate.length - chosen.length,
    },
  };
}
