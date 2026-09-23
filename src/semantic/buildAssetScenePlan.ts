import type {SemanticEvent} from "../buildSemanticEvents";


export type VisualRoute =
  | "REALISTIC_SCENE"
  | "DOCUMENT_OBJECT"
  | "ONDA_GRAPHIC"
  | "CONTINUITY";


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


export type MediaMix = {
  photo: number;
  video: number;
  graphic: number;
  threeD: number;
};


export type CreativeVisualDirection = {
  genre?: string;
  narrativeArchitecture?: string;
  rhythm?: string;

  visualLanguage?: VisualLanguage;
  camera?: CameraProfile;
  transitions?: TransitionProfile;
  graphicDensity?: GraphicDensity;

  mediaMix?: Partial<MediaMix>;
};


export type AssetMediaIntent =
  | "photo"
  | "video"
  | "graphic"
  | "threeD-intent";


export type AssetScenePlanItem = {
  id: string;
  ruleId: string;
  concept: string;

  startMs: number;
  endMs: number;
  durationMs: number;

  route: VisualRoute;

  mediaIntent: AssetMediaIntent;

  visualIntent: string;
  generationPrompt: string;

  creativeDirection: {
    genre: string | null;
    narrativeArchitecture: string | null;
    rhythm: string | null;
    visualLanguage: VisualLanguage | null;
    cameraProfile: CameraProfile | null;
    transitionProfile: TransitionProfile | null;
    graphicDensity: GraphicDensity | null;
  };

  mediaMix: MediaMix;

  motion: {
    camera: string;
    transition: string;
  };

  constraints: {
    vertical: true;
    safeFrame: true;
    noSlideshow: true;
    foreignFlagsOnlyWhenContextuallyJustified: true;
    spanishVisibleTextPreferred: true;
  };
};


const DEFAULT_MEDIA_MIX: MediaMix = {
  photo: 25,
  video: 50,
  graphic: 25,
  threeD: 0,
};


const normalizeMediaMix = (
  input?: Partial<MediaMix>,
): MediaMix => {
  const raw: MediaMix = {
    photo: Math.max(
      0,
      Number(input?.photo ?? DEFAULT_MEDIA_MIX.photo),
    ),

    video: Math.max(
      0,
      Number(input?.video ?? DEFAULT_MEDIA_MIX.video),
    ),

    graphic: Math.max(
      0,
      Number(input?.graphic ?? DEFAULT_MEDIA_MIX.graphic),
    ),

    threeD: Math.max(
      0,
      Number(input?.threeD ?? DEFAULT_MEDIA_MIX.threeD),
    ),
  };

  const total =
    raw.photo +
    raw.video +
    raw.graphic +
    raw.threeD;

  if (total <= 0) {
    return DEFAULT_MEDIA_MIX;
  }

  return {
    photo: (raw.photo / total) * 100,
    video: (raw.video / total) * 100,
    graphic: (raw.graphic / total) * 100,
    threeD: (raw.threeD / total) * 100,
  };
};


const chooseBaseRoute = (
  event: SemanticEvent,
): VisualRoute => {
  switch (event.ruleId) {
    case "controversia-alto-valor":
    case "arbitraje":
    case "conflicto-administrativo":
    case "patrimonio":
      return "REALISTIC_SCENE";

    case "contratos-high-ticket":
    case "control-constitucional":
      return "DOCUMENT_OBJECT";

    case "hechos":
    case "teoria-caso":
    case "estrategia-juridica":
    case "riesgos":
    case "diagnostico":
      return "REALISTIC_SCENE";

    case "norma":
    case "jurisprudencia":
      return "DOCUMENT_OBJECT";

    case "objetivo":
      return "ONDA_GRAPHIC";

    case "autoridad":
      return "REALISTIC_SCENE";

    case "expediente":
    case "recurso":
    case "motivacion":
    case "decision":
      return "DOCUMENT_OBJECT";

    case "argumentos":
    case "prueba":
    case "debido-proceso":
    case "defensa":
    case "plazos":
    case "ignorar":
    case "vulneracion":
      return "ONDA_GRAPHIC";

    case "semantic-filler":
      return "CONTINUITY";

    default:
      return "ONDA_GRAPHIC";
  }
};


const chooseCreativeRoute = (
  event: SemanticEvent,
  direction: CreativeVisualDirection,
): VisualRoute => {
  const base = chooseBaseRoute(event);

  const language =
    direction.visualLanguage;

  if (
    language === "graphic-explanation" ||
    language === "strategic-diagram"
  ) {
    if (
      event.ruleId !== "norma" &&
      event.ruleId !== "jurisprudencia" &&
      event.ruleId !== "contratos-high-ticket" &&
      event.ruleId !== "expediente"
    ) {
      return "ONDA_GRAPHIC";
    }
  }

  if (
    language === "documentary-evidence"
  ) {
    if (
      event.ruleId === "prueba" ||
      event.ruleId === "hechos" ||
      event.ruleId === "expediente" ||
      event.ruleId === "norma" ||
      event.ruleId === "jurisprudencia" ||
      event.ruleId === "motivacion"
    ) {
      return "DOCUMENT_OBJECT";
    }
  }

  if (
    language === "cinematic-realism" ||
    language === "procedural-immersion" ||
    language === "executive-business"
  ) {
    if (
      base === "ONDA_GRAPHIC" &&
      event.ruleId !== "objetivo"
    ) {
      return "REALISTIC_SCENE";
    }
  }

  if (
    language === "parallel-contrast" &&
    event.ruleId !== "semantic-filler"
  ) {
    return "REALISTIC_SCENE";
  }

  return base;
};


const mediaIntentFor = (
  event: SemanticEvent,
  route: VisualRoute,
  mix: MediaMix,
  sceneIndex: number,
): AssetMediaIntent => {
  if (route === "ONDA_GRAPHIC") {
    return "graphic";
  }

  if (
    route === "DOCUMENT_OBJECT" &&
    mix.photo >= mix.video
  ) {
    return "photo";
  }

  if (route === "CONTINUITY") {
    return (
      mix.video >= mix.photo
        ? "video"
        : "photo"
    );
  }

  /*
   * threeD se registra como intención creativa.
   * No implica que exista todavía un ejecutor 3D.
   */
  if (
    mix.threeD >= 25 &&
    sceneIndex % 5 === 4
  ) {
    return "threeD-intent";
  }

  const photoWeight = mix.photo;
  const videoWeight = mix.video;

  if (
    videoWeight <= 0 &&
    photoWeight > 0
  ) {
    return "photo";
  }

  if (
    photoWeight <= 0 &&
    videoWeight > 0
  ) {
    return "video";
  }

  const cycle =
    photoWeight + videoWeight;

  if (cycle <= 0) {
    return "video";
  }

  const position =
    (
      (sceneIndex * 37) %
      Math.max(1, Math.round(cycle))
    );

  return (
    position < videoWeight
      ? "video"
      : "photo"
  );
};


const languageDescription = (
  language?: VisualLanguage,
): string => {
  switch (language) {
    case "cinematic-realism":
      return (
        "cinematic realism, believable environments, " +
        "human decision-making and premium dramatic depth"
      );

    case "editorial-analysis":
      return (
        "high-end editorial analysis, restrained composition, " +
        "visual hierarchy and strategic seriousness"
      );

    case "documentary-evidence":
      return (
        "documentary evidence aesthetic, authentic objects, " +
        "observational credibility and factual visual texture"
      );

    case "executive-business":
      return (
        "premium executive business aesthetic, precise composition, " +
        "high-value decisions and sophisticated professional context"
      );

    case "graphic-explanation":
      return (
        "clear premium explanatory graphics, conceptual hierarchy " +
        "and restrained information design"
      );

    case "parallel-contrast":
      return (
        "strong visual contrast between alternatives, consequences " +
        "or before-and-after states"
      );

    case "procedural-immersion":
      return (
        "immersive procedural realism, consequential decisions, " +
        "process tension and first-person strategic proximity"
      );

    case "strategic-diagram":
      return (
        "strategic systems visualization, relationships, flows, " +
        "decision paths and sophisticated diagrammatic clarity"
      );

    default:
      return (
        "premium cinematic legal editorial aesthetic"
      );
  }
};


const visualIntentFor = (
  event: SemanticEvent,
  route: VisualRoute,
  direction: CreativeVisualDirection,
  mediaIntent: AssetMediaIntent,
): string => {
  const language = languageDescription(
    direction.visualLanguage,
  );

  if (route === "REALISTIC_SCENE") {
    return (
      `Escena profesional basada en ${language}, ` +
      `representando directamente: ${event.concept}. ` +
      `Medio preferente: ${mediaIntent}.`
    );
  }

  if (route === "DOCUMENT_OBJECT") {
    return (
      `Documento, expediente, contrato, evidencia u objeto jurídico ` +
      `visualmente reconocible dentro de ${language}, ` +
      `representando: ${event.concept}. ` +
      `Medio preferente: ${mediaIntent}.`
    );
  }

  if (route === "CONTINUITY") {
    return (
      `Continuidad audiovisual coherente con ${language}, ` +
      "preservando sujeto, atmósfera y progresión narrativa " +
      `sin repetir mecánicamente el activo anterior.`
    );
  }

  return (
    `Representación gráfica premium basada en ${language}, ` +
    `explicando visualmente: ${event.concept}.`
  );
};


const generationPromptFor = (
  event: SemanticEvent,
  route: VisualRoute,
  direction: CreativeVisualDirection,
  mediaIntent: AssetMediaIntent,
): string => {
  const language = languageDescription(
    direction.visualLanguage,
  );

  const base =
    "Premium professional visual, credible, high-end composition, " +
    "vertical 9:16, strong visual hierarchy, no cheap stock look, " +
    "no slideshow, no irrelevant legal clichés, no floating text. " +
    "For Bolivia-first legal productions, prefer believable Latin " +
    "American context and Spanish-language visible documents when " +
    "documents are shown. Do not show foreign national flags unless " +
    "the narrative context specifically justifies them. ";

  const creative =
    `Creative language: ${language}. ` +
    `Preferred medium: ${mediaIntent}. ` +
    `Genre: ${direction.genre ?? "strategic-editorial"}. ` +
    `Narrative architecture: ${
      direction.narrativeArchitecture ?? "adaptive"
    }. `;

  if (route === "REALISTIC_SCENE") {
    return (
      base +
      creative +
      "Create a believable professional scene representing: " +
      `${event.concept}. Emphasize meaningful action, decisions, ` +
      "economic or strategic relevance and visual specificity."
    );
  }

  if (route === "DOCUMENT_OBJECT") {
    return (
      base +
      creative +
      "Focus on a believable legal or business document, contract, " +
      `case file, evidence object or juridical material representing: ` +
      `${event.concept}. It must feel authentic and professionally handled.`
    );
  }

  if (route === "CONTINUITY") {
    return (
      base +
      creative +
      "Preserve audiovisual continuity with the preceding narrative " +
      `idea. Current context: ${event.concept}. Avoid irrelevant subjects ` +
      "and avoid visually repeating the exact previous asset."
    );
  }

  return (
    base +
    creative +
    "Create restrained premium information design representing: " +
    `${event.concept}. Prioritize comprehension, hierarchy, relationships ` +
    "and strategic meaning."
  );
};


const baseMotionFor = (
  event: SemanticEvent,
  route: VisualRoute,
): {
  camera: string;
  transition: string;
} => {
  switch (event.ruleId) {
    case "controversia-alto-valor":
      return {
        camera: "slow-controlled-push-in",
        transition: "soft-crossfade",
      };

    case "contratos-high-ticket":
      return {
        camera: "document-detail-horizontal-pan",
        transition: "precision-dissolve",
      };

    case "arbitraje":
      return {
        camera: "strategic-lateral-drift",
        transition: "controlled-crossfade",
      };

    case "conflicto-administrativo":
      return {
        camera: "measured-right-to-left-pan",
        transition: "soft-dissolve",
      };

    case "patrimonio":
      return {
        camera: "slow-converging-push",
        transition: "premium-crossfade",
      };

    case "control-constitucional":
      return {
        camera: "subtle-vertical-rise",
        transition: "restrained-fade",
      };

    case "hechos":
      return {
        camera: "investigative-horizontal-scan",
        transition: "soft-crossfade",
      };

    case "prueba":
      return {
        camera: "evidence-detail-examination",
        transition: "precision-dissolve",
      };

    case "norma":
    case "jurisprudencia":
      return {
        camera: "slow-document-focus",
        transition: "soft-dissolve",
      };

    case "teoria-caso":
    case "estrategia-juridica":
      return {
        camera: "strategic-convergence",
        transition: "controlled-crossfade",
      };

    case "riesgos":
      return {
        camera: "slow-tension-push",
        transition: "dark-soft-dissolve",
      };

    case "decision":
      return {
        camera: "decision-convergence",
        transition: "stable-crossfade",
      };

    default:
      if (route === "REALISTIC_SCENE") {
        return {
          camera: "slow-cinematic-drift",
          transition: "soft-crossfade",
        };
      }

      if (route === "DOCUMENT_OBJECT") {
        return {
          camera: "controlled-detail-pan",
          transition: "precision-dissolve",
        };
      }

      if (route === "CONTINUITY") {
        return {
          camera: "minimal-continuity-drift",
          transition: "long-crossfade",
        };
      }

      return {
        camera: "restrained-motion",
        transition: "soft-dissolve",
      };
  }
};


const cameraFromProfile = (
  profile: CameraProfile | undefined,
  fallback: string,
): string => {
  switch (profile) {
    case "controlled-cinematic":
      return "creative-controlled-cinematic-drift";

    case "progressive-tension":
      return "creative-progressive-tension-push";

    case "observational":
      return "creative-observational-documentary-drift";

    case "executive-precision":
      return "creative-executive-precision-motion";

    case "pedagogical-focus":
      return "creative-pedagogical-focus-motion";

    case "contrast-motion":
      return "creative-contrast-directional-motion";

    case "immersive-decision":
      return "creative-immersive-decision-push";

    case "diagrammatic":
      return "creative-diagrammatic-guided-motion";

    default:
      return fallback;
  }
};


const transitionFromProfile = (
  profile: TransitionProfile | undefined,
  fallback: string,
): string => {
  switch (profile) {
    case "soft":
      return "creative-soft-crossfade";

    case "decisive":
      return "creative-decisive-transition";

    case "documentary":
      return "creative-documentary-dissolve";

    case "precision":
      return "creative-precision-dissolve";

    case "contrast":
      return "creative-contrast-transition";

    case "continuous":
      return "creative-continuous-flow";

    case "minimal":
      return "creative-minimal-transition";

    case "mixed":
      return "creative-mixed-transition";

    default:
      return fallback;
  }
};


const motionFor = (
  event: SemanticEvent,
  route: VisualRoute,
  direction: CreativeVisualDirection,
): {
  camera: string;
  transition: string;
} => {
  const base = baseMotionFor(
    event,
    route,
  );

  return {
    camera: cameraFromProfile(
      direction.camera,
      base.camera,
    ),

    transition: transitionFromProfile(
      direction.transitions,
      base.transition,
    ),
  };
};


export function buildAssetScenePlan(
  events: SemanticEvent[],
  direction: CreativeVisualDirection = {},
): AssetScenePlanItem[] {
  const mediaMix = normalizeMediaMix(
    direction.mediaMix,
  );

  return events.map(
    (
      event,
      index,
    ) => {
      const route = chooseCreativeRoute(
        event,
        direction,
      );

      const mediaIntent = mediaIntentFor(
        event,
        route,
        mediaMix,
        index,
      );

      const startMs = Math.max(
        0,
        Number(event.startMs),
      );

      const endMs = Math.max(
        startMs + 1,
        Number(event.endMs),
      );

      return {
        id:
          `scene-${String(index + 1).padStart(2, "0")}`,

        ruleId:
          event.ruleId,

        concept:
          event.concept,

        startMs,
        endMs,

        durationMs:
          endMs - startMs,

        route,

        mediaIntent,

        visualIntent:
          visualIntentFor(
            event,
            route,
            direction,
            mediaIntent,
          ),

        generationPrompt:
          generationPromptFor(
            event,
            route,
            direction,
            mediaIntent,
          ),

        creativeDirection: {
          genre:
            direction.genre ?? null,

          narrativeArchitecture:
            direction.narrativeArchitecture ?? null,

          rhythm:
            direction.rhythm ?? null,

          visualLanguage:
            direction.visualLanguage ?? null,

          cameraProfile:
            direction.camera ?? null,

          transitionProfile:
            direction.transitions ?? null,

          graphicDensity:
            direction.graphicDensity ?? null,
        },

        mediaMix,

        motion:
          motionFor(
            event,
            route,
            direction,
          ),

        constraints: {
          vertical: true,
          safeFrame: true,
          noSlideshow: true,

          foreignFlagsOnlyWhenContextuallyJustified:
            true,

          spanishVisibleTextPreferred:
            true,
        },
      };
    },
  );
    }
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

import {
  dirname,
  resolve,
} from "node:path";

import {
  buildSemanticEvents,
  type WordTiming,
} from "../src/buildSemanticEvents";

import {
  buildAssetScenePlan,
  type CreativeVisualDirection,
} from "../src/semantic/buildAssetScenePlan";


type Timeline = {
  words: WordTiming[];
};


type CreativeDecisionFile = {
  selected?: {
    genre?: string;
    narrativeArchitecture?: string;
    rhythm?: string;
    visualLanguage?: CreativeVisualDirection["visualLanguage"];
    camera?: CreativeVisualDirection["camera"];
    transitions?: CreativeVisualDirection["transitions"];
    graphicDensity?: CreativeVisualDirection["graphicDensity"];
    mediaMix?: CreativeVisualDirection["mediaMix"];
  };
};


const root = process.cwd();

const productionCode =
  process.env.PRODUCTION_CODE ??
  "video-juridico-001";


const timelinePath = resolve(
  root,
  `public/generated/${productionCode}-timeline.json`,
);


const creativeDecisionPath = resolve(
  root,
  `public/generated/${productionCode}-creative-decision.json`,
);


const outputPath = resolve(
  root,
  `public/generated/${productionCode}-asset-scene-plan.json`,
);


const timeline = JSON.parse(
  readFileSync(
    timelinePath,
    "utf8",
  ),
) as Timeline;


if (
  !Array.isArray(timeline.words) ||
  timeline.words.length === 0
) {
  throw new Error(
    "Timeline contains no words.",
  );
}


/*
 * ============================================================
 * V3.18-F
 * CREATIVE VISUAL DIRECTION
 * ============================================================
 *
 * El plan visual puede funcionar incluso si no existe todavía
 * creative-decision.json.
 *
 * Eso conserva compatibilidad con producciones anteriores.
 */

let creativeDirection: CreativeVisualDirection = {};


if (existsSync(creativeDecisionPath)) {
  const creativeDecision = JSON.parse(
    readFileSync(
      creativeDecisionPath,
      "utf8",
    ),
  ) as CreativeDecisionFile;

  const selected =
    creativeDecision.selected;

  if (selected) {
    creativeDirection = {
      genre:
        selected.genre,

      narrativeArchitecture:
        selected.narrativeArchitecture,

      rhythm:
        selected.rhythm,

      visualLanguage:
        selected.visualLanguage,

      camera:
        selected.camera,

      transitions:
        selected.transitions,

      graphicDensity:
        selected.graphicDensity,

      mediaMix:
        selected.mediaMix,
    };
  }
}


const events =
  buildSemanticEvents(
    timeline.words,
  );


/*
 * ============================================================
 * DIRECTOR VISUAL V3.18-F.1
 * ============================================================
 */

const basePlan =
  buildAssetScenePlan(
    events,
    creativeDirection,
  );


/*
 * ============================================================
 * VISUAL RHYTHM
 * ============================================================
 *
 * Conservamos la lógica validada:
 * una unidad semántica excesivamente larga se divide para evitar
 * mantener un mismo activo visual durante demasiado tiempo.
 */

const dividedPlan =
  basePlan.flatMap(
    (
      item,
      baseIndex,
    ) => {
      const duration =
        item.endMs -
        item.startMs;

      const numberOfSegments =
        Math.max(
          1,
          Math.ceil(
            duration / 6000,
          ),
        );

      return Array.from(
        {
          length:
            numberOfSegments,
        },
        (
          _,
          segmentIndex,
        ) => {
          const startMs =
            Math.round(
              item.startMs +
                (
                  duration *
                  segmentIndex
                ) /
                  numberOfSegments,
            );

          const endMs =
            Math.round(
              item.startMs +
                (
                  duration *
                  (
                    segmentIndex +
                    1
                  )
                ) /
                  numberOfSegments,
            );

          return {
            ...item,

            id:
              `scene-${String(
                baseIndex + 1,
              ).padStart(
                2,
                "0",
              )}-${String(
                segmentIndex + 1,
              ).padStart(
                2,
                "0",
              )}`,

            startMs,
            endMs,

            durationMs:
              endMs -
              startMs,
          };
        },
      );
    },
  );


/*
 * ============================================================
 * NARRATION CONTEXT
 * ============================================================
 *
 * Añadimos contexto verbal alrededor de cada escena para que
 * los resolutores visuales posteriores puedan buscar/rankear
 * activos con mayor precisión semántica.
 */

const plan =
  dividedPlan.map(
    (item) => {
      const contextStartMs =
        Math.max(
          0,
          item.startMs -
            1200,
        );

      const contextEndMs =
        item.endMs +
        1200;

      const narrationContext =
        timeline.words
          .filter(
            (word) =>
              word.endMs >=
                contextStartMs &&
              word.startMs <=
                contextEndMs,
          )
          .map(
            (word) =>
              word.text,
          )
          .join(" ")
          .trim();

      return {
        ...item,
        narrationContext,
      };
    },
  );


mkdirSync(
  dirname(
    outputPath,
  ),
  {
    recursive: true,
  },
);


writeFileSync(
  outputPath,
  JSON.stringify(
    {
      productionCode,

      version:
        "V3.18-F.1-CREATIVE-VISUAL-PLANNING",

      creativeDirection,

      totalScenes:
        plan.length,

      scenes:
        plan,
    },
    null,
    2,
  ),
);


console.log(
  "\n=== CREATIVE VISUAL PLANNING DIRECTOR V3.18-F.1 ===",
);

console.log(
  `Production: ${productionCode}`,
);

console.log(
  `Scenes: ${plan.length}`,
);

console.log(
  `Genre: ${
    creativeDirection.genre ??
    "legacy/default"
  }`,
);

console.log(
  `Visual language: ${
    creativeDirection.visualLanguage ??
    "legacy/default"
  }`,
);

console.log(
  `Camera profile: ${
    creativeDirection.camera ??
    "legacy/default"
  }`,
);

console.log(
  `Transition profile: ${
    creativeDirection.transitions ??
    "legacy/default"
  }`,
);


for (const item of plan) {
  console.log(
    [
      item.id,
      item.ruleId,
      item.route,
      item.mediaIntent,
      `${item.startMs}-${item.endMs}ms`,
    ].join(
      " | ",
    ),
  );
}


console.log(
  `\nPlan written to:\n${outputPath}`,
);
