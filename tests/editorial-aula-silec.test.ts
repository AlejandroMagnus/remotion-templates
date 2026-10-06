import { describe, expect, it } from "vitest";
import { buildAulaSilecAudiovisualPlan } from "../src/content/AulaSilecNarrativeDirector";
import { CREATIVE_PROFILE_CATALOG } from "../src/strategy/CreativeDiversityDirector";
import type { SilecKnowledgeInput } from "../src/content/SilecContentAdapter";
import { fixture, resignFixture } from "./editorial-fixtures";

function source(code: string): SilecKnowledgeInput {
  const card = fixture(81, "FI");
  card.hook = "Una decisión aparentemente pequeña puede cambiar todo el caso";
  card.problem =
    "Una persona recibe una decisión jurídica y no sabe cuál de todos los documentos del expediente cambia realmente su posición.";
  card.centralThesis =
    "El análisis útil identifica el hecho decisivo, la prueba que puede demostrarlo y la consecuencia jurídica que produce.";
  card.reasoningChain = [
    "Reconstruir los hechos en orden",
    "Separar afirmaciones de evidencia",
    "Identificar la regla aplicable",
    "Anticipar la respuesta de la contraparte",
  ];
  card.conclusion =
    "Quien comprende la estructura puede concentrar su esfuerzo en el punto que realmente modifica la decisión.";
  card.closingIdea =
    "El Derecho se vuelve útil cuando ayuda a comprender antes de actuar.";
  return { ...resignFixture(card), productionCode: code };
}

describe("Aula SILEC audiovisual", () => {
  it("humaniza sin alterar ni ocultar las afirmaciones fuente", () => {
    const input = source("video-juridico-081");
    const plan = buildAulaSilecAudiovisualPlan(
      input,
      CREATIVE_PROFILE_CATALOG[0].narrativeArchitecture,
    );

    expect(plan.publicExposure).toBe("none");
    expect(plan.audit.addsNewLegalClaims).toBe(false);
    expect(plan.narration).toContain(input.hook);
    expect(plan.narration).toContain(input.problem);
    expect(plan.narration).toContain(input.centralThesis);
    expect(plan.narration).toContain(input.conclusion);
    for (const step of input.reasoningChain)
      expect(plan.narration).toContain(step);
    expect(plan.narration).not.toMatch(/Aula SILEC|PhD 12|método SILEC/i);
    expect(plan.structure.professionalValue.length).toBeGreaterThan(35);
  });

  it("varía la entrada pedagógica para no volver formulaicos los videos", () => {
    const variants = new Set<number>();
    for (let n = 82; n < 94; n++) {
      const input = source(`video-juridico-${n}`);
      const plan = buildAulaSilecAudiovisualPlan(
        input,
        CREATIVE_PROFILE_CATALOG[n % CREATIVE_PROFILE_CATALOG.length]
          .narrativeArchitecture,
      );
      variants.add(plan.variation);
    }
    expect(variants.size).toBeGreaterThanOrEqual(3);
  });

  it("mantiene la capa interna fuera del texto público", () => {
    const input = source("video-juridico-094");
    const plan = buildAulaSilecAudiovisualPlan(
      input,
      "problem-analysis-solution",
    );
    expect(plan.internalLayer).toBe(true);
    expect(plan.narration).not.toContain(plan.version);
    expect(plan.narration).not.toContain("SILEC");
  });
});
