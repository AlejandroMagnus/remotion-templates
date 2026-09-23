import fs from "node:fs";
import path from "node:path";

import type {
  SilecKnowledgeInput,
} from "../src/content/SilecContentAdapter";

import type {
  CreativeDecision,
  CreativeProfile,
  NarrativeArchitecture,
} from "../src/strategy/CreativeDiversityDirector";

/**
 * V3.18-D — CREATIVE AUTONOMOUS VIDEO SPEC BUILDER
 *
 * Entradas:
 * content/<production-code>.silec.json
 * public/generated/<production-code>-creative-decision.json
 *
 * Salida:
 * examples/<production-code>.video.json
 *
 * RESPONSABILIDAD:
 * SILEC / Q∞ decide QUÉ decir.
 * V3.18 decide CÓMO contarlo.
 *
 * Este builder materializa esa decisión en:
 * - arquitectura narrativa;
 * - orden y tipo de escenas;
 * - duración objetivo;
 * - tratamiento creativo;
 * - estructura del CTA.
 *
 * No genera audio.
 * No selecciona assets.
 * No renderiza.
 * No modifica Supabase.
 */

type SceneKind =
  | "hero"
  | "statement"
  | "mechanism"
  | "points"
  | "equation"
  | "video-window"
  | "cta"
  | "custom";

type SceneContent =
  | {
      title: string;
      subtitle: string;
    }
  | {
      title: string;
      points: string[];
    }
  | {
      line1: string;
      line2: string;
    };

type VideoScene = {
  id: string;
  kind: SceneKind;
  content: SceneContent;
  timing: {
    durationMs: number;
  };
};

type CreativeDecisionFile =
  CreativeDecision & {
    version?: string;
    generatedAt?: string;
    intent?: unknown;
  };

function getProductionCode(): string {
  const value =
    process.argv[2]?.trim() ||
    process.env.PRODUCTION_CODE?.trim();

  if (!value) {
    throw new Error(
      [
        "Production code no definido.",
        "",
        "Uso:",
        "npx tsx scripts/build-autonomous-video-spec.ts video-juridico-010",
      ].join("\n"),
    );
  }

  return value;
}

function readJson<T>(
  filePath: string,
): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Archivo requerido no existe: ${filePath}`,
    );
  }

  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8",
    ),
  ) as T;
}

function writeJson(
  filePath: string,
  value: unknown,
): void {
  fs.mkdirSync(
    path.dirname(filePath),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      value,
      null,
      2,
    ),
    "utf8",
  );
}

function cleanText(
  value: string,
): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function sentence(
  value: string,
): string {
  const clean =
    cleanText(value);

  if (!clean) {
    return "";
  }

  if (/[.!?]$/.test(clean)) {
    return clean;
  }

  return `${clean}.`;
}

function compact(
  value: string,
  maxLength = 115,
): string {
  const clean =
    cleanText(value);

  if (
    clean.length <=
    maxLength
  ) {
    return clean;
  }

  const shortened =
    clean
      .slice(
        0,
        maxLength - 1,
      )
      .replace(
        /\s+\S*$/,
        "",
      );

  return `${shortened}…`;
}

function slugify(
  value: string,
): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    )
    .slice(
      0,
      48,
    );
}

function unique(
  values: string[],
): string[] {
  return [
    ...new Set(
      values
        .map(
          (value) =>
            value.trim(),
        )
        .filter(Boolean),
    ),
  ];
}

function normalizePoints(
  values: string[],
): string[] {
  return values
    .map(cleanText)
    .filter(Boolean);
}

function makeHero(
  id: string,
  title: string,
  subtitle: string,
  durationMs: number,
): VideoScene {
  return {
    id,
    kind:
      "hero",

    content: {
      title:
        compact(
          title,
          100,
        ),

      subtitle:
        compact(
          subtitle,
          150,
        ),
    },

    timing: {
      durationMs,
    },
  };
}

function makeStatement(
  id: string,
  title: string,
  subtitle: string,
  durationMs: number,
): VideoScene {
  return {
    id,
    kind:
      "statement",

    content: {
      title:
        compact(
          title,
          100,
        ),

      subtitle:
        compact(
          subtitle,
          150,
        ),
    },

    timing: {
      durationMs,
    },
  };
}

function makePoints(
  id: string,
  title: string,
  points: string[],
  durationMs: number,
): VideoScene {
  const cleanPoints =
    normalizePoints(
      points,
    )
      .map(
        (point) =>
          compact(
            point,
            100,
          ),
      )
      .slice(
        0,
        3,
      );

  return {
    id,
    kind:
      "points",

    content: {
      title:
        compact(
          title,
          100,
        ),

      points:
        cleanPoints.length > 0
          ? cleanPoints
          : [
              "Diagnóstico",
              "Estrategia",
              "Decisión",
            ],
    },

    timing: {
      durationMs,
    },
  };
}

function makeMechanism(
  id: string,
  title: string,
  points: string[],
  durationMs: number,
): VideoScene {
  const scene =
    makePoints(
      id,
      title,
      points,
      durationMs,
    );

  return {
    ...scene,
    kind:
      "mechanism",
  };
}

function makeVideoWindow(
  id: string,
  title: string,
  subtitle: string,
  durationMs: number,
): VideoScene {
  return {
    id,
    kind:
      "video-window",

    content: {
      title:
        compact(
          title,
          100,
        ),

      subtitle:
        compact(
          subtitle,
          150,
        ),
    },

    timing: {
      durationMs,
    },
  };
}

function makeCta(
  line1: string,
  line2: string,
  durationMs: number,
): VideoScene {
  return {
    id:
      "cta",

    kind:
      "cta",

    content: {
      line1:
        compact(
          line1,
          115,
        ),

      line2:
        compact(
          line2,
          150,
        ),
    },

    timing: {
      durationMs,
    },
  };
}

function buildNarration(
  input: SilecKnowledgeInput,
  architecture:
    NarrativeArchitecture,
): string {
  const reasoning =
    normalizePoints(
      input.reasoningChain,
    );

  let parts:
    string[];

  switch (
    architecture
  ) {
    case "case-tension-resolution":
      parts = [
        input.hook,
        input.problem,
        ...reasoning,
        input.centralThesis,
        input.conclusion,
        input.closingIdea,
        input.cta,
      ];
      break;

    case "question-demonstration-conclusion":
      parts = [
        input.hook,
        input.centralThesis,
        ...reasoning,
        input.conclusion,
        input.closingIdea,
        input.cta,
      ];
      break;

    case "chronological-reconstruction":
      parts = [
        input.hook,
        input.problem,
        ...reasoning,
        input.conclusion,
        input.centralThesis,
        input.closingIdea,
        input.cta,
      ];
      break;

    case "before-after":
      parts = [
        input.hook,
        input.problem,
        reasoning[0] ?? "",
        reasoning[1] ?? "",
        input.centralThesis,
        ...reasoning.slice(
          2,
        ),
        input.conclusion,
        input.closingIdea,
        input.cta,
      ];
      break;

    case "context-evidence-meaning":
      parts = [
        input.hook,
        input.problem,
        ...reasoning,
        input.centralThesis,
        input.conclusion,
        input.closingIdea,
        input.cta,
      ];
      break;

    case "decision-consequence":
      parts = [
        input.hook,
        input.problem,
        reasoning[0] ?? "",
        reasoning[1] ?? "",
        ...reasoning.slice(
          2,
        ),
        input.centralThesis,
        input.conclusion,
        input.closingIdea,
        input.cta,
      ];
      break;

    case "system-map":
      parts = [
        input.hook,
        input.centralThesis,
        input.problem,
        ...reasoning,
        input.conclusion,
        input.closingIdea,
        input.cta,
      ];
      break;

    case "problem-analysis-solution":
    default:
      parts = [
        input.hook,
        input.problem,
        ...reasoning,
        input.centralThesis,
        input.conclusion,
        input.closingIdea,
        input.cta,
      ];
      break;
  }

  return parts
    .map(sentence)
    .filter(Boolean)
    .filter(
      (
        value,
        index,
        array,
      ) =>
        index === 0 ||
        cleanText(value) !==
          cleanText(
            array[
              index - 1
            ],
          ),
    )
    .join(" ");
}

function allocateDurations(
  scenes: VideoScene[],
  targetSeconds: number,
): VideoScene[] {
  if (
    scenes.length === 0
  ) {
    return scenes;
  }

  const targetMs =
    Math.round(
      targetSeconds *
        1000,
    );

  const minimumCtaMs =
    7000;

  const nonCta =
    scenes.filter(
      (scene) =>
        scene.id !==
        "cta",
    );

  const cta =
    scenes.find(
      (scene) =>
        scene.id ===
        "cta",
    );

  const remainingMs =
    Math.max(
      nonCta.length *
        5000,
      targetMs -
        (cta
          ? minimumCtaMs
          : 0),
    );

  const currentWeight =
    nonCta.reduce(
      (
        sum,
        scene,
      ) =>
        sum +
        scene.timing
          .durationMs,
      0,
    );

  const resized =
    scenes.map(
      (
        scene,
      ): VideoScene => {
        if (
          scene.id ===
          "cta"
        ) {
          return {
            ...scene,

            timing: {
              durationMs:
                minimumCtaMs,
            },
          };
        }

        const ratio =
          currentWeight > 0
            ? scene
                .timing
                .durationMs /
              currentWeight
            : 1 /
              Math.max(
                nonCta.length,
                1,
              );

        return {
          ...scene,

          timing: {
            durationMs:
              Math.max(
                5000,
                Math.round(
                  remainingMs *
                    ratio,
                ),
              ),
          },
        };
      },
    );

  return resized;
}

function buildProblemAnalysisSolution(
  input:
    SilecKnowledgeInput,
): VideoScene[] {
  const reasoning =
    normalizePoints(
      input.reasoningChain,
    );

  return [
    makeHero(
      "hook",
      input.hook,
      input.centralThesis,
      8000,
    ),

    makeStatement(
      "problema",
      "El problema estratégico",
      input.problem,
      10000,
    ),

    makePoints(
      "analisis",
      "Lo que debe analizarse",
      reasoning.slice(
        0,
        3,
      ),
      12000,
    ),

    makePoints(
      "estrategia",
      "La respuesta estratégica",
      reasoning.slice(
        3,
        6,
      ),
      12000,
    ),

    makeStatement(
      "solucion",
      input.centralThesis,
      input.conclusion,
      11000,
    ),

    makePoints(
      "capacidad",
      "La arquitectura jurídica integra",
      input.capabilityDemonstrated,
      10000,
    ),

    makeCta(
      input.closingIdea,
      input.cta,
      7000,
    ),
  ];
}

function buildCaseTensionResolution(
  input:
    SilecKnowledgeInput,
): VideoScene[] {
  const reasoning =
    normalizePoints(
      input.reasoningChain,
    );

  return [
    makeVideoWindow(
      "situacion",
      input.hook,
      input.problem,
      9000,
    ),

    makeStatement(
      "tension",
      "El punto de tensión",
      reasoning[0] ??
        input.problem,
      9000,
    ),

    makeVideoWindow(
      "escalada",
      "La situación cambia",
      reasoning[1] ??
        input.centralThesis,
      9000,
    ),

    makePoints(
      "decisiones",
      "Las decisiones críticas",
      reasoning.slice(
        2,
        5,
      ),
      11000,
    ),

    makeStatement(
      "resolucion",
      input.centralThesis,
      input.conclusion,
      11000,
    ),

    makeCta(
      input.closingIdea,
      input.cta,
      7000,
    ),
  ];
}

function buildQuestionDemonstrationConclusion(
  input:
    SilecKnowledgeInput,
): VideoScene[] {
  const reasoning =
    normalizePoints(
      input.reasoningChain,
    );

  return [
    makeHero(
      "pregunta",
      input.hook,
      input.centralThesis,
      8000,
    ),

    makeStatement(
      "principio",
      "Primero, el criterio",
      input.problem,
      9000,
    ),

    makeMechanism(
      "demostracion-1",
      "Cómo funciona",
      reasoning.slice(
        0,
        3,
      ),
      12000,
    ),

    makeMechanism(
      "demostracion-2",
      "Cómo se aplica",
      reasoning.slice(
        3,
        6,
      ),
      12000,
    ),

    makeStatement(
      "conclusion",
      "La conclusión estratégica",
      input.conclusion,
      10000,
    ),

    makePoints(
      "capacidad",
      "Qué exige un análisis de alto nivel",
      input.capabilityDemonstrated,
      10000,
    ),

    makeCta(
      input.closingIdea,
      input.cta,
      7000,
    ),
  ];
}

function buildChronologicalReconstruction(
  input:
    SilecKnowledgeInput,
): VideoScene[] {
  const reasoning =
    normalizePoints(
      input.reasoningChain,
    );

  return [
    makeHero(
      "apertura",
      input.hook,
      input.problem,
      8000,
    ),

    makeVideoWindow(
      "momento-1",
      "Primera decisión",
      reasoning[0] ??
        input.problem,
      9000,
    ),

    makeVideoWindow(
      "momento-2",
      "Lo que ocurrió después",
      reasoning[1] ??
        input.centralThesis,
      9000,
    ),

    makeVideoWindow(
      "momento-3",
      "El punto de inflexión",
      reasoning[2] ??
        input.conclusion,
      9000,
    ),

    makePoints(
      "reconstruccion",
      "La reconstrucción revela",
      reasoning.slice(
        3,
        6,
      ),
      11000,
    ),

    makeStatement(
      "lectura",
      input.centralThesis,
      input.conclusion,
      10000,
    ),

    makeCta(
      input.closingIdea,
      input.cta,
      7000,
    ),
  ];
}

function buildBeforeAfter(
  input:
    SilecKnowledgeInput,
): VideoScene[] {
  const reasoning =
    normalizePoints(
      input.reasoningChain,
    );

  return [
    makeHero(
      "contraste",
      input.hook,
      input.centralThesis,
      7000,
    ),

    makeStatement(
      "antes",
      "Escenario A",
      reasoning[0] ??
        input.problem,
      9000,
    ),

    makeStatement(
      "despues",
      "Escenario B",
      reasoning[1] ??
        input.conclusion,
      9000,
    ),

    makePoints(
      "diferencia",
      "La diferencia estratégica",
      reasoning.slice(
        2,
        5,
      ),
      11000,
    ),

    makeStatement(
      "regla",
      "La regla que cambia el resultado",
      input.centralThesis,
      10000,
    ),

    makeCta(
      input.closingIdea,
      input.cta,
      7000,
    ),
  ];
}

function buildContextEvidenceMeaning(
  input:
    SilecKnowledgeInput,
): VideoScene[] {
  const reasoning =
    normalizePoints(
      input.reasoningChain,
    );

  return [
    makeVideoWindow(
      "contexto",
      input.hook,
      input.problem,
      10000,
    ),

    makeStatement(
      "hecho",
      "El hecho relevante",
      reasoning[0] ??
        input.problem,
      10000,
    ),

    makePoints(
      "evidencia",
      "La evidencia que importa",
      reasoning.slice(
        1,
        4,
      ),
      13000,
    ),

    makeStatement(
      "significado",
      "Qué significa jurídicamente",
      input.centralThesis,
      11000,
    ),

    makePoints(
      "lectura",
      "La lectura estratégica",
      reasoning.slice(
        4,
        7,
      ),
      11000,
    ),

    makeStatement(
      "conclusion",
      "La conclusión",
      input.conclusion,
      10000,
    ),

    makeCta(
      input.closingIdea,
      input.cta,
      7000,
    ),
  ];
}

function buildDecisionConsequence(
  input:
    SilecKnowledgeInput,
): VideoScene[] {
  const reasoning =
    normalizePoints(
      input.reasoningChain,
    );

  return [
    makeHero(
      "decision",
      input.hook,
      "Hay una decisión que cambia el escenario.",
      8000,
    ),

    makeStatement(
      "opcion-a",
      "Primera alternativa",
      reasoning[0] ??
        input.problem,
      9000,
    ),

    makeStatement(
      "opcion-b",
      "Segunda alternativa",
      reasoning[1] ??
        input.centralThesis,
      9000,
    ),

    makePoints(
      "consecuencias",
      "Las consecuencias",
      reasoning.slice(
        2,
        5,
      ),
      11000,
    ),

    makeStatement(
      "criterio",
      "El criterio estratégico",
      input.centralThesis,
      10000,
    ),

    makeStatement(
      "resultado",
      "La decisión debe mirar el resultado",
      input.conclusion,
      9000,
    ),

    makeCta(
      input.closingIdea,
      input.cta,
      7000,
    ),
  ];
}

function buildSystemMap(
  input:
    SilecKnowledgeInput,
): VideoScene[] {
  const reasoning =
    normalizePoints(
      input.reasoningChain,
    );

  return [
    makeHero(
      "mapa",
      input.hook,
      input.centralThesis,
      8000,
    ),

    makeMechanism(
      "nucleo",
      "El núcleo del problema",
      [
        input.problem,
      ],
      9000,
    ),

    makeMechanism(
      "capa-1",
      "Primera capa",
      reasoning.slice(
        0,
        3,
      ),
      11000,
    ),

    makeMechanism(
      "capa-2",
      "Segunda capa",
      reasoning.slice(
        3,
        6,
      ),
      11000,
    ),

    makePoints(
      "capacidades",
      "Capacidades que deben integrarse",
      input.capabilityDemonstrated,
      11000,
    ),

    makeStatement(
      "resultado",
      "El sistema conduce a una decisión",
      input.conclusion,
      10000,
    ),

    makeCta(
      input.closingIdea,
      input.cta,
      7000,
    ),
  ];
}

function buildScenes(
  input:
    SilecKnowledgeInput,
  profile:
    CreativeProfile,
): VideoScene[] {
  let scenes:
    VideoScene[];

  switch (
    profile
      .narrativeArchitecture
  ) {
    case "case-tension-resolution":
      scenes =
        buildCaseTensionResolution(
          input,
        );
      break;

    case "question-demonstration-conclusion":
      scenes =
        buildQuestionDemonstrationConclusion(
          input,
        );
      break;

    case "chronological-reconstruction":
      scenes =
        buildChronologicalReconstruction(
          input,
        );
      break;

    case "before-after":
      scenes =
        buildBeforeAfter(
          input,
        );
      break;

    case "context-evidence-meaning":
      scenes =
        buildContextEvidenceMeaning(
          input,
        );
      break;

    case "decision-consequence":
      scenes =
        buildDecisionConsequence(
          input,
        );
      break;

    case "system-map":
      scenes =
        buildSystemMap(
          input,
        );
      break;

    case "problem-analysis-solution":
    default:
      scenes =
        buildProblemAnalysisSolution(
          input,
        );
      break;
  }

  return allocateDurations(
    scenes,
    profile
      .targetDurationSeconds
      .preferred,
  );
}

function buildTags(
  input:
    SilecKnowledgeInput,
  profile:
    CreativeProfile,
): string[] {
  const capabilityTags =
    input
      .capabilityDemonstrated
      .map(slugify)
      .filter(Boolean);

  return unique([
    slugify(
      input.topic,
    ),

    slugify(
      profile.genre,
    ),

    slugify(
      profile
        .narrativeArchitecture,
    ),

    ...capabilityTags,

    "estrategia-juridica",
    "bolivia",
    "high-ticket",
  ]).slice(
     0,
    12,
  );
}

function validateInput(
  input:
    SilecKnowledgeInput,
  productionCode:
    string,
): void {
  if (
    input.productionCode !==
    productionCode
  ) {
    throw new Error(
      "El SILEC input no corresponde al production code solicitado.",
    );
  }

  const requiredStrings:
    Array<
      keyof SilecKnowledgeInput
    > = [
      "topic",
      "centralThesis",
      "problem",
      "conclusion",
      "commercialObjective",
      "hook",
      "closingIdea",
      "cta",
    ];

  for (
    const field of
    requiredStrings
  ) {
    const value =
      input[field];

    if (
      typeof value !==
        "string" ||
      !value.trim()
    ) {
      throw new Error(
        `Campo SILEC inválido: ${String(field)}`,
      );
    }
  }

  if (
    !Array.isArray(
      input.reasoningChain,
    ) ||
    input.reasoningChain
      .length < 2
  ) {
    throw new Error(
      "reasoningChain insuficiente.",
    );
  }

  if (
    !Array.isArray(
      input
        .capabilityDemonstrated,
    ) ||
    input
      .capabilityDemonstrated
      .length === 0
  ) {
    throw new Error(
      "capabilityDemonstrated insuficiente.",
    );
  }
}

function validateCreativeDecision(
  decision:
    CreativeDecisionFile,
  productionCode:
    string,
): CreativeProfile {
  if (
    decision.productionCode !==
    productionCode
  ) {
    throw new Error(
      "La decisión creativa no corresponde al production code solicitado.",
    );
  }

  const profile =
    decision.selected;

  if (
    !profile ||
    profile.version !==
      "V3.18-A"
  ) {
    throw new Error(
      "CreativeProfile V3.18-A ausente o inválido.",
    );
  }

  if (
    !profile.genre ||
    !profile
      .narrativeArchitecture ||
    !profile.rhythm ||
    !profile.visualLanguage ||
    !profile.cameraProfile ||
    !profile.transitionProfile ||
    !profile.prosody ||
    !profile.ctaStrategy
  ) {
    throw new Error(
      "CreativeProfile incompleto.",
    );
  }

  if (
    !profile
      .targetDurationSeconds ||
    profile
      .targetDurationSeconds
      .preferred <= 0
  ) {
    throw new Error(
      "Duración creativa inválida.",
    );
  }

  return profile;
}

function main(): void {
  const productionCode =
    getProductionCode();

  const silecPath =
    path.join(
      process.cwd(),
      "content",
      `${productionCode}.silec.json`,
    );

  const creativePath =
    path.join(
      process.cwd(),
      "public",
      "generated",
      `${productionCode}-creative-decision.json`,
    );

  const outputPath =
    path.join(
      process.cwd(),
      "examples",
      `${productionCode}.video.json`,
    );

  const input =
    readJson<
      SilecKnowledgeInput
    >(
      silecPath,
    );

  const creativeDecision =
    readJson<
      CreativeDecisionFile
    >(
      creativePath,
    );

  validateInput(
    input,
    productionCode,
  );

  const profile =
    validateCreativeDecision(
      creativeDecision,
      productionCode,
    );

  const narration =
    buildNarration(
      input,
      profile
        .narrativeArchitecture,
    );

  const scenes =
    buildScenes(
      input,
      profile,
    );

  const tags =
    buildTags(
      input,
      profile,
    );

  const videoSpec = {
    schemaVersion:
      "1.0",

    id:
      productionCode,

    templateFamily:
      "announcement-brief",

    meta: {
      title:
        cleanText(
          input.hook,
        ),

      description:
        cleanText(
          input.centralThesis,
        ),

      tags,
    },

    target: {
      aspect:
        "9:16",

      fps:
        30,

      durationMode:
        "fixed",

      fixedDurationSec:
        profile
          .targetDurationSeconds
          .preferred,
    },

    style: {
      theme:
        "editorial-dark",

      variant:
        "default",

      safeAreaProfile:
        "metaSafe",

      showSceneLabels:
        false,
    },

    audio: {
      mode:
        "narration",

      narrationText:
        narration,

      narrationSrc:
        `public/generated/${productionCode}-narration.mp3`,

      narrationVolume:
        1,

      musicVolume:
        0.06,

      ducking:
        true,
    },

    assets: {},

    scenes,
  };

  writeJson(
    outputPath,
    videoSpec,
  );

  console.log("");
  console.log(
    "==============================================",
  );

  console.log(
    "V3.18-D — CREATIVE AUTONOMOUS VIDEO SPEC",
  );

  console.log(
    "==============================================",
  );

  console.log(
    `Production: ${productionCode}`,
  );

  console.log(
    `Topic: ${input.topic}`,
  );

  console.log(
    `Genre: ${profile.genre}`,
  );

  console.log(
    `Narrative architecture: ${profile.narrativeArchitecture}`,
  );

  console.log(
    `Rhythm: ${profile.rhythm}`,
  );

  console.log(
    `Visual language: ${profile.visualLanguage}`,
  );

  console.log(
    `Camera: ${profile.cameraProfile}`,
  );

  console.log(
    `Transitions: ${profile.transitionProfile}`,
  );

  console.log(
    `Prosody: ${profile.prosody}`,
  );

  console.log(
    `CTA strategy: ${profile.ctaStrategy}`,
  );

  console.log(
    `Target duration: ${profile.targetDurationSeconds.preferred}s`,
  );

  console.log(
    `Scenes: ${scenes.length}`,
  );

  console.log(
    `Narration characters: ${narration.length}`,
  );

  console.log(
    "Media mix: " +
    `${profile.mediaMix.photo}% photo / ` +
    `${profile.mediaMix.video}% video / ` +
    `${profile.mediaMix.graphic}% graphic / ` +
    `${profile.mediaMix.threeD}% 3D`,
  );

  console.log(
    `VideoSpec: ${outputPath}`,
  );

  console.log(
    "==============================================",
  );

  console.log(
    "✅ V3.18-D VideoSpec creativo construido.",
  );
}

main();
