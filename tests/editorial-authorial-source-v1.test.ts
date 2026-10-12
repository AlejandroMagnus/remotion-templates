import { describe, expect, it } from "vitest";
import { buildAuthorialPlan, applyAuthorialPresentation } from "../src/content/AuthorialDirector";

const source = {
  productionCode: "video-999",
  topic: "Documentos en litigio",
  problem: "Una parte aporta documentos que deben vincularse con los hechos discutidos.",
  centralThesis: "Es indispensable explicar qué afirma demostrar cada documento en el expediente.",
  reasoningChain: [
    "Identifique primero el hecho controvertido al que se refiere el documento.",
    "Determine qué discusión concreta plantea la contraparte sobre la prueba.",
    "Examine el momento procesal de presentación conforme a las reglas aplicables.",
    "Compruebe que la conclusión se sostiene en documentos pertinentes al hecho.",
  ],
  conclusion: "La prueba adquiere utilidad práctica cuando responde a una cuestión discutida.",
  closingIdea: "Prepare el expediente antes de que la controversia llegue al tribunal.",
  hook: "¿Qué demuestra el documento que desea presentar?",
};

describe("source-bound authorial presentation", () => {
  it("no recycles the selected thesis as one of its own reasoning blocks", () => {
    const plans = Array.from({ length: 6 }, (_, attempt) => buildAuthorialPlan(source, attempt));
    expect(new Set(plans.map((p) => p.mode)).size).toBe(6);
    for (const plan of plans) {
      expect(plan.sourceBound).toBe(true);
      expect(plan.reasoningChain).not.toContain(plan.authorialThesis);
      const output = applyAuthorialPresentation(source, plan);
      expect(output.centralThesis).toBe(plan.authorialThesis);
      expect(output.productionCode).toBe(source.productionCode);
    }
  });
});
