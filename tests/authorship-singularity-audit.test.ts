import { describe, expect, it } from "vitest";
import {
  auditAuthorshipSingularity,
  cosineSimilarity,
  inferRoleFingerprint,
  weightedTextSimilarity,
  type CurrentPiece,
  type MemoryRecord,
} from "../src/audit/AuthorshipSingularityAudit";

function piece(overrides: Partial<CurrentPiece> = {}): CurrentPiece {
  return {
    productionCode: "video-juridico-201",
    topic: "Inscripción de propiedad rural",
    thesis:
      "La inscripción rural exige reconstruir la cadena jurídica del predio antes de tratar el registro como un simple trámite.",
    problem:
      "Una persona posee documentos dispersos y pretende consolidar e inscribir su derecho propietario rural.",
    conclusion:
      "El resultado depende de identificar primero la fuente del derecho, la situación agraria y el obstáculo registral concreto.",
    hook: "Antes de intentar registrar una propiedad rural, hay una pregunta que puede cambiar todo el trámite.",
    closingIdea: "Primero se reconstruye el derecho; después se registra.",
    reasoningChain: [
      "Identificar el título y su origen",
      "Verificar antecedentes agrarios y saneamiento",
      "Determinar autoridad y registro competente",
      "Corregir observaciones documentales",
      "Defenderse frente a oposición de terceros",
    ],
    narration:
      "Antes de intentar registrar una propiedad rural, hay una pregunta que puede cambiar todo el trámite. Primero debe reconstruirse de dónde nace el derecho sobre el predio. Después se verifican los antecedentes agrarios, el saneamiento y la identificación física. Si aparece una observación registral, la respuesta depende de su causa. Si un tercero formula oposición, cambia la estrategia probatoria y defensiva. Solo después de resolver esas bifurcaciones tiene sentido avanzar hacia la inscripción.",
    scenes: [
      { title: "Título y origen del derecho" },
      { title: "Antecedentes agrarios" },
      { title: "Observación registral" },
      { title: "Oposición de tercero" },
      { title: "Inscripción" },
    ],
    ...overrides,
  };
}

const memory: MemoryRecord[] = [
  {
    contentCode: "video-juridico-190",
    topic: "Recurso jerárquico",
    thesis:
      "Una impugnación administrativa sólida comienza por identificar el defecto decisorio que realmente puede modificar la resolución.",
    narrationText:
      "Una resolución administrativa adversa no se impugna acumulando argumentos. Primero se identifica el defecto capaz de cambiar la decisión. Luego se determina la prueba y el recurso disponible.",
    status: "rendered",
  },
  {
    contentCode: "video-juridico-191",
    topic: "Prueba contractual",
    thesis:
      "En un conflicto contractual, la mejor teoría jurídica fracasa si no puede demostrar el hecho que activa la obligación.",
    narrationText:
      "Un contrato puede parecer claro hasta que la controversia obliga a probar qué ocurrió realmente. La estrategia comienza por identificar el hecho decisivo y la evidencia disponible.",
    status: "rendered",
  },
];

describe("AuthorshipSingularityAudit", () => {
  it("detecta similitud textual alta", () => {
    expect(
      cosineSimilarity(
        "prueba contrato incumplimiento",
        "prueba contrato incumplimiento",
      ),
    ).toBeGreaterThan(0.99);
    expect(
      weightedTextSimilarity("ruta registral rural", "defensa penal cautelar"),
    ).toBeLessThan(0.4);
  });

  it("reconoce fingerprints narrativos distintos", () => {
    const fp = inferRoleFingerprint(
      "Primero se revisa el documento. Después se prueba el hecho. Si la contraparte se opone, se responde con la defensa correspondiente.",
    );
    expect(fp).toContain("route");
    expect(fp).toContain("evidence");
    expect(fp).toContain("adversarial");
  });

  it("aprueba una pieza específica y distinta", () => {
    const result = auditAuthorshipSingularity(piece(), memory, "script");
    expect(result.score).toBeGreaterThanOrEqual(76);
    expect(result.status).toBe("passed");
    expect(result.blockers).toEqual([]);
  });

  it("bloquea una pieza casi copiada", () => {
    const copied = piece({
      thesis: memory[0].thesis,
      narration: memory[0].narrationText,
    });
    const result = auditAuthorshipSingularity(copied, memory, "script");
    expect(result.status).toBe("blocked");
    expect(result.blockers.join(" ")).toMatch(/similar/i);
  });

  it("bloquea lenguaje excesivamente genérico", () => {
    const generic = piece({
      thesis:
        "El análisis jurídico estratégico permite tomar mejores decisiones en situaciones complejas.",
      narration:
        "No basta con mirar el problema. La verdadera diferencia está en comprender el sistema. El punto decisivo puede cambiar el resultado. Antes de decidir hay que analizar la situación. Lo importante es tener una estrategia jurídica adecuada para tomar una mejor decisión.",
      scenes: [
        { title: "Diagnóstico" },
        { title: "Estrategia" },
        { title: "Decisión" },
        { title: "Conclusión" },
      ],
    });
    const result = auditAuthorshipSingularity(generic, memory, "script");
    expect(result.status).toBe("blocked");
    expect(result.dimensions.specificity).toBeLessThan(55);
  });
});
