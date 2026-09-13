import type {SemanticRule} from "./semanticRules";

export const silecSemanticRules: SemanticRule[] = [
  {
    id: "hechos",
    keywords: [
      "hecho",
      "hechos",
      "hechos jurídicamente relevantes",
      "hechos demostrables",
      "qué ocurrió",
    ],
    visualType: "evidence",
    concept:
      "reconstrucción ordenada de hechos jurídicamente relevantes antes de formular una estrategia",
    durationMs: 4700,
    priority: 14,
  },

  {
    id: "norma",
    keywords: [
      "norma",
      "normas",
      "norma aplicable",
      "normas aplicables",
      "normativa",
      "derecho aplicable",
    ],
    visualType: "document",
    concept:
      "norma jurídica aplicable identificada después de comprender hechos y prueba",
    durationMs: 4700,
    priority: 14,
  },

  {
    id: "jurisprudencia",
    keywords: [
      "jurisprudencia",
      "jurisprudencia pertinente",
      "precedente",
      "precedentes",
      "línea jurisprudencial",
    ],
    visualType: "document",
    concept:
      "investigación y análisis de jurisprudencia pertinente para sustentar la posición jurídica",
    durationMs: 4700,
    priority: 14,
  },

  {
    id: "teoria-caso",
    keywords: [
      "teoría del caso",
      "teoria del caso",
      "caso coherente",
    ],
    visualType: "process",
    concept:
      "construcción coherente de teoría del caso integrando hechos, prueba y derecho",
    durationMs: 5000,
    priority: 15,
  },

  {
    id: "estrategia-juridica",
    keywords: [
      "estrategia jurídica",
      "estrategia",
      "estrategias",
      "comparar estrategias",
      "posición adversa",
      "posicion adversa",
    ],
    visualType: "process",
    concept:
      "comparación estratégica de alternativas jurídicas y anticipación de la posición adversa",
    durationMs: 5000,
    priority: 15,
  },

  {
    id: "riesgos",
    keywords: [
      "riesgo",
      "riesgos",
      "costos",
      "consecuencias",
      "riesgos costos y consecuencias",
    ],
    visualType: "warning",
    concept:
      "evaluación profesional de riesgos, costos y consecuencias antes de adoptar una decisión",
    durationMs: 4800,
    priority: 14,
  },

  {
    id: "objetivo",
    keywords: [
      "objetivo",
      "objetivos",
      "resultado buscado",
    ],
    visualType: "process",
    concept:
      "definición clara del objetivo jurídico y del resultado que se pretende alcanzar",
    durationMs: 4500,
    priority: 13,
  },

  {
    id: "diagnostico",
    keywords: [
      "diagnóstico",
      "diagnostico",
      "diagnosticar",
      "diagnostica",
    ],
    visualType: "cta",
    concept:
      "diagnóstico jurídico estratégico previo a la elección de una acción",
    durationMs: 4700,
    priority: 14,
  },
];
