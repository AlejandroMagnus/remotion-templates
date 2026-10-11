import { describe, expect, it } from "vitest";
import {
  buildAuthorialPlan,
  applyAuthorialPresentation,
} from "../src/content/AuthorialDirector";
import { buildAulaSilecAudiovisualPlan } from "../src/content/AulaSilecNarrativeDirector";
import type { SilecKnowledgeInput } from "../src/content/SilecContentAdapter";

const base: SilecKnowledgeInput = {
  productionCode: "video-015",
  topic: "Prueba documental en proceso civil",
  hook: "¿Qué sucede cuando una prueba documental decisiva es ignorada durante el proceso civil?",
  problem: "El riesgo frecuente en Prueba documental en proceso civil es confundir prueba documental en proceso civil con un trámite genérico sin identificar requisitos, autoridad y prueba.",
  centralThesis: "Cuando se actúa sin distinguir documentos, carga probatoria, plazos y reacción adversaria, el caso pierde fuerza aunque la pretensión parezca atendible.",
  reasoningChain: [
    "El riesgo frecuente en Prueba documental en proceso civil es confundir prueba documental en proceso civil con un trámite genérico sin identificar requisitos, autoridad y prueba.",
    "Cuando se actúa sin distinguir documentos, carga probatoria, plazos y reacción adversaria, el caso pierde fuerza aunque la pretensión parezca atendible.",
    "Prueba documental en proceso civil exige dominar qué documentos sirven, cómo se presentan y cómo se atacan; su valor práctico está en transformar qué documentos sirven, cómo se presentan y cómo se atacan en una decisión profesional con requisitos, prueba, autoridad competente y consecuencia verificable.",
    "Primero identifique el resultado buscado en Prueba documental en proceso civil: no es lo mismo prevenir, reclamar, defenderse, impugnar o ejecutar.",
    "La decisión útil debe terminar en una actuación jurídicamente ordenada sobre prueba documental en proceso civil, con una ruta de seguimiento y ejecución posible.",
    "En Prueba documental en proceso civil, la diferencia entre improvisar y actuar con método suele estar en preparar la prueba antes del conflicto decisivo.",
  ],
  conclusion: "La decisión útil debe terminar en una actuación jurídicamente ordenada sobre prueba documental en proceso civil, con una ruta de seguimiento y ejecución posible.",
  closingIdea: "La fuerza de una prueba depende también de presentarla de manera oportuna, comprensible y defendible.",
  cta: "Conoce el trámite, los riesgos y las consecuencias de tu decisión.",
  targetAudience: ["abogados"],
  capabilityDemonstrated: ["evaluación documental"],
  commercialObjective: "enseñar",
  offerPath: ["asesoría"],
};

function key(value: string): string {
  return value.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function longDuplicates(narration: string): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const sentence of narration.split(/(?<=[.!?])\s+/)) {
    const value = key(sentence);
    if (value.split(/\s+/).length < 12) continue;
    if (seen.has(value)) dupes.push(value);
    seen.add(value);
  }
  return dupes;
}

describe("Aula SILEC: singularidad intra-guion source-bound", () => {
  it.each([0, 1, 2, 3, 4, 5])("deduplica las seis concepciones de autoría (intento %i)", (attempt) => {
    const authorial = buildAuthorialPlan(base, attempt);
    const presented = applyAuthorialPresentation(base, authorial);
    const before = JSON.stringify(presented);
    const aula = buildAulaSilecAudiovisualPlan(presented, "case-tension-resolution");
    expect(JSON.stringify(presented)).toBe(before);
    expect(longDuplicates(aula.narration)).toEqual([]);
    expect(aula.audit.droppedRepeatedPropositions).toBeGreaterThan(0);
    expect(aula.narration).toContain(base.hook);
    expect(aula.narration).toContain(base.conclusion);
    expect(aula.narration).toContain(base.closingIdea);
    expect(aula.narration).toContain(base.cta);
  });

  it("conserva cierre, CTA y fuente si conclusión y cierre coinciden", () => {
    const duplicated = { ...base, closingIdea: base.conclusion };
    const narration = buildAulaSilecAudiovisualPlan(duplicated, "case-tension-resolution");
    expect(longDuplicates(narration.narration)).toEqual([]);
    expect(narration.narration).toContain(base.conclusion);
    expect(narration.narration).toContain(base.cta);
    expect(narration.audit.sourceWords).toBeGreaterThan(0);
  });

  it("no modifica los contenidos fuente ni elimina proposiciones distintas", () => {
    const single = {
      ...base,
      reasoningChain: [
        "Un documento privado reconocido puede tener efectos probatorios diferentes de uno no reconocido.",
        "La oportunidad procesal para aportar documentos condiciona las posibilidades de contradicción.",
      ],
    };
    const before = JSON.stringify(single);
    const aula = buildAulaSilecAudiovisualPlan(single, "case-tension-resolution");
    expect(JSON.stringify(single)).toBe(before);
    for (const proposition of single.reasoningChain) {
      expect(aula.narration).toContain(proposition);
    }
  });
});
