import { afterEach, describe, expect, it } from "vitest";
import {
  applyEditorialSingularity,
  buildEditorialSingularityPlan,
  composeNarrationWithEditorialGenome,
  isGenericMethodologicalFormula,
} from "../src/content/EditorialSingularityDirector";
import type { SilecKnowledgeInput } from "../src/content/SilecContentAdapter";

function fixture(): SilecKnowledgeInput {
  return {
    productionCode: "video-juridico-901",
    topic: "Inscripción de un derecho propietario rural",
    centralThesis:
      "La inscripción exige verificar el antecedente jurídico y la documentación antes de presentar el trámite.",
    problem:
      "Una presentación incompleta puede generar observaciones y retrasar la consolidación registral del derecho.",
    reasoningChain: [
      "Primero debe verificarse el título y el antecedente que sustenta el derecho.",
      "Después corresponde reunir la documentación exigible para la inscripción.",
      "Si la autoridad formula una observación, debe decidirse si corresponde subsanar o impugnar.",
      "La oposición de un tercero puede transformar un trámite registral en una controversia jurídica.",
    ],
    conclusion:
      "La calidad del trámite depende de llegar al registro con el derecho, la documentación y la estrategia de respuesta ordenados.",
    targetAudience: ["abogados"],
    capabilityDemonstrated: ["criterio jurídico"],
    commercialObjective: "autoridad",
    offerPath: ["consulta"],
    hook: "Registrar no es simplemente presentar papeles.",
    closingIdea:
      "La prevención documental puede evitar que el conflicto aparezca demasiado tarde.",
    cta: "",
  };
}

afterEach(() => {
  delete process.env.SINGULARITY_ATTEMPT;
});

describe("EditorialSingularityDirector V2", () => {
  it("construye genomas narrativos distintos para el mismo tema cuando la memoria exige reintentar", () => {
    const input = fixture();
    const outputs = new Set<string>();
    const genomes = new Set<string>();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      process.env.SINGULARITY_ATTEMPT = String(attempt);
      const plan = buildEditorialSingularityPlan(
        input,
        "problem-analysis-solution",
      );
      const transformed = applyEditorialSingularity(input, plan);
      outputs.add(composeNarrationWithEditorialGenome(transformed, plan));
      genomes.add(plan.genome);
    }
    expect(genomes.size).toBeGreaterThanOrEqual(3);
    expect(outputs.size).toBeGreaterThanOrEqual(3);
  });

  it("mantiene las afirmaciones jurídicas en la fuente y solo añade conectores narrativos", () => {
    const input = fixture();
    process.env.SINGULARITY_ATTEMPT = "2";
    const plan = buildEditorialSingularityPlan(input, "system-map");
    expect(plan.sourceIntegrity.legalClaimsInvented).toBe(false);
    expect(plan.sourceIntegrity.substantiveReasoningPreserved).toBe(true);
    const transformed = applyEditorialSingularity(input, plan);
    const narration = composeNarrationWithEditorialGenome(transformed, plan);
    expect(narration).toContain("título");
    expect(narration).toContain("inscripción");
  });

  it("mantiene fuera la fórmula metodológica genérica", () => {
    const input = fixture();
    const formula =
      "Este asunto se analiza conectando hechos, pruebas, norma, jurisprudencia y estrategia.";
    input.reasoningChain.unshift(formula);
    const plan = buildEditorialSingularityPlan(
      input,
      "problem-analysis-solution",
    );
    const transformed = applyEditorialSingularity(input, plan);
    const narration = composeNarrationWithEditorialGenome(transformed, plan);
    expect(isGenericMethodologicalFormula(formula)).toBe(true);
    expect(narration).not.toContain(formula);
  });
});
