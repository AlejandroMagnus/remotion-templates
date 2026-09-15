import type {SemanticRule} from "./semanticRules";

export const highTicketSemanticRules: SemanticRule[] = [
  {
    id: "controversia-alto-valor",
    keywords: [
      "controversia de alto valor",
      "controversia de alto impacto",
      "disputa de alto valor",
      "alto valor",
    ],
    visualType: "process",
    concept:
      "controversia jurídica de alto impacto económico y estratégico",
    durationMs: 5200,
    priority: 18,
  },
  {
    id: "contratos-high-ticket",
    keywords: [
      "contratos importantes",
      "contrato importante",
      "contratos relevantes",
      "contrato relevante",
    ],
    visualType: "document",
    concept:
      "contrato jurídicamente relevante con consecuencias económicas importantes",
    durationMs: 5000,
    priority: 17,
  },
  {
    id: "arbitraje",
    keywords: [
      "arbitraje",
      "arbitrajes",
      "controversia arbitral",
    ],
    visualType: "process",
    concept:
      "controversia arbitral empresarial de alta relevancia",
    durationMs: 5000,
    priority: 17,
  },
  {
    id: "conflicto-administrativo",
    keywords: [
      "conflicto administrativo",
      "conflictos administrativos",
      "controversia administrativa",
    ],
    visualType: "process",
    concept:
      "conflicto administrativo o regulatorio estratégicamente relevante",
    durationMs: 5000,
    priority: 17,
  },
  {
    id: "patrimonio",
    keywords: [
      "patrimonio",
      "patrimonial",
      "disputa patrimonial",
      "riesgo patrimonial",
    ],
    visualType: "evidence",
    concept:
      "patrimonio o activos sometidos a riesgo jurídico relevante",
    durationMs: 4900,
    priority: 16,
  },
  {
    id: "control-constitucional",
    keywords: [
      "control constitucional",
      "acción constitucional",
      "acciones constitucionales",
      "constitucional",
    ],
    visualType: "process",
    concept:
      "control constitucional aplicado estratégicamente a una controversia",
    durationMs: 5200,
    priority: 18,
  },
];
