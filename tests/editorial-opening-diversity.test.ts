import { describe, expect, it } from "vitest";
import {
  buildHumanValuePlan,
  reviewHumanValue,
} from "../src/content/HumanValueDirector";
import { buildVideoContent } from "../scripts/build-autonomous-video-spec";
import { CREATIVE_PROFILE_CATALOG } from "../src/strategy/CreativeDiversityDirector";
import type { SilecKnowledgeInput } from "../src/content/SilecContentAdapter";
import { fixture, resignFixture } from "./editorial-fixtures";

function source(code: string, hook: string): SilecKnowledgeInput {
  const card = fixture(91, "FI");
  card.hook = hook;
  card.problem =
    "Una empresa recibe una decisión que puede alterar un contrato relevante y necesita saber qué punto del expediente cambia realmente su posición.";
  card.centralThesis =
    "La calidad del análisis depende de identificar el punto jurídicamente decisivo y explicar su consecuencia concreta.";
  card.reasoningChain = [
    "Reconstruir la cronología relevante",
    "Identificar el documento que cambia la posición",
    "Contrastar la regla aplicable",
    "Anticipar la respuesta probable",
  ];
  card.conclusion =
    "Comprender la estructura permite decidir con más precisión y menos improvisación.";
  card.closingIdea =
    "El Derecho aporta valor cuando convierte complejidad en una decisión comprensible.";
  return { ...resignFixture(card), productionCode: code };
}

describe("Aula SILEC — aperturas sin muletilla metodológica", () => {
  it("reemplaza una apertura hechos-prueba-norma por una situación humana específica", () => {
    const input = source(
      "video-juridico-091",
      "Un problema jurídico no puede analizarse sin conectar hechos, prueba, norma, jurisprudencia y estrategia.",
    );
    const plan = buildHumanValuePlan(input);

    expect(plan.openingMode).toBe("humanized-method-hook");
    expect(plan.sourceOpening).toBe(input.hook);
    expect(plan.opening).not.toBe(input.hook);
    expect(plan.opening).toContain(input.problem);

    const content = buildVideoContent(input, CREATIVE_PROFILE_CATALOG[0]);
    expect(content.narration.startsWith(plan.opening)).toBe(true);
    expect(content.narration.startsWith(input.hook)).toBe(false);

    const video = {
      id: input.productionCode,
      audio: { narrationText: content.narration },
      scenes: content.scenes,
    };
    expect(reviewHumanValue(input, plan, video).blockers).toEqual([]);
  });

  it("conserva una apertura específica que no es una muletilla", () => {
    const input = source(
      "video-juridico-092",
      "Una sentencia favorable puede valer mucho menos de lo que dice el papel.",
    );
    const plan = buildHumanValuePlan(input);
    expect(plan.openingMode).toBe("source");
    expect(plan.opening).toBe(input.hook);
  });

  it("varía la forma de entrada entre producciones para evitar aperturas clonadas", () => {
    const openings = new Set<string>();
    const hook =
      "Todo caso debe conectar hechos, prueba, norma, jurisprudencia y estrategia antes de decidir.";
    for (let n = 93; n <= 104; n++) {
      const input = source(`video-juridico-${n}`, hook);
      openings.add(buildHumanValuePlan(input).opening);
    }
    expect(openings.size).toBeGreaterThanOrEqual(4);
  });

  it("no modifica la ficha jurídica ni su hash de revisión", () => {
    const input = source(
      "video-juridico-105",
      "No se puede analizar este asunto sin integrar hechos, prueba y norma.",
    );
    const before = JSON.stringify(input);
    buildVideoContent(input, CREATIVE_PROFILE_CATALOG[1]);
    expect(JSON.stringify(input)).toBe(before);
  });
});
