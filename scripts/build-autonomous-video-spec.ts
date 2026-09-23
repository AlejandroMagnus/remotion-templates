import fs from "node:fs";
import path from "node:path";

import type {
  SilecKnowledgeInput,
} from "../src/content/SilecContentAdapter";

/**
 * V3.17-C2 — AUTONOMOUS VIDEO SPEC BUILDER
 *
 * Entrada:
 * content/<production-code>.silec.json
 *
 * Salida:
 * examples/<production-code>.video.json
 *
 * CONTRATO:
 * Compatible con el VideoSpec validado
 * de video-juridico-008.
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
        "npx tsx scripts/build-autonomous-video-spec.ts video-juridico-009",
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
    .slice(0, 48);
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

function buildNarration(
  input: SilecKnowledgeInput,
): string {
  const parts: string[] = [];

  parts.push(
    sentence(input.hook),
  );

  parts.push(
    sentence(input.problem),
  );

  for (
    const reasoning of
    input.reasoningChain
  ) {
    parts.push(
      sentence(reasoning),
    );
  }

  parts.push(
    sentence(input.conclusion),
  );

  if (
    cleanText(
      input.closingIdea,
    ) !==
    cleanText(
      input.conclusion,
    )
  ) {
    parts.push(
      sentence(
        input.closingIdea,
      ),
    );
  }

  parts.push(
    sentence(input.cta),
  );

  return parts
    .filter(Boolean)
    .join(" ");
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
    points
      .map(
        (point) =>
          compact(
            point,
            100,
          ),
      )
      .filter(Boolean)
      .slice(0, 3);

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
              "Ejecución",
            ],
    },
    timing: {
      durationMs,
    },
  };
}

function buildScenes(
  input: SilecKnowledgeInput,
): VideoScene[] {
  const reasoning =
    input.reasoningChain
      .map(cleanText)
      .filter(Boolean);

  const scenes:
    VideoScene[] = [];

  /*
   * 1 — HOOK
   */
  scenes.push({
    id:
      "hook",

    kind:
      "hero",

    content: {
      title:
        compact(
          input.hook,
          100,
        ),

      subtitle:
        compact(
          input.centralThesis,
          150,
        ),
    },

    timing: {
      durationMs:
        8000,
    },
  });

  /*
   * 2 — PROBLEMA
   */
  scenes.push(
    makeStatement(
      "problema",
      "El problema no comienza cuando llega el litigio",
      input.problem,
      11000,
    ),
  );

  /*
   * 3 — PRIMER BLOQUE DE RAZONAMIENTO
   */
  scenes.push(
    makePoints(
      "diagnostico",
      "El diagnóstico estratégico debe anticiparse",
      reasoning.slice(
        0,
        3,
      ),
      13000,
    ),
  );

  /*
   * 4 — CONSECUENCIA / CAMBIO DE ESCENARIO
   */
  if (reasoning[3]) {
    scenes.push(
      makeStatement(
        "consecuencia",
        compact(
          reasoning[3],
          100,
        ),
        reasoning[4] ??
          input.centralThesis,
        12000,
      ),
    );
  }

  /*
   * 5 — SEGUNDO BLOQUE
   */
  const secondBlock =
    reasoning.slice(
      4,
      7,
    );

  if (
    secondBlock.length >
    0
  ) {
    scenes.push(
      makePoints(
        "estrategia",
        "La estrategia debe responder antes del conflicto",
        secondBlock,
        13000,
      ),
    );
  }

  /*
   * 6 — TESIS
   */
  scenes.push(
    makeStatement(
      "tesis",
      input.centralThesis,
      input.conclusion,
      12000,
    ),
  );

  /*
   * 7 — CAPACIDAD DEMOSTRADA
   */
  scenes.push(
    makePoints(
      "capacidad",
      "Una estrategia jurídica de alto nivel integra",
      input
        .capabilityDemonstrated
        .slice(
          0,
          3,
        ),
      12000,
    ),
  );

  /*
   * 8 — CIERRE / CTA
   *
   * Exactamente el tipo y estructura
   * que ya acepta el schema validado.
   */
  scenes.push({
    id:
      "cta",

    kind:
      "cta",

    content: {
      line1:
        compact(
          input.closingIdea,
          115,
        ),

      line2:
        compact(
          input.cta,
          150,
        ),
    },

    timing: {
      durationMs:
        7000,
    },
  });

  return scenes;
}

function buildTags(
  input: SilecKnowledgeInput,
): string[] {
  const capabilityTags =
    input
      .capabilityDemonstrated
      .map(slugify)
      .filter(Boolean);

  const topicTag =
    slugify(
      input.topic,
    );

  return unique([
    topicTag,
    ...capabilityTags,
    "estrategia-juridica",
    "prevencion-juridica",
    "bolivia",
    "high-ticket",
  ]).slice(
    0,
    12,
  );
}

function validateInput(
  input: SilecKnowledgeInput,
  productionCode: string,
): void {
  if (
    input.productionCode !==
    productionCode
  ) {
    throw new Error(
      "El SILEC input no corresponde al production code solicitado.",
    );
  }

  const requiredStrings: Array<
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
    input.reasoningChain.length <
      2
  ) {
    throw new Error(
      "reasoningChain insuficiente.",
    );
  }

  if (
    !Array.isArray(
      input.capabilityDemonstrated,
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

function main(): void {
  const productionCode =
    getProductionCode();

  const silecPath =
    path.join(
      process.cwd(),
      "content",
      `${productionCode}.silec.json`,
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

  validateInput(
    input,
    productionCode,
  );

  const narration =
    buildNarration(
      input,
    );

  const scenes =
    buildScenes(
      input,
    );

  const tags =
    buildTags(
      input,
    );

  /*
   * IMPORTANTE:
   *
   * Esta estructura replica el
   * contrato real validado del 008.
   *
   * No añadimos campos especulativos.
   */
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
        90,
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
    "V3.17-C2 — AUTONOMOUS VIDEO SPEC BUILDER",
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
    `Scenes: ${scenes.length}`,
  );

  console.log(
    `Narration characters: ${narration.length}`,
  );

  console.log(
    `Tags: ${tags.length}`,
  );

  console.log(
    `VideoSpec: ${outputPath}`,
  );

  console.log(
    "==============================================",
  );

  console.log(
    "✅ VideoSpec compatible con contrato validado.",
  );
}

main();
