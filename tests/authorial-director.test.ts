import { describe, expect, it } from "vitest";
import {
  applyAuthorialPresentation,
  applyAuthorialScenes,
  buildAuthorialPlan,
} from "../src/content/AuthorialDirector";

const source = {
  productionCode: "video-juridico-777",
  topic: "Inscripción rural",
  problem:
    "Una persona pretende consolidar e inscribir un derecho propietario rural con antecedentes documentales dispersos.",
  centralThesis:
    "La inscripción no debe tratarse como un acto aislado si antes no se reconstruyó la fuente jurídica del derecho.",
  reasoningChain: [
    "Identificar el título y su origen antes de iniciar la ruta registral.",
    "Verificar antecedentes agrarios, saneamiento e identificación física del predio.",
    "Determinar qué documento prueba cada hecho relevante para la inscripción.",
    "Si existe oposición de tercero, cambia la estrategia defensiva y probatoria.",
    "Una observación adversa exige identificar el remedio o impugnación disponible.",
    "El orden de las actuaciones reduce el riesgo de perder tiempo o consolidar un error.",
  ],
  conclusion:
    "La ruta correcta depende de reconstruir primero el derecho y después escoger la actuación registral correspondiente.",
  hook: "Antes de registrar un predio rural conviene saber qué derecho se pretende registrar.",
  closingIdea: "Primero se reconstruye el derecho; después se registra.",
  cta: "",
};

describe("Director de Autoría Jurídica", () => {
  it("genera seis enfoques diferentes sin inventar proposiciones", () => {
    const plans = Array.from({ length: 6 }, (_, attempt) =>
      buildAuthorialPlan(source, attempt),
    );

    expect(new Set(plans.map((plan) => plan.mode)).size).toBe(6);

    const allowed = new Set([
      source.problem,
      source.centralThesis,
      ...source.reasoningChain,
      source.conclusion,
      source.closingIdea,
    ]);

    for (const plan of plans) {
      expect(plan.sourceBound).toBe(true);
      expect(allowed.has(plan.authorialThesis)).toBe(true);
      for (const item of plan.reasoningChain) {
        expect(allowed.has(item)).toBe(true);
      }
    }
  });

  it("cambia el foco sin alterar hook ni CTA de gobernanza", () => {
    const plan = buildAuthorialPlan(source, 2);
    const output = applyAuthorialPresentation(source, plan);

    expect(output.hook).toBe(source.hook);
    expect(output.cta).toBe(source.cta);
    expect(output.centralThesis).toBe(plan.authorialThesis);
    expect(output.reasoningChain).toContain(source.centralThesis);
  });

  it("retitula únicamente escenas genéricas", () => {
    const plan = buildAuthorialPlan(source, 1);
    const scenes = applyAuthorialScenes(
      [
        { id: "a", title: "Diagnóstico" },
        { id: "b", title: "Documento que define la competencia" },
        { id: "c", title: "Decisión" },
      ],
      plan,
    );

    expect(scenes[0].title).not.toBe("Diagnóstico");
    expect(scenes[1].title).toBe("Documento que define la competencia");
    expect(scenes[2].title).not.toBe("Decisión");
  });
});
