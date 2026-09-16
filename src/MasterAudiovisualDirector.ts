/**
 * V3.14 — MASTER AUDIOVISUAL DIRECTOR
 * NACIDO PARA REINAR / Q∞
 *
 * Función:
 * convertir una narración en una partitura audiovisual temporal.
 *
 * NO renderiza.
 * NO genera assets.
 * NO sustituye V2-SYNC.
 *
 * Decide:
 * - microbeats narrativos
 * - intención
 * - ritmo
 * - duración visual
 * - necesidad de cambio de plano
 * - tipo visual
 * - movimiento
 * - transición
 * - prioridad Bolivia / español
 * - QA temporal
 */

export type BeatIntent =
  | "HOOK"
  | "AUTHORITY"
  | "EXPLANATION"
  | "QUESTION"
  | "WARNING"
  | "EVIDENCE"
  | "CONTRAST"
  | "RISK"
  | "DECISION"
  | "RESOLUTION"
  | "CTA";

export type VisualRole =
  | "CONTRACT"
  | "DOCUMENT"
  | "EVIDENCE"
  | "EXECUTIVE"
  | "RISK"
  | "ASSET"
  | "NEGOTIATION"
  | "LEGAL_ANALYSIS"
  | "DECISION"
  | "CONSTITUTIONAL"
  | "ABSTRACT_SUPPORT";

export type MotionDirection =
  | "PUSH_IN"
  | "PULL_OUT"
  | "PAN_LEFT"
  | "PAN_RIGHT"
  | "DRIFT_UP"
  | "DRIFT_DOWN"
  | "HOLD";

export type TransitionType =
  | "CUT"
  | "SOFT_CUT"
  | "CROSSFADE"
  | "DIP_TO_DARK";

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface AudiovisualBeat {
  id: string;

  text: string;

  startMs: number;
  endMs: number;
  durationMs: number;

  intent: BeatIntent;
  visualRole: VisualRole;

  searchQueries: string[];

  motion: MotionDirection;
  transition: TransitionType;

  emphasis: number;

  locale: "es-BO";
  country: "BO";

  requireSpanishDocument: boolean;
  preferBoliviaContext: boolean;

  forceVisualChange: boolean;
}

export interface DirectorQA {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface AudiovisualScore {
  version: "V3.14";

  productionCode: string;

  totalDurationMs: number;

  beats: AudiovisualBeat[];

  qa: DirectorQA;
}

/* =========================================================
   CONFIGURACIÓN MAESTRA DE RITMO
   ========================================================= */

const MIN_BEAT_MS = 1800;

/**
 * Un recurso estático no debería superar este tiempo
 * salvo decisión narrativa explícita.
 */
const NORMAL_MAX_BEAT_MS = 6500;

const QUESTION_MAX_BEAT_MS = 5000;
const HOOK_MAX_BEAT_MS = 4200;
const CTA_MAX_BEAT_MS = 6500;

/**
 * Guardia absoluta.
 * Un plano accidentalmente superior a esto falla QA.
 */
const ABSOLUTE_MAX_VISUAL_HOLD_MS = 8000;

/* =========================================================
   UTILIDADES
   ========================================================= */

const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const containsAny = (text: string, words: string[]): boolean => {
  const n = normalize(text);
  return words.some((word) => n.includes(normalize(word)));
};

const clamp = (
  value: number,
  min: number,
  max: number
): number => Math.max(min, Math.min(max, value));

/* =========================================================
   INTENCIÓN NARRATIVA
   ========================================================= */

const detectIntent = (
  text: string,
  index: number,
  total: number
): BeatIntent => {
  const n = normalize(text);

  if (index === 0) {
    return "HOOK";
  }

  if (
    text.includes("?") ||
    text.includes("¿")
  ) {
    return "QUESTION";
  }

  if (
    containsAny(n, [
      "riesgo",
      "peligro",
      "costoso",
      "perder",
      "expuesta",
      "incumpl",
      "todo sale mal",
    ])
  ) {
    return "RISK";
  }

  if (
    containsAny(n, [
      "prueba",
      "demostrar",
      "evidencia",
      "document",
      "acreditar",
    ])
  ) {
    return "EVIDENCE";
  }

  if (
    containsAny(n, [
      "pero",
      "sin embargo",
      "aun asi",
      "no basta",
      "solamente",
    ])
  ) {
    return "CONTRAST";
  }

  if (
    containsAny(n, [
      "decidir",
      "decision",
      "resultado",
      "ejecutable",
      "ejecucion",
      "mecanismo",
    ])
  ) {
    return "DECISION";
  }

  if (
    containsAny(n, [
      "antes de",
      "diagnostique",
      "diagnosticar",
      "consulte",
    ]) ||
    index >= total - 1
  ) {
    return "CTA";
  }

  if (
    containsAny(n, [
      "estrategia",
      "profesional",
      "juridicamente",
      "proteccion contractual",
    ])
  ) {
    return "AUTHORITY";
  }

  return "EXPLANATION";
};

/* =========================================================
   ROL VISUAL
   ========================================================= */

const detectVisualRole = (
  text: string,
  intent: BeatIntent
): VisualRole => {
  const n = normalize(text);

  if (
    containsAny(n, [
      "contrato",
      "clausula",
      "firmar",
      "obligacion",
    ])
  ) {
    return "CONTRACT";
  }

  if (
    containsAny(n, [
      "prueba",
      "demostrar",
      "documento",
      "evidencia",
      "acreditar",
    ])
  ) {
    return "EVIDENCE";
  }

  if (
    containsAny(n, [
      "dinero",
      "activo",
      "patrimonio",
      "garantia",
      "empresa",
    ])
  ) {
    return "ASSET";
  }

  if (
    containsAny(n, [
      "negociacion",
      "contraparte",
      "partes",
    ])
  ) {
    return "NEGOTIATION";
  }

  if (
    containsAny(n, [
      "constitucional",
      "constitucion",
    ])
  ) {
    return "CONSTITUTIONAL";
  }

  if (
    intent === "RISK" ||
    intent === "WARNING"
  ) {
    return "RISK";
  }

  if (
    intent === "DECISION" ||
    intent === "RESOLUTION" ||
    intent === "CTA"
  ) {
    return "DECISION";
  }

  if (
    intent === "AUTHORITY"
  ) {
    return "LEGAL_ANALYSIS";
  }

  return "DOCUMENT";
};

/* =========================================================
   BOLIVIA-FIRST / SPANISH-FIRST
   ========================================================= */

const buildSearchQueries = (
  text: string,
  role: VisualRole
): string[] => {
  const base: Record<VisualRole, string[]> = {
    CONTRACT: [
      "contrato empresarial español Bolivia",
      "documento contrato español firma",
      "abogado revisando contrato Latinoamérica",
    ],

    DOCUMENT: [
      "documentos legales español Bolivia",
      "expediente jurídico español",
      "documentación empresarial español",
    ],

    EVIDENCE: [
      "prueba documental proceso legal español",
      "expediente evidencia documentos español",
      "abogado analizando evidencia documental",
    ],

    EXECUTIVE: [
      "ejecutivo empresa Bolivia reunión",
      "empresario latinoamericano oficina",
    ],

    RISK: [
      "riesgo empresarial contrato Latinoamérica",
      "ejecutivo preocupado documentos contrato",
      "controversia empresarial documentos",
    ],

    ASSET: [
      "patrimonio empresa activos Bolivia",
      "activos empresariales Latinoamérica",
      "garantía contractual documentos español",
    ],

    NEGOTIATION: [
      "negociación contractual empresarios Latinoamérica",
      "reunión abogados empresarios contrato",
    ],

    LEGAL_ANALYSIS: [
      "abogado análisis jurídico Bolivia",
      "asesoría jurídica empresarial Bolivia",
      "abogado revisando documentos español",
    ],

    DECISION: [
      "decisión estratégica empresa abogado",
      "asesoría jurídica estratégica empresario",
      "ejecutivo tomando decisión documentos",
    ],

    CONSTITUTIONAL: [
      "Constitución Política del Estado Bolivia",
      "Tribunal Constitucional Bolivia exterior",
      "documento constitucional Bolivia",
    ],

    ABSTRACT_SUPPORT: [
      "estrategia empresarial jurídica",
    ],
  };

  const contextual =
    normalize(text)
      .split(/\s+/)
      .filter((word) => word.length >= 6)
      .slice(0, 5)
      .join(" ");

  return [
    ...(contextual
      ? [`${contextual} Bolivia español`]
      : []),
    ...base[role],
  ].slice(0, 4);
};

/* =========================================================
   MOVIMIENTO
   ========================================================= */

const chooseMotion = (
  intent: BeatIntent,
  index: number
): MotionDirection => {
  if (intent === "HOOK") {
    return "PUSH_IN";
  }

  if (intent === "QUESTION") {
    return "PUSH_IN";
  }

  if (intent === "RISK") {
    return "DRIFT_DOWN";
  }

  if (intent === "EVIDENCE") {
    return index % 2 === 0
      ? "PAN_RIGHT"
      : "PAN_LEFT";
  }

  if (intent === "DECISION") {
    return "PULL_OUT";
  }

  if (intent === "CTA") {
    return "HOLD";
  }

  const cycle: MotionDirection[] = [
    "PUSH_IN",
    "PAN_RIGHT",
    "PULL_OUT",
    "PAN_LEFT",
    "DRIFT_UP",
  ];

  return cycle[index % cycle.length];
};

/* =========================================================
   TRANSICIÓN
   ========================================================= */

const chooseTransition = (
  intent: BeatIntent
): TransitionType => {
  if (
    intent === "HOOK" ||
    intent === "QUESTION" ||
    intent === "CONTRAST"
  ) {
    return "CUT";
  }

  if (
    intent === "CTA" ||
    intent === "RESOLUTION"
  ) {
    return "CROSSFADE";
  }

  return "SOFT_CUT";
};

/* =========================================================
   SEGMENTACIÓN DEL TEXTO
   ========================================================= */

const splitNarrationIntoUnits = (
  narration: string
): string[] => {
  const cleaned = narration
    .replace(/\r/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return [];
  }

  /**
   * Conserva preguntas y divide en unidades suficientemente
   * pequeñas para montaje.
   */
  const sentences =
    cleaned.match(/[^.!?¿]+[.!?]?/g) ?? [cleaned];

  const units: string[] = [];

  for (const raw of sentences) {
    const sentence = raw.trim();

    if (!sentence) {
      continue;
    }

    /**
     * Una frase excesivamente larga se subdivide por
     * conectores naturales y signos.
     */
    const pieces = sentence
      .split(
        /(?<=,)\s+|(?<=;)\s+|\s+(?=porque|pero|aunque|cuando|después|entonces|por eso|primero|antes de)/i
      )
      .map((piece) => piece.trim())
      .filter(Boolean);

    for (const piece of pieces) {
      if (piece.length > 0) {
        units.push(piece);
      }
    }
  }

  return units;
};

/* =========================================================
   ALINEACIÓN CON TIMELINE REAL
   ========================================================= */

const findUnitTiming = (
  unit: string,
  words: WordTiming[],
  cursor: number
): {
  startMs: number;
  endMs: number;
  nextCursor: number;
} => {
  const tokens = normalize(unit)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0 || words.length === 0) {
    return {
      startMs: 0,
      endMs: 0,
      nextCursor: cursor,
    };
  }

  const startIndex = clamp(
    cursor,
    0,
    Math.max(0, words.length - 1)
  );

  const targetCount = tokens.length;

  const endIndex = clamp(
    startIndex + targetCount - 1,
    startIndex,
    words.length - 1
  );

  return {
    startMs: words[startIndex].startMs,
    endMs: words[endIndex].endMs,
    nextCursor: endIndex + 1,
  };
};

/* =========================================================
   DURACIÓN Y SUBDIVISIÓN
   ========================================================= */

const maxDurationForIntent = (
  intent: BeatIntent
): number => {
  if (intent === "HOOK") {
    return HOOK_MAX_BEAT_MS;
  }

  if (intent === "QUESTION") {
    return QUESTION_MAX_BEAT_MS;
  }

  if (intent === "CTA") {
    return CTA_MAX_BEAT_MS;
  }

  return NORMAL_MAX_BEAT_MS;
};

const calculateEmphasis = (
  intent: BeatIntent
): number => {
  switch (intent) {
    case "HOOK":
      return 1;

    case "QUESTION":
      return 0.95;

    case "WARNING":
    case "RISK":
      return 0.9;

    case "DECISION":
    case "RESOLUTION":
      return 0.9;

    case "CTA":
      return 1;

    case "AUTHORITY":
      return 0.82;

    default:
      return 0.65;
  }
};

/* =========================================================
   QA DEL DIRECTOR
   ========================================================= */

const runDirectorQA = (
  beats: AudiovisualBeat[]
): DirectorQA => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (beats.length === 0) {
    errors.push(
      "La partitura audiovisual no contiene beats."
    );
  }

  beats.forEach((beat, index) => {
    if (
      beat.durationMs >
      ABSOLUTE_MAX_VISUAL_HOLD_MS
    ) {
      errors.push(
        `Beat ${beat.id} mantiene un plano ${beat.durationMs} ms. Supera el máximo absoluto de ${ABSOLUTE_MAX_VISUAL_HOLD_MS} ms.`
      );
    }

    if (
      beat.durationMs < MIN_BEAT_MS &&
      beat.intent !== "QUESTION"
    ) {
      warnings.push(
        `Beat ${beat.id} es muy breve: ${beat.durationMs} ms.`
      );
    }

    if (
      index > 0 &&
      beat.visualRole ===
        beats[index - 1].visualRole &&
      beat.motion === beats[index - 1].motion
    ) {
      warnings.push(
        `Beats ${beats[index - 1].id} y ${beat.id} tienen rol visual y movimiento idénticos.`
      );
    }
  });

  const first = beats[0];

  if (first && first.intent !== "HOOK") {
    warnings.push(
      "El primer beat no fue clasificado como HOOK."
    );
  }

  const hasCTA = beats.some(
    (beat) => beat.intent === "CTA"
  );

  if (!hasCTA) {
    warnings.push(
      "No se detectó un CTA audiovisual."
    );
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
};

/* =========================================================
   DIRECTOR MAESTRO
   ========================================================= */

export const directAudiovisualProduction = ({
  productionCode,
  narration,
  wordTimeline,
}: {
  productionCode: string;
  narration: string;
  wordTimeline: WordTiming[];
}): AudiovisualScore => {
  const units =
    splitNarrationIntoUnits(narration);

  const beats: AudiovisualBeat[] = [];

  let wordCursor = 0;

  units.forEach((unit, index) => {
    const timing = findUnitTiming(
      unit,
      wordTimeline,
      wordCursor
    );

    wordCursor = timing.nextCursor;

    const intent = detectIntent(
      unit,
      index,
      units.length
    );

    const visualRole = detectVisualRole(
      unit,
      intent
    );

    const rawDuration =
      timing.endMs - timing.startMs;

    const maxDuration =
      maxDurationForIntent(intent);

    /**
     * Si una unidad excede el máximo permitido,
     * la marcamos para cambio visual.
     *
     * El renderer/orquestador podrá insertar
     * visuales secundarios dentro de ese intervalo.
     */
    const forceVisualChange =
      rawDuration > maxDuration;

    beats.push({
      id: `${productionCode}-beat-${String(
        index + 1
      ).padStart(3, "0")}`,

      text: unit,

      startMs: timing.startMs,
      endMs: timing.endMs,

      durationMs: Math.max(
        0,
        rawDuration
      ),

      intent,
      visualRole,

      searchQueries: buildSearchQueries(
        unit,
        visualRole
      ),

      motion: chooseMotion(
        intent,
        index
      ),

      transition:
        chooseTransition(intent),

      emphasis:
        calculateEmphasis(intent),

      locale: "es-BO",
      country: "BO",

      requireSpanishDocument:
        visualRole === "CONTRACT" ||
        visualRole === "DOCUMENT" ||
        visualRole === "EVIDENCE" ||
        visualRole === "CONSTITUTIONAL",

      preferBoliviaContext: true,

      /**
       * Cada nueva unidad semántica es candidata
       * a nuevo plano. Si además excede la duración
       * máxima, el cambio es obligatorio.
       */
      forceVisualChange:
        forceVisualChange ||
        index === 0 ||
        intent === "QUESTION" ||
        intent === "CONTRAST" ||
        intent === "RISK" ||
        intent === "CTA",
    });
  });

  const qa = runDirectorQA(beats);

  const totalDurationMs =
    beats.length > 0
      ? beats[beats.length - 1].endMs
      : 0;

  return {
    version: "V3.14",
    productionCode,
    totalDurationMs,
    beats,
    qa,
  };
};

/* =========================================================
   EXPORT DE CONFIGURACIÓN PARA QA EXTERNO
   ========================================================= */

export const MASTER_AUDIOVISUAL_LIMITS = {
  minBeatMs: MIN_BEAT_MS,
  normalMaxBeatMs: NORMAL_MAX_BEAT_MS,
  hookMaxBeatMs: HOOK_MAX_BEAT_MS,
  questionMaxBeatMs: QUESTION_MAX_BEAT_MS,
  ctaMaxBeatMs: CTA_MAX_BEAT_MS,
  absoluteMaxVisualHoldMs:
    ABSOLUTE_MAX_VISUAL_HOLD_MS,

  locale: "es-BO",
  country: "BO",

  boliviaFirst: true,
  spanishDocumentsFirst: true,
} as const;
