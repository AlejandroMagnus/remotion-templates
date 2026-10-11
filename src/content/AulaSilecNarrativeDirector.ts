import { createHash } from "node:crypto";
import type { SilecKnowledgeInput } from "./SilecContentAdapter";
import type { NarrativeArchitecture } from "../strategy/CreativeDiversityDirector";

export const AULA_SILEC_AUDIOVISUAL_VERSION = "aula-silec-audiovisual-v2";

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

const sentence = (value: string) => {
  const text = clean(value);
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
};

const wordCount = (value: string) =>
  clean(value).split(/\s+/).filter(Boolean).length;

function variantFor(productionCode: string) {
  const digest = createHash("sha256").update(productionCode).digest();
  return digest[0] % 4;
}

function transitions(size: number) {
  const labels = [
    "Primero",
    "Después",
    "Ahora observe esto",
    "El siguiente punto",
    "Y aquí aparece algo importante",
    "Finalmente",
    "Una última comprobación",
  ];
  return Array.from({ length: size }, (_, index) => labels[index] ?? "Además");
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
 * Capa pedagógica interna.
 * No modifica la ficha jurídica, su hash de revisión ni inventa fuentes.
 * Aula SILEC es nombre interno: nunca se pronuncia ni se imprime en el video.
 */
export function buildAulaSilecAudiovisualPlan(
  input: SilecKnowledgeInput,
  _architecture: NarrativeArchitecture,
): AulaSilecAudiovisualPlan {
  // SOURCE-BOUND NARRATIVE DEDUP V1: each reviewed proposition is pronounced
  // at most once, even when AuthorialDirector assigns it to several roles.
  // No text is paraphrased or added to the reviewed source.
  type Slot = { role: string; text: string; index?: number };
  const slots: Slot[] = [
    { role: "hook", text: input.hook },
    { role: "problem", text: input.problem },
    { role: "centralThesis", text: input.centralThesis },
    ...input.reasoningChain.map((text, index) => ({
      role: "reasoning", text, index,
    })),
    { role: "conclusion", text: input.conclusion },
    { role: "closingIdea", text: input.closingIdea },
    { role: "cta", text: input.cta },
  ].map((slot) => ({ ...slot, text: clean(slot.text) }));

  const propositionKey = (text: string): string =>
    clean(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  const priority: Record<string, number> = {
    hook: 100,
    cta: 90,
    closingIdea: 80,
    conclusion: 70,
    problem: 60,
    centralThesis: 50,
    reasoning: 10,
  };
  const chosenByKey = new Map<string, number>();
  slots.forEach((slot, index) => {
    const key = propositionKey(slot.text);
    if (!key) return;
    const previous = chosenByKey.get(key);
    if (
      previous === undefined ||
      priority[slot.role] > priority[slots[previous].role]
    ) {
      chosenByKey.set(key, index);
    }
  });
  const chosen = new Set(chosenByKey.values());
  const include = (role: string): boolean =>
    slots.some((slot, index) => slot.role === role && chosen.has(index));
  const reasoning = slots
    .filter((slot, index) => slot.role === "reasoning" && chosen.has(index))
    .map((slot) => slot.text);
  const droppedRepeatedPropositions = slots.filter(
    (slot, index) => slot.text && !chosen.has(index),
  ).length;
  const variant = variantFor(input.productionCode);
  const longEnough =
    wordCount(
      [
        input.hook,
        input.problem,
        input.centralThesis,
        ...reasoning,
        input.conclusion,
        input.closingIdea,
      ].join(" "),
    ) > 105;

  const openingBridge = [
    "Ahora llévelo a una situación real.",
    "Antes de pensar en artículos, piense en la consecuencia.",
    "Aquí el Derecho deja de ser teoría y se convierte en una decisión concreta.",
    "Detrás del expediente hay una persona, una familia, una empresa o una decisión que necesita una respuesta.",
  ][variant];

  const thesisBridge = [
    "El punto jurídico decisivo es este.",
    "La pregunta importante aparece aquí.",
    "Lo que cambia el análisis es esto.",
    "Ahora mire dónde está la verdadera diferencia.",
  ][variant];

  const learningBridge = [
    "Para entenderlo sin perderse en tecnicismos, mire la secuencia.",
    "La forma más clara de verlo es paso por paso.",
    "No memorice la conclusión todavía; siga el razonamiento.",
    "Separe el problema en decisiones pequeñas y comprensibles.",
  ][variant];

  const valueBridge = [
    "¿Qué debe llevarse de esto?",
    "¿Dónde está el valor práctico?",
    "¿Qué cambia cuando se comprende esta estructura?",
    "¿Qué ventaja obtiene quien detecta esto a tiempo?",
  ][variant];

  const professionalValue = [
    "El valor no está en recitar una norma, sino en detectar el punto que cambia la decisión.",
    "Comprender antes permite decidir con más criterio y menos improvisación.",
    "Un análisis útil convierte información jurídica en una decisión comprensible y controlable.",
    "La diferencia aparece cuando hechos, prueba, norma y consecuencia dejan de verse por separado.",
  ][variant];

  const labels = transitions(reasoning.length);
  const stepNarration = reasoning.flatMap((step, index) => [
    sentence(labels[index]),
    sentence(step),
  ]);

  const parts = [
    ...(include("hook") ? [sentence(input.hook)] : []),
    sentence(openingBridge),
    ...(include("problem") ? [sentence(input.problem)] : []),
    ...(include("centralThesis")
      ? [sentence(thesisBridge), sentence(input.centralThesis)]
      : []),
    ...(reasoning.length && !longEnough ? [sentence(learningBridge)] : []),
    ...stepNarration,
    sentence(valueBridge),
    ...(include("conclusion") ? [sentence(input.conclusion)] : []),
    sentence(professionalValue),
    ...(include("closingIdea") ? [sentence(input.closingIdea)] : []),
    ...(include("cta") ? [sentence(input.cta)] : []),
  ].filter(Boolean);

  // Defend against duplicated generated bridges without altering source text.
  const seenSpoken = new Set<string>();
  const narration = parts
    .filter((value) => {
      const key = propositionKey(value);
      if (!key || seenSpoken.has(key)) return false;
      seenSpoken.add(key);
      return true;
    })
    .join(" ");

  const sourceText = [
    input.hook,
    input.problem,
    input.centralThesis,
    ...input.reasoningChain,
    input.conclusion,
    input.closingIdea,
    input.cta,
  ].join(" ");

  return {
    version: AULA_SILEC_AUDIOVISUAL_VERSION,
    productionCode: input.productionCode,
    internalLayer: true,
    publicExposure: "none",
    purpose:
      "Situación humana → significado → idea decisiva → explicación → aprendizaje → valor práctico.",
    structure: {
      humanSituation: clean(input.problem),
      whyItMatters: clean(input.hook),
      decisiveIdea: clean(input.centralThesis),
      learningSteps: reasoning,
      practicalTakeaway: clean(input.conclusion),
      professionalValue,
    },
    variation: variant,
    narration,
    audit: {
      preservesReviewedClaims: true,
      addsNewLegalClaims: false,
      exposesInternalMethodName: false,
      sourceWords: wordCount(sourceText),
      narrationWords: wordCount(narration),
      droppedRepeatedPropositions,
    },
  };
}
