export type SemanticVisualType =
  | "document"
  | "keyword"
  | "evidence"
  | "process"
  | "warning"
  | "cta";

export type SemanticRule = {
  id: string;
  keywords: string[];
  visualType: SemanticVisualType;
  concept: string;
  durationMs: number;
  priority: number;
};

export const semanticRules: SemanticRule[] = [
  {
    id: "expediente",
    keywords: [
      "expediente",
      "expedientes",
      "revisar el expediente",
    ],
    visualType: "document",
    concept:
      "expediente jurídico físico o digital claramente identificado como EXPEDIENTE",
    durationMs: 5000,
    priority: 12,
  },

  {
    id: "plazos",
    keywords: [
      "plazo",
      "plazos",
      "término",
      "términos",
      "vencer el plazo",
    ],
    visualType: "warning",
    concept:
      "plazo procesal con reloj, calendario y señal temporal claramente visible",
    durationMs: 5000,
    priority: 12,
  },

  {
    id: "recurso",
    keywords: [
      "recurso",
      "recursos",
      "impugnación",
      "impugnar",
    ],
    visualType: "document",
    concept:
      "recurso jurídico formal claramente identificado como RECURSO",
    durationMs: 4800,
    priority: 11,
  },

  {
    id: "motivacion",
    keywords: [
      "motivación",
      "motivar",
      "fundamentación",
      "fundamentar",
      "razones",
    ],
    visualType: "document",
    concept:
      "resolución mostrando fundamentos y razones jurídicas",
    durationMs: 4800,
    priority: 10,
  },

  {
    id: "argumentos",
    keywords: [
      "argumento",
      "argumentos",
      "alegación",
      "alegaciones",
      "planteamientos",
    ],
    visualType: "evidence",
    concept:
      "argumentos jurídicos incorporándose y siendo evaluados",
    durationMs: 4500,
    priority: 10,
  },

  {
    id: "prueba",
    keywords: [
      "prueba",
      "pruebas",
      "evidencia",
      "elementos probatorios",
    ],
    visualType: "evidence",
    concept:
      "documentos y elementos probatorios siendo examinados",
    durationMs: 4500,
    priority: 10,
  },

  {
    id: "debido-proceso",
    keywords: [
      "debido proceso",
      "derecho al debido proceso",
    ],
    visualType: "process",
    concept:
      "protección constitucional del debido proceso",
    durationMs: 5200,
    priority: 12,
  },

  {
    id: "defensa",
    keywords: [
      "defensa",
      "derecho a la defensa",
    ],
    visualType: "process",
    concept:
      "ejercicio efectivo del derecho a la defensa",
    durationMs: 4800,
    priority: 11,
  },

  {
    id: "autoridad",
    keywords: [
      "autoridad",
      "autoridad pública",
      "autoridad administrativa",
    ],
    visualType: "process",
    concept:
      "autoridad revisando profesionalmente un expediente antes de decidir",
    durationMs: 4500,
    priority: 9,
  },

  {
    id: "decision",
    keywords: [
      "decisión",
      "resolución",
      "pronunciamiento",
      "resolver",
      "resuelve",
    ],
    visualType: "document",
    concept:
      "resolución jurídica final estructurada y fundamentada",
    durationMs: 4800,
    priority: 10,
  },

  {
    id: "ignorar",
    keywords: [
      "ignorar",
      "ignora",
      "omitió",
      "omitir",
      "omisión",
    ],
    visualType: "warning",
    concept:
      "argumento jurídicamente relevante omitido de una decisión",
    durationMs: 4300,
    priority: 11,
  },

  {
    id: "vulneracion",
    keywords: [
      "vulneración",
      "vulnerar",
      "violación",
      "afectación",
    ],
    visualType: "warning",
    concept:
      "vulneración de una garantía o derecho fundamental",
    durationMs: 4500,
    priority: 11,
  },

  {
    id: "accion-final",
    keywords: [
      "reclamar",
      "defender",
      "exigir",
      "actuar",
      "estrategia",
    ],
    visualType: "cta",
    concept:
      "acción jurídica estratégica frente al problema detectado",
    durationMs: 5000,
    priority: 8,
  },
];
