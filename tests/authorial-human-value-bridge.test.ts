import { describe, expect, it } from "vitest";
import { reconcileAuthorialHumanValueReview } from "../src/content/AuthorialHumanValueBridge";

const plan = {
  productionCode: "video-015",
  opening:
    "Se analiza sin conectar hechos, pruebas, norma, jurisprudencia y estrategia.",
  takeaway: "La ruta correcta depende de identificar el punto decisivo.",
  closing: {
    idea: "Primero se identifica el punto decisivo; después se actúa.",
    cta: "",
  },
};

const authorial = {
  productionCode: "video-015",
  sourceBound: true,
  authorialThesis:
    "La oposición de un tercero cambia la estrategia probatoria y defensiva.",
  discovery:
    "La prueba decisiva puede estar en un documento previo al conflicto.",
  reasoningChain: [
    "La oposición de un tercero cambia la estrategia probatoria y defensiva.",
    "La prueba decisiva puede estar en un documento previo al conflicto.",
    "Una observación adversa exige identificar el remedio disponible.",
  ],
  sourceFragments: [
    "La oposición de un tercero cambia la estrategia probatoria y defensiva.",
    "La prueba decisiva puede estar en un documento previo al conflicto.",
    "Una observación adversa exige identificar el remedio disponible.",
  ],
};

describe("AuthorialHumanValueBridge", () => {
  it("acepta una apertura source-bound cuando V5 eliminó la muletilla original", () => {
    const review = {
      blockers: [
        "El guion no contiene la apertura, desarrollo o cierre previstos.",
      ],
    };

    const video = {
      audio: {
        narrationText: [
          authorial.authorialThesis,
          authorial.reasoningChain[1],
          authorial.reasoningChain[2],
          plan.takeaway,
          plan.closing.idea,
        ].join(" "),
      },
    };

    const result = reconcileAuthorialHumanValueReview(
      review,
      plan,
      video,
      authorial,
    );

    expect(result.blockers).toEqual([]);
    expect(result.authorialCompatibility.openingOk).toBe(true);
    expect(
      result.authorialCompatibility.matchedDevelopment,
    ).toBeGreaterThanOrEqual(2);
    expect(result.authorialCompatibility.closingOk).toBe(true);
  });

  it("no perdona un desarrollo autoral insuficiente", () => {
    const review = {
      blockers: [
        "El guion no contiene la apertura, desarrollo o cierre previstos.",
      ],
    };

    const video = {
      audio: {
        narrationText: [
          authorial.authorialThesis,
          plan.takeaway,
          plan.closing.idea,
        ].join(" "),
      },
    };

    const result = reconcileAuthorialHumanValueReview(
      review,
      plan,
      video,
      authorial,
    );

    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0]).toMatch(/desarrollo=/);
  });

  it("bloquea un plan que no corresponde a la producción", () => {
    const result = reconcileAuthorialHumanValueReview(
      { blockers: [] },
      plan,
      {
        audio: {
          narrationText: "texto",
        },
      },
      {
        ...authorial,
        productionCode: "video-999",
      },
    );

    expect(result.blockers.join(" ")).toMatch(/no corresponde/);
  });
});
