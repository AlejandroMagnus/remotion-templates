import { describe, expect, it } from "vitest";
import { buildHumanValuePlan } from "../src/content/HumanValueDirector";
import { buildMarketingPlan } from "../src/content/MarketingDirector";
import type { SilecKnowledgeInput } from "../src/content/SilecContentAdapter";
import { fixture, resignFixture } from "./editorial-fixtures";

function source(category: "FI" | "DT" | "HT"): SilecKnowledgeInput {
  const card = fixture(77, category);
  card.problem =
    "Una persona o empresa debe tomar una decisión jurídica relevante y necesita comprender qué riesgo cambia realmente el resultado.";
  card.conclusion =
    "La ventaja consiste en comprender el punto decisivo antes de asumir un costo, un plazo o una estrategia difícil de revertir.";
  card.commercialObjective =
    "Convertir comprensión jurídica en una decisión profesional mejor informada.";
  card.offerPath = [
    "un diagnóstico jurídico estratégico integral",
    "una segunda opinión profesional",
  ];
  return {
    ...resignFixture(card),
    productionCode: `marketing-${category.toLowerCase()}`,
  };
}

describe("Marketing Director IA V1.2", () => {
  it("FI prioriza autoridad", () => {
    const input = source("FI");
    const marketing = buildMarketingPlan(input, buildHumanValuePlan(input));
    expect(marketing.stage).toBe("authority");
    expect(marketing.cta).toBe("");
  });
  it("DT usa consideración suave", () => {
    const input = source("DT");
    const marketing = buildMarketingPlan(input, buildHumanValuePlan(input));
    expect(marketing.stage).toBe("consideration");
    expect(marketing.cta.length).toBeGreaterThan(40);
  });
  it("HT conserva CTA profesional", () => {
    const input = source("HT");
    const marketing = buildMarketingPlan(input, buildHumanValuePlan(input));
    expect(marketing.stage).toBe("conversion");
    expect(marketing.cta).toBe(input.cta.trim());
  });
});
