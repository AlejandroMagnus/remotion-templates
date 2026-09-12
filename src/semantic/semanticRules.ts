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
    id: "motivacion",
    keywords: ["motivación", "motivar", "razones", "fundamentar"],
    visualType: "document",
    concept:
      "resolución jurídica mostrando fundamentos, razones y motivación",
    durationMs: 2800,
    priority: 10,
  },

  {
    id: "argumentos",
    keywords: ["argumentos", "alegaciones", "planteamientos"],
    visualType: "evidence",
    concept:
      "argumentos jurídicos ingresando y siendo considerados dentro del expediente",
    durationMs: 2600,
    priority: 9,
  },

  {
    id: "prueba",
    keywords: ["prueba", "pruebas", "evidencia", "elementos probatorios"],
    visualType: "evidence",
    concept:
      "documentos y elementos probatorios relevantes dentro de un expediente",
    durationMs: 2600,
    priority: 9,
  },

  {
    id: "debido-proceso",
    keywords: ["debido proceso", "derecho al debido proceso"],
    visualType: "process",
    concept:
      "protección constitucional del debido proceso y garantías procesales",
    durationMs: 3000,
    priority: 10,
  },

  {
    id: "defensa",
    keywords: ["defensa", "derecho a la defensa"],
    visualType: "process",
    concept:
      "persona ejerciendo efectivamente su derecho a la defensa dentro del procedimiento",
    durationMs: 2800,
    priority: 10,
  },

  {
    id: "autoridad",
    keywords: ["autoridad", "autoridad pública", "autoridad administrativa"],
    visualType: "document",
    concept:
      "autoridad analizando formalmente un expediente antes de emitir una decisión",
    durationMs: 2400,
    priority: 8,
  },

  {
    id: "ignorar",
    keywords: ["ignorar", "ignora", "omitió", "omitir", "omisión"],
    visualType: "warning",
    concept:
      "argumento relevante omitido de una decisión con énfasis visual de advertencia",
    durationMs: 2400,
    priority: 10,
  },

  {
    id: "decision",
    keywords: ["decisión", "resolución", "resuelve", "pronunciamiento"],
    visualType: "document",
    concept:
      "resolución jurídica final claramente estructurada y fundamentada",
    durationMs: 2800,
    priority: 9,
  },

  {
    id: "vulneracion",
    keywords: ["vulneración", "vulnerar", "violación", "afectación"],
    visualType: "warning",
    concept:
      "señal visual de vulneración de una garantía o derecho fundamental",
    durationMs: 2500,
    priority: 10,
  },

  {
    id: "accion-final",
    keywords: ["impugnar", "reclamar", "defender", "exigir"],
    visualType: "cta",
    concept:
      "acción jurídica clara y estratégica como respuesta frente a la vulneración",
    durationMs: 2600,
    priority: 8,
  },
];
