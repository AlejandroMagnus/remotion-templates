import { createHash } from "node:crypto";
import type { HumanValuePlan } from "./HumanValueDirector";
import type { SilecKnowledgeInput } from "./SilecContentAdapter";

export const MARKETING_DIRECTOR_VERSION = "marketing-director-ia-v1.2";
export type MarketingStage = "authority" | "consideration" | "conversion";

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

function variantFor(productionCode: string): number {
  return createHash("sha256").update(productionCode).digest()[0] % 4;
}

export function buildMarketingPlan(
  input: SilecKnowledgeInput,
  humanValue: HumanValuePlan,
) {
  const category = input.editorial?.category ?? "FI";
  const variant = variantFor(input.productionCode);
  const stage: MarketingStage =
    category === "HT"
      ? "conversion"
      : category === "DT"
        ? "consideration"
        : "authority";

  let cta = "";
  if (humanValue.closing.ctaMode === "none") {
    cta = "";
  } else if (humanValue.closing.ctaMode === "source" || category === "HT") {
    cta = clean(input.cta);
  } else if (category === "DT") {
    cta = [
      `Si este análisis le dio una nueva forma de mirar ${clean(input.topic)}, continúe con los demás contenidos del canal.`,
      "Si este razonamiento le resultó útil, explore los demás análisis del canal antes de tomar una decisión importante.",
      "Guarde esta idea como criterio de decisión y revise los demás contenidos relacionados del canal.",
      "Si quiere comprender estos problemas con mayor profundidad, continúe con los demás análisis jurídicos del canal.",
    ][variant];
  }

  return {
    version: MARKETING_DIRECTOR_VERSION,
    productionCode: input.productionCode,
    category,
    stage,
    variant,
    objective:
      stage === "authority"
        ? "Autoridad por utilidad y criterio, sin venta forzada."
        : stage === "consideration"
          ? "Hacer visible el valor diferencial y conducir hacia más contenido."
          : "Conectar un problema de alto impacto con una vía profesional concreta, sin promesas de resultado.",
    audience: input.targetAudience.map(clean).filter(Boolean),
    problem: clean(input.problem),
    valuePromise: clean(input.conclusion),
    authorityProof: input.capabilityDemonstrated.map(clean).filter(Boolean),
    commercialObjective: clean(input.commercialObjective),
    offerPath: input.offerPath.map(clean).filter(Boolean),
    cta,
    rules: {
      valueFirst: true,
      noGuaranteedResults: true,
      noArtificialUrgency: true,
      noClickbaitDeception: true,
      legalClaimsRemainSourceBound: true,
    },
  };
}

export type MarketingPlan = ReturnType<typeof buildMarketingPlan>;
