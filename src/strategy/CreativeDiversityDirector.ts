/**
 * V3.18-E.2 — CREATIVE DIVERSITY DIRECTOR
 * + ADAPTIVE HUMAN VOCAL PERFORMANCE DIRECTION
 *
 * Decide CÓMO debe sentirse una producción.
 *
 * No selecciona el tema jurídico.
 * No selecciona assets.
 * No renderiza.
 *
 * Ahora dirige también la intención interpretativa
 * general de la voz para que el motor prosódico pueda
 * decidir dinámicamente:
 *
 * significado + sintaxis + intención + ritmo creativo
 * → velocidad + respiración + pausa + énfasis + cadencia.
 *
 * IMPORTANTE:
 * `prosody` se conserva por compatibilidad con V3.18.
 * `vocalDirection` añade la nueva dirección adaptativa.
 */

export type CreativeGenre =
  | "strategic-editorial"
  | "cinematic-microcase"
  | "masterclass"
  | "business-reconstruction"
  | "contrast"
  | "legal-documentary"
  | "decision-simulation"
  | "visual-strategy-map";

export type NarrativeArchitecture =
  | "problem-analysis-solution"
  | "case-tension-resolution"
  | "question-demonstration-conclusion"
  | "chronological-reconstruction"
  | "before-after"
  | "context-evidence-meaning"
  | "decision-consequence"
  | "system-map";

export type RhythmProfile =
  | "measured"
  | "progressive"
  | "dynamic"
  | "pedagogical"
  | "documentary"
  | "contrastive"
  | "decisive"
  | "analytical";

export type VisualLanguage =
  | "cinematic-realism"
  | "editorial-analysis"
  | "documentary-evidence"
  | "executive-business"
  | "graphic-explanation"
  | "parallel-contrast"
  | "procedural-immersion"
  | "strategic-diagram";

export type CameraProfile =
  | "controlled-cinematic"
  | "progressive-tension"
  | "observational"
  | "executive-precision"
  | "pedagogical-focus"
  | "contrast-motion"
  | "immersive-decision"
  | "diagrammatic";

export type TransitionProfile =
  | "soft"
  | "decisive"
  | "documentary"
  | "precision"
  | "contrast"
  | "continuous"
  | "minimal"
  | "mixed";

export type GraphicDensity =
  | "minimal"
  | "low"
  | "medium"
  | "high";

export type ProsodyProfile =
  | "authoritative"
  | "dramatic-controlled"
  | "professorial"
  | "investigative"
  | "executive"
  | "contrastive"
  | "decisive"
  | "analytical";

export type CtaStrategy =
  | "diagnostic"
  | "authority"
  | "preventive"
  | "consultative"
  | "decision"
  | "reflection";

/**
 * Intenciones locales que el motor vocal podrá asignar
 * posteriormente a cada frase/unidad semántica.
 */
export type VocalMoment =
  | "opening"
  | "question"
  | "explanation"
  | "evidence"
  | "warning"
  | "contrast"
  | "revelation"
  | "authority"
  | "reflection"
  | "decision"
  | "cta"
  | "closing";

/**
 * Dirección vocal de alto nivel.
 *
 * No fija cada pausa.
 * Define un espacio de interpretación humana dentro
 * del cual el Director Vocal podrá actuar.
 */
export type AdaptiveVocalDirection = {
  mode: "adaptive-human-performance";

  /**
   * Banda objetivo global.
   * No obliga a hablar siempre a esa velocidad.
   */
  targetWpm: {
    min: number;
    preferred: number;
    max: number;
  };

  /**
   * Variación permitida dentro de una misma producción.
   */
  tempoVariation: {
    minRatePercent: number;
    maxRatePercent: number;
  };

  /**
   * Respiración: rango, no valor rígido.
   */
  breathing: {
    microPauseMs: {
      min: number;
      max: number;
    };

    phrasePauseMs: {
      min: number;
      max: number;
    };

    conceptualPauseMs: {
      min: number;
      max: number;
    };

    /**
     * Evita insertar respiraciones artificiales
     * en cada signo de puntuación.
     */
    preserveSentenceFlow: boolean;
  };

  /**
   * Intensidad expresiva 0–100.
   */
  expression: {
    emphasis: number;
    pitchVariation: number;
    dynamicRange: number;
  };

  /**
   * El ritmo debe poder reaccionar a estos momentos.
   */
  momentPriority: VocalMoment[];

  /**
   * Principios interpretativos para QA y dirección.
   */
  principles: string[];

  avoid: string[];
};

export type MediaMix = {
  photo: number;
  video: number;
  graphic: number;
  threeD: number;
};

export type CreativeProfile = {
  /**
   * Conservamos literal V3.18-A para no romper
   * validadores/memoria ya desplegados.
   */
  version: "V3.18-A";

  genre: CreativeGenre;

  narrativeArchitecture:
    NarrativeArchitecture;

  rhythm:
    RhythmProfile;

  visualLanguage:
    VisualLanguage;

  cameraProfile:
    CameraProfile;

  transitionProfile:
    TransitionProfile;

  graphicDensity:
    GraphicDensity;

  /**
   * Perfil global legado/compatible.
   */
  prosody:
    ProsodyProfile;

  /**
   * Nueva dirección interpretativa V3.18-E.2.
   */
  vocalDirection:
    AdaptiveVocalDirection;

  ctaStrategy:
    CtaStrategy;

  mediaMix:
    MediaMix;

  targetDurationSeconds: {
    min: number;
    preferred: number;
    max: number;
  };

  creativePrinciples: string[];

  avoid: string[];
};

export type CreativeMemoryItem = {
  productionCode: string;

  genre:
    CreativeGenre;

  narrativeArchitecture:
    NarrativeArchitecture;

  rhythm:
    RhythmProfile;

  visualLanguage:
    VisualLanguage;

  prosody:
    ProsodyProfile;

  ctaStrategy:
    CtaStrategy;
};

export type CreativeIntent = {
  productionCode: string;

  topic: string;

  thesis: string;

  problem: string;

  capabilities: string[];

  commercialObjective: string;
};

export type CreativeCandidate = {
  profile:
    CreativeProfile;

  baseScore:
    number;

  diversityScore:
    number;

  semanticScore:
    number;

  finalScore:
    number;

  reasons:
    string[];
};

export type CreativeDecision = {
  productionCode: string;

  selected:
    CreativeProfile;

  ranking:
    CreativeCandidate[];

  memorySize:
    number;

  rationale:
    string[];
};

const clamp = (
  value: number,
): number =>
  Math.max(
    0,
    Math.min(
      100,
      Math.round(value),
    ),
  );

const normalize = (
  value: string,
): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9ñ\s]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();

const containsAny = (
  text: string,
  markers: string[],
): boolean =>
  markers.some(
    (marker) =>
      text.includes(
        normalize(marker),
      ),
  );

/**
 * Construye una dirección vocal adaptativa reutilizable.
 *
 * Los valores son bandas operativas del Director,
 * no temporizadores rígidos.
 */
const vocalDirection = (
  preferredWpm: number,
  minWpm: number,
  maxWpm: number,
  minRatePercent: number,
  maxRatePercent: number,
  emphasis: number,
  pitchVariation: number,
  dynamicRange: number,
  momentPriority: VocalMoment[],
  principles: string[],
): AdaptiveVocalDirection => ({
  mode:
    "adaptive-human-performance",

  targetWpm: {
    min:
      minWpm,

    preferred:
      preferredWpm,

    max:
      maxWpm,
  },

  tempoVariation: {
    minRatePercent,
    maxRatePercent,
  },

  breathing: {
    microPauseMs: {
      min: 35,
      max: 110,
    },

    phrasePauseMs: {
      min: 130,
      max: 290,
    },

    conceptualPauseMs: {
      min: 240,
      max: 520,
    },

    preserveSentenceFlow:
      true,
  },

  expression: {
    emphasis,
    pitchVariation,
    dynamicRange,
  },

  momentPriority,

  principles,

  avoid: [
    "ritmo metronómico",
    "pausa idéntica para signos iguales",
    "respiración artificial en cada coma",
    "velocidad constante durante toda la pieza",
    "énfasis indiscriminado",
    "silencios que rompan innecesariamente una oración",
  ],
});


const PROFILES:
  CreativeProfile[] = [
    {
      version:
        "V3.18-A",

      genre:
        "strategic-editorial",

      narrativeArchitecture:
        "problem-analysis-solution",

      rhythm:
        "measured",

      visualLanguage:
        "editorial-analysis",

      cameraProfile:
        "controlled-cinematic",

      transitionProfile:
        "soft",

      graphicDensity:
        "low",

      prosody:
        "authoritative",

      vocalDirection:
        vocalDirection(
          150,
          132,
          166,
          -7,
          6,
          66,
          38,
          58,
          [
            "opening",
            "authority",
            "warning",
            "revelation",
            "cta",
          ],
          [
            "Autoridad sin lentitud artificial.",
            "Explicación fluida entre ideas críticas.",
            "Desacelerar únicamente cuando el significado lo justifique.",
            "La pausa debe comunicar jerarquía, no interrumpir el pensamiento.",
          ],
        ),

      ctaStrategy:
        "diagnostic",

      mediaMix: {
        photo: 30,
        video: 45,
        graphic: 25,
        threeD: 0,
      },

      targetDurationSeconds: {
        min: 50,
        preferred: 70,
        max: 95,
      },

      creativePrinciples: [
        "Autoridad sobria.",
        "Una idea dominante por unidad.",
        "Visuales directamente vinculados al argumento.",
        "Ritmo controlado y premium.",
      ],

      avoid: [
        "slideshow",
        "exceso de texto",
        "dramatización artificial",
        "clichés jurídicos repetitivos",
      ],
    },

    {
      version:
        "V3.18-A",

      genre:
        "cinematic-microcase",

      narrativeArchitecture:
        "case-tension-resolution",

      rhythm:
        "progressive",

      visualLanguage:
        "cinematic-realism",

      cameraProfile:
        "progressive-tension",

      transitionProfile:
        "decisive",

      graphicDensity:
        "minimal",

      prosody:
        "dramatic-controlled",

      vocalDirection:
        vocalDirection(
          148,
          124,
          168,
          -11,
          8,
          76,
          52,
          74,
          [
            "opening",
            "warning",
            "decision",
            "revelation",
            "reflection",
            "closing",
          ],
          [
            "Construir tensión mediante variación, no mediante lentitud permanente.",
            "Acelerar la reconstrucción cuando la comprensión lo permita.",
            "Reservar silencio perceptible para decisiones y revelaciones.",
            "Mantener continuidad melódica dentro de cada oración.",
          ],
        ),

      ctaStrategy:
        "reflection",

      mediaMix: {
        photo: 15,
        video: 70,
        graphic: 10,
        threeD: 5,
      },

      targetDurationSeconds: {
        min: 45,
        preferred: 65,
        max: 90,
      },

      creativePrinciples: [
        "Comenzar dentro de una situación concreta.",
        "Construir tensión sin sensacionalismo.",
        "Mostrar decisiones y consecuencias.",
        "Resolver mediante inteligencia jurídica.",
      ],

      avoid: [
        "estructura de conferencia",
        "listas largas",
        "tarjetas textuales sucesivas",
        "stock jurídico genérico",
      ],
    },

    {
      version:
        "V3.18-A",

      genre:
        "masterclass",

      narrativeArchitecture:
        "question-demonstration-conclusion",

      rhythm:
        "pedagogical",

      visualLanguage:
        "graphic-explanation",

      cameraProfile:
        "pedagogical-focus",

      transitionProfile:
        "minimal",

      graphicDensity:
        "high",

      prosody:
        "professorial",

      vocalDirection:
        vocalDirection(
          145,
          128,
          158,
          -8,
          4,
          62,
          36,
          54,
          [
            "question",
            "explanation",
            "evidence",
            "authority",
            "closing",
          ],
          [
            "Priorizar comprensión sobre velocidad.",
            "Acelerar aquello que el espectador ya puede anticipar.",
            "Dar espacio respiratorio a conceptos nuevos.",
            "No convertir claridad pedagógica en monotonía.",
          ],
        ),

      ctaStrategy:
        "authority",

      mediaMix: {
        photo: 10,
        video: 25,
        graphic: 60,
        threeD: 5,
      },

      targetDurationSeconds: {
        min: 55,
        preferred: 80,
        max: 110,
      },

      creativePrinciples: [
        "Explicar una idea difícil con claridad.",
        "Visualizar relaciones y conceptos.",
        "Jerarquía pedagógica.",
        "Construir autoridad intelectual.",
      ],

      avoid: [
        "dramatización innecesaria",
        "movimiento permanente",
        "decoración sin función",
        "densidad verbal excesiva",
      ],
    },
      {
      version:
        "V3.18-A",

      genre:
        "business-reconstruction",

      narrativeArchitecture:
        "chronological-reconstruction",

      rhythm:
        "analytical",

      visualLanguage:
        "executive-business",

      cameraProfile:
        "executive-precision",

      transitionProfile:
        "precision",

      graphicDensity:
        "medium",

      prosody:
        "executive",

      vocalDirection:
        vocalDirection(
          158,
          142,
          172,
          -4,
          9,
          58,
          30,
          52,
          [
            "opening",
            "evidence",
            "explanation",
            "decision",
            "cta",
          ],
          [
            "Mantener fluidez ejecutiva y precisión.",
            "Evitar solemnidad innecesaria en hechos y cronologías.",
            "Desacelerar ante cifras, decisiones o consecuencias relevantes.",
            "Usar respiraciones conceptuales para separar etapas, no frases arbitrarias.",
          ],
        ),

      ctaStrategy:
        "consultative",

      mediaMix: {
        photo: 20,
        video: 55,
        graphic: 20,
        threeD: 5,
      },

      targetDurationSeconds: {
        min: 55,
        preferred: 75,
        max: 105,
      },

      creativePrinciples: [
        "Reconstruir hechos y decisiones.",
        "Mostrar documentos y contexto empresarial.",
        "Conectar causa con consecuencia.",
        "Mantener credibilidad ejecutiva.",
      ],

      avoid: [
        "tribunales genéricos sin contexto",
        "drama artificial",
        "gráficos decorativos",
        "cronología confusa",
      ],
    },

    {
      version:
        "V3.18-A",

      genre:
        "contrast",

      narrativeArchitecture:
        "before-after",

      rhythm:
        "contrastive",

      visualLanguage:
        "parallel-contrast",

      cameraProfile:
        "contrast-motion",

      transitionProfile:
        "contrast",

      graphicDensity:
        "medium",

      prosody:
        "contrastive",

      vocalDirection:
        vocalDirection(
          154,
          136,
          170,
          -6,
          8,
          70,
          44,
          68,
          [
            "contrast",
            "warning",
            "revelation",
            "decision",
            "closing",
          ],
          [
            "Diferenciar escenarios mediante cadencia y énfasis.",
            "No sobreactuar el contraste.",
            "Permitir mayor velocidad en la preparación y menor velocidad en la diferencia decisiva.",
            "La pausa debe reforzar el cambio de escenario o significado.",
          ],
        ),

      ctaStrategy:
        "preventive",

      mediaMix: {
        photo: 20,
        video: 45,
        graphic: 30,
        threeD: 5,
      },

      targetDurationSeconds: {
        min: 40,
        preferred: 60,
        max: 85,
      },

      creativePrinciples: [
        "Contraponer dos decisiones o escenarios.",
        "Hacer visible la diferencia estratégica.",
        "Utilizar paralelismo visual.",
        "Cerrar con una regla memorable.",
      ],

      avoid: [
        "explicación lineal prolongada",
        "escenas visualmente equivalentes",
        "CTA genérico",
        "transiciones uniformes",
      ],
    },

    {
      version:
        "V3.18-A",

      genre:
        "legal-documentary",

      narrativeArchitecture:
        "context-evidence-meaning",

      rhythm:
        "documentary",

      visualLanguage:
        "documentary-evidence",

      cameraProfile:
        "observational",

      transitionProfile:
        "documentary",

      graphicDensity:
        "low",

      prosody:
        "investigative",

      vocalDirection:
        vocalDirection(
          146,
          128,
          160,
          -8,
          5,
          64,
          40,
          60,
          [
            "opening",
            "evidence",
            "question",
            "revelation",
            "reflection",
            "closing",
          ],
          [
            "Dar sensación de investigación sin lentitud permanente.",
            "Permitir que hechos y evidencia respiren.",
            "Mantener continuidad narrativa entre evidencia y significado.",
            "Reservar las pausas más profundas para revelaciones o conclusiones.",
          ],
        ),

      ctaStrategy:
        "authority",

      mediaMix: {
        photo: 25,
        video: 50,
        graphic: 20,
        threeD: 5,
      },

      targetDurationSeconds: {
        min: 60,
        preferred: 85,
        max: 120,
      },

      creativePrinciples: [
        "Contextualizar antes de concluir.",
        "Dar protagonismo a hechos y evidencia.",
        "Construir credibilidad documental.",
        "Permitir pausas visuales.",
      ],

      avoid: [
        "publicidad evidente",
        "montaje frenético",
        "afirmaciones sin soporte visual",
        "estética excesivamente promocional",
      ],
    },

    {
      version:
        "V3.18-A",

      genre:
        "decision-simulation",

      narrativeArchitecture:
        "decision-consequence",

      rhythm:
        "decisive",

      visualLanguage:
        "procedural-immersion",

      cameraProfile:
        "immersive-decision",

      transitionProfile:
        "mixed",

      graphicDensity:
        "medium",

      prosody:
        "decisive",

      vocalDirection:
        vocalDirection(
          158,
          140,
          174,
          -5,
          10,
          74,
          42,
          72,
          [
            "opening",
            "decision",
            "contrast",
            "warning",
            "revelation",
            "cta",
          ],
          [
            "Avanzar con energía hacia la decisión.",
            "No confundir firmeza con velocidad constante.",
            "Reducir temporalmente el ritmo antes de una consecuencia crítica.",
            "Recuperar fluidez después del momento decisivo.",
          ],
        ),

      ctaStrategy:
        "decision",

      mediaMix: {
        photo: 10,
        video: 60,
        graphic: 25,
        threeD: 5,
      },

      targetDurationSeconds: {
        min: 45,
        preferred: 65,
        max: 90,
      },

      creativePrinciples: [
        "Situar al espectador ante una decisión.",
        "Mostrar alternativas.",
        "Visualizar consecuencias.",
        "Revelar el criterio estratégico.",
      ],

      avoid: [
        "respuesta obvia desde el inicio",
        "narración abstracta",
        "listas desconectadas",
        "repetición de una sola escena",
      ],
    },

    {
      version:
        "V3.18-A",

      genre:
        "visual-strategy-map",

      narrativeArchitecture:
        "system-map",

      rhythm:
        "analytical",

      visualLanguage:
        "strategic-diagram",

      cameraProfile:
        "diagrammatic",

      transitionProfile:
        "continuous",

      graphicDensity:
        "high",

      prosody:
        "analytical",

      vocalDirection:
        vocalDirection(
          148,
          130,
          162,
          -7,
          5,
          60,
          34,
          56,
          [
            "opening",
            "explanation",
            "evidence",
            "contrast",
            "authority",
            "closing",
          ],
          [
            "Sincronizar la explicación con la construcción conceptual.",
            "Dar tiempo adicional a relaciones nuevas o complejas.",
            "Mantener fluidez cuando se recorren elementos ya establecidos.",
            "Evitar que la precisión analítica produzca una voz mecánica.",
          ],
        ),

      ctaStrategy:
        "diagnostic",

      mediaMix: {
        photo: 5,
        video: 20,
        graphic: 65,
        threeD: 10,
      },

      targetDurationSeconds: {
        min: 50,
        preferred: 75,
        max: 105,
      },

      creativePrinciples: [
        "Convertir complejidad en estructura.",
        "Mostrar relaciones entre elementos.",
        "Construir el razonamiento progresivamente.",
        "Mantener orientación espacial y conceptual.",
      ],

      avoid: [
        "diagrama saturado",
        "texto microscópico",
        "animaciones sin significado",
        "cambio de estructura sin continuidad",
      ],
    },
  ];

const semanticFit = (
  intent: CreativeIntent,
  profile: CreativeProfile,
): {
  score: number;
  reasons: string[];
} => {
  const text =
    normalize(
      [
        intent.topic,
        intent.thesis,
        intent.problem,
        intent.capabilities.join(
          " ",
        ),
        intent.commercialObjective,
      ].join(" "),
    );

  let score = 50;

  const reasons:
    string[] = [];

  const add = (
    amount: number,
    reason: string,
  ) => {
    score += amount;

    reasons.push(
      `${reason}:${amount >= 0 ? "+" : ""}${amount}`,
    );
  };

  if (
    containsAny(
      text,
      [
        "caso",
        "conflicto",
        "incumplimiento",
        "error",
        "crisis",
        "litigio",
      ],
    )
  ) {
    if (
      profile.genre ===
      "cinematic-microcase"
    ) {
      add(
        18,
        "case-fit",
      );
    }

    if (
      profile.genre ===
      "business-reconstruction"
    ) {
      add(
        12,
        "reconstruction-fit",
      );
    }
  }

  if (
    containsAny(
      text,
      [
        "antes",
        "despues",
        "después",
        "alternativa",
        "comparar",
        "diferencia",
      ],
    ) &&
    profile.genre ===
      "contrast"
  ) {
    add(
      20,
      "contrast-fit",
    );
  }

  if (
    containsAny(
      text,
      [
        "prueba",
        "evidencia",
        "hechos",
        "documento",
        "expediente",
      ],
    )
  ) {
    if (
      profile.genre ===
      "legal-documentary"
    ) {
      add(
        18,
        "evidence-fit",
      );
    }

    if (
      profile.genre ===
      "business-reconstruction"
    ) {
      add(
        8,
        "document-fit",
      );
    }
  }

  if (
    containsAny(
      text,
      [
        "decidir",
        "decision",
        "decisión",
        "alternativas",
        "escenario",
      ],
    ) &&
    profile.genre ===
      "decision-simulation"
  ) {
    add(
      20,
      "decision-fit",
    );
  }

  if (
    containsAny(
      text,
      [
        "metodo",
        "método",
        "estructura",
        "sistema",
        "ruta",
        "proceso",
        "arquitectura",
      ],
    )
  ) {
    if (
      profile.genre ===
      "visual-strategy-map"
    ) {
      add(
        18,
        "system-fit",
      );
    }

    if (
      profile.genre ===
      "masterclass"
    ) {
      add(
        10,
        "teaching-fit",
      );
    }
  }

  if (
    containsAny(
      text,
      [
        "empresa",
        "empresarial",
        "inversion",
        "inversión",
        "contrato",
        "patrimonio",
        "operacion",
        "operación",
      ],
    ) &&
    profile.genre ===
      "business-reconstruction"
  ) {
    add(
      15,
      "business-fit",
    );
  }

  if (
    containsAny(
      text,
      [
        "explicar",
        "comprender",
        "criterio",
        "regla",
        "principio",
      ],
    ) &&
    profile.genre ===
      "masterclass"
  ) {
    add(
      16,
      "masterclass-fit",
    );
  }

  /*
   * strategic-editorial conserva
   * un pequeño valor base porque
   * funciona como lenguaje universal,
   * pero NO debe dominar siempre.
   */
  if (
    profile.genre ===
    "strategic-editorial"
  ) {
    add(
      4,
      "universal-fit",
    );
  }

  return {
    score:
      clamp(score),

    reasons,
  };
};
const diversityFit = (
  profile: CreativeProfile,
  memory: CreativeMemoryItem[],
): {
  score: number;
  reasons: string[];
} => {
  if (
    memory.length === 0
  ) {
    return {
      score: 100,
      reasons: [
        "no-creative-history:+100",
      ],
    };
  }

  let score = 100;

  const reasons:
    string[] = [];

  const recent =
    memory.slice(
      -3,
    );

  const last =
    recent[
      recent.length - 1
    ];

  const penalize = (
    amount: number,
    reason: string,
  ) => {
    score -= amount;

    reasons.push(
      `${reason}:-${amount}`,
    );
  };

  if (
    last?.genre ===
    profile.genre
  ) {
    penalize(
      35,
      "same-genre-as-last",
    );
  }

  if (
    last
      ?.narrativeArchitecture ===
    profile
      .narrativeArchitecture
  ) {
    penalize(
      20,
      "same-narrative-as-last",
    );
  }

  if (
    last?.visualLanguage ===
    profile.visualLanguage
  ) {
    penalize(
      15,
      "same-visual-language-as-last",
    );
  }

  if (
    last?.rhythm ===
    profile.rhythm
  ) {
    penalize(
      10,
      "same-rhythm-as-last",
    );
  }

  if (
    last?.prosody ===
    profile.prosody
  ) {
    penalize(
      8,
      "same-prosody-as-last",
    );
  }

  if (
    last?.ctaStrategy ===
    profile.ctaStrategy
  ) {
    penalize(
      5,
      "same-cta-as-last",
    );
  }

  const genreCount =
    recent.filter(
      (item) =>
        item.genre ===
        profile.genre,
    ).length;

  if (
    genreCount >= 2
  ) {
    penalize(
      25,
      "genre-overused-recently",
    );
  }

  const architectureCount =
    recent.filter(
      (item) =>
        item
          .narrativeArchitecture ===
        profile
          .narrativeArchitecture,
    ).length;

  if (
    architectureCount >= 2
  ) {
    penalize(
      15,
      "architecture-overused-recently",
    );
  }

  return {
    score:
      clamp(score),

    reasons,
  };
};

export const selectCreativeProfile = (
  intent: CreativeIntent,
  memory: CreativeMemoryItem[] = [],
): CreativeDecision => {
  const ranking =
    PROFILES
      .map(
        (
          profile,
        ): CreativeCandidate => {
          const semantic =
            semanticFit(
              intent,
              profile,
            );

          const diversity =
            diversityFit(
              profile,
              memory,
            );

          /*
           * Diversidad tiene peso
           * ligeramente superior:
           * V3.18 existe precisamente
           * para romper monotonía.
           *
           * Pero jamás ignora la
           * adecuación semántica.
           */
          const finalScore =
            clamp(
              semantic.score *
                0.45 +
              diversity.score *
                0.55,
            );

          return {
            profile,

            baseScore:
              50,

            semanticScore:
              semantic.score,

            diversityScore:
              diversity.score,

            finalScore,

            reasons: [
              ...semantic.reasons,
              ...diversity.reasons,
            ],
          };
        },
      )
      .sort(
        (
          a,
          b,
        ) => {
          if (
            a.finalScore !==
            b.finalScore
          ) {
            return (
              b.finalScore -
              a.finalScore
            );
          }

          if (
            a.semanticScore !==
            b.semanticScore
          ) {
            return (
              b.semanticScore -
              a.semanticScore
            );
          }

          return a.profile.genre
            .localeCompare(
              b.profile.genre,
            );
        },
      );

  const selected =
    ranking[0];

  if (!selected) {
    throw new Error(
      "Creative Diversity Director no pudo seleccionar un perfil.",
    );
  }

  return {
    productionCode:
      intent.productionCode,

    selected:
      selected.profile,

    ranking,

    memorySize:
      memory.length,

    rationale: [
      `Creative genre: ${selected.profile.genre}.`,
      `Narrative architecture: ${selected.profile.narrativeArchitecture}.`,
      `Semantic score: ${selected.semanticScore}/100.`,
      `Diversity score: ${selected.diversityScore}/100.`,
      `Final score: ${selected.finalScore}/100.`,
      `Adaptive vocal mode: ${selected.profile.vocalDirection.mode}.`,
      `Target vocal tempo: ${selected.profile.vocalDirection.targetWpm.min}-${selected.profile.vocalDirection.targetWpm.max} WPM; preferred ${selected.profile.vocalDirection.targetWpm.preferred}.`,
      ...selected.reasons,
    ],
  };
};

export const buildCreativeMemoryItem = (
  productionCode: string,
  profile: CreativeProfile,
): CreativeMemoryItem => ({
  productionCode,

  genre:
    profile.genre,

  narrativeArchitecture:
    profile.narrativeArchitecture,

  rhythm:
    profile.rhythm,

  visualLanguage:
    profile.visualLanguage,

  prosody:
    profile.prosody,

  ctaStrategy:
    profile.ctaStrategy,
});

export const CREATIVE_PROFILE_CATALOG =
  PROFILES;
