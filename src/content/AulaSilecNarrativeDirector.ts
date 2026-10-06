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
  const reasoning = input.reasoningChain.map(clean).filter(Boolean);
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
    sentence(input.hook),
    sentence(openingBridge),
    sentence(input.problem),
    sentence(thesisBridge),
    sentence(input.centralThesis),
    ...(longEnough ? [] : [sentence(learningBridge)]),
    ...stepNarration,
    sentence(valueBridge),
    sentence(input.conclusion),
    sentence(professionalValue),
    sentence(input.closingIdea),
    sentence(input.cta),
  ].filter(Boolean);

  const narration = parts
    .filter((value, index, array) => index === 0 || value !== array[index - 1])
    .join(" ");

  const sourceText = [
    input.hook,
    input.problem,
    input.centralThesis,
    ...reasoning,
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
    },
  };
}
