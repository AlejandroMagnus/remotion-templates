import fs from "node:fs";
import path from "node:path";

import type {
  SilecKnowledgeInput,
} from "../src/content/SilecContentAdapter";

/**
 * V3.17-C — AUTONOMOUS VIDEO SPEC BUILDER
 *
 * Entrada:
 * content/<production-code>.silec.json
 *
 * Salida:
 * examples/<production-code>.video.json
 *
 * Responsabilidad:
 * conocimiento estratégico
 * → arquitectura narrativa
 * → narración
 * → escenas
 * → VideoSpec
 *
 * No genera audio.
 * No selecciona assets.
 * No renderiza.
 * No modifica Supabase.
 */

type Scene = {
  id: string;
  title: string;
  narration: string;
  visualIntent: string;
  keywords: string[];
};

function getProductionCode():
  string {
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

function cleanSentence(
  value: string,
): string {
  const clean =
    value
      .replace(/\s+/g, " ")
      .trim();

  if (!clean) {
    return "";
  }

  if (
    /[.!?]$/.test(clean)
  ) {
    return clean;
  }

  return `${clean}.`;
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

function keywordsFromText(
  text: string,
): string[] {
  const stopWords =
    new Set([
      "para",
      "como",
      "porque",
      "desde",
      "hasta",
      "entre",
      "sobre",
      "cuando",
      "donde",
      "antes",
      "despues",
      "después",
      "puede",
      "debe",
      "deben",
      "esta",
      "este",
      "estos",
      "estas",
      "una",
      "uno",
      "unos",
      "unas",
      "del",
      "las",
      "los",
      "con",
      "sin",
      "por",
      "que",
      "sus",
      "más",
      "mas",
      "juridico",
      "jurídico",
      "juridica",
      "jurídica",
    ]);

  const normalized =
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .replace(
        /[^a-z0-9ñ\s-]/g,
        " ",
      );

  return unique(
    normalized
      .split(/\s+/)
      .filter(
        (word) =>
          word.length >= 5 &&
          !stopWords.has(word),
      ),
  ).slice(0, 8);
}

function buildNarration(
  input: SilecKnowledgeInput,
): string {
  const parts: string[] = [];

  parts.push(
    cleanSentence(
      input.hook,
    ),
  );

  /*
   * No repetimos mecánicamente
   * todos los campos.
   *
   * Construimos una progresión:
   * tensión → explicación →
   * razonamiento → conclusión → CTA.
   */
  parts.push(
    cleanSentence(
      input.problem,
    ),
  );

  for (
    const reasoning of
    input.reasoningChain
  ) {
    parts.push(
      cleanSentence(
        reasoning,
      ),
    );
  }

  parts.push(
    cleanSentence(
      input.conclusion,
    ),
  );

  /*
   * closingIdea funciona como
   * cierre intelectual.
   */
  if (
    input.closingIdea.trim() !==
    input.conclusion.trim()
  ) {
    parts.push(
      cleanSentence(
        input.closingIdea,
      ),
    );
  }

  /*
   * CTA separado para que
   * V3.15-C pueda reconocerlo
   * como unidad prosódica.
   */
  parts.push(
    cleanSentence(
      input.cta,
    ),
  );

  return parts
    .filter(Boolean)
    .join(" ");
}

function sceneId(
  index: number,
  label: string,
): string {
  const slug =
    label
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
      .slice(0, 40);

  return [
    String(
      index + 1,
    ).padStart(
      2,
      "0",
    ),
    slug || "scene",
  ].join("-");
}

function makeScene(
  index: number,
  title: string,
  narration: string,
  visualIntent: string,
): Scene {
  return {
    id:
      sceneId(
        index,
        title,
      ),

    title,

    narration:
      cleanSentence(
        narration,
      ),

    visualIntent,

    keywords:
      keywordsFromText(
        [
          title,
          narration,
          visualIntent,
        ].join(" "),
      ),
  };
}

function buildScenes(
  input: SilecKnowledgeInput,
): Scene[] {
  const scenes: Scene[] = [];

  scenes.push(
    makeScene(
      scenes.length,
      "Hook",
      input.hook,
      [
        "Apertura cinematográfica de alta tensión estratégica.",
        "Representar visualmente el problema concreto.",
        "Evitar símbolos jurídicos genéricos si existe una imagen más precisa.",
      ].join(" "),
    ),
  );

  scenes.push(
    makeScene(
      scenes.length,
      "Problema",
      input.problem,
      [
        "Mostrar el riesgo o conflicto central en contexto empresarial,",
        "patrimonial o profesional de alto valor.",
      ].join(" "),
    ),
  );

  input.reasoningChain.forEach(
    (
      reasoning,
      index,
    ) => {
      scenes.push(
        makeScene(
          scenes.length,
          `Razonamiento ${index + 1}`,
          reasoning,
          [
            "Representar esta idea mediante una situación visual concreta,",
            "documentos, decisiones, negociación, empresa, patrimonio,",
            "evidencia o interacción profesional según corresponda.",
          ].join(" "),
        ),
      );
    },
  );

  scenes.push(
    makeScene(
      scenes.length,
      "Conclusión estratégica",
      input.conclusion,
      [
        "Síntesis visual de autoridad.",
        "Mostrar control, anticipación, decisión o protección",
        "sin caer en clichés jurídicos innecesarios.",
      ].join(" "),
    ),
  );

  if (
    input.closingIdea.trim() !==
    input.conclusion.trim()
  ) {
    scenes.push(
      makeScene(
        scenes.length,
        "Cierre intelectual",
        input.closingIdea,
        [
          "Imagen final conceptualmente poderosa,",
          "sobria y coherente con la tesis central.",
        ].join(" "),
      ),
    );
  }

  scenes.push(
    makeScene(
      scenes.length,
      "CTA",
      input.cta,
      [
        "Cierre profesional premium.",
        "Transmitir diagnóstico, prevención, estrategia",
        "y capacidad profesional de alto nivel.",
      ].join(" "),
    ),
  );

  return scenes;
}

function buildTags(
  input: SilecKnowledgeInput,
): string[] {
  return unique([
    "jurídico",
    "estrategia",
    "high-ticket",
    "Bolivia",
    "es-BO",
    "autoridad profesional",
    "prevención jurídica",
    ...input.capabilityDemonstrated,
    ...keywordsFromText(
      input.topic,
    ),
  ]);
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
    input.reasoningChain.length < 2
  ) {
    throw new Error(
      "reasoningChain insuficiente.",
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
   * Conservamos el contrato
   * fundamental de los VideoSpec
   * actualmente utilizados:
   *
   * schemaVersion
   * id
   * templateFamily
   * meta
   * visual
   * audio
   * scenes
   *
   * fixedDurationSec sigue siendo
   * un valor inicial.
   * apply-adaptive-duration.ts
   * conserva el control real
   * posterior de duración.
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
        input.hook,

      topic:
        input.topic,

      centralThesis:
        input.centralThesis,

      objective:
        input.commercialObjective,

      targetAudience:
        input.targetAudience,

      capabilityDemonstrated:
        input.capabilityDemonstrated,

      tags,

      language:
        "es-BO",

      market:
        "Bolivia",

      generatedBy:
        "V3.17-C-AUTONOMOUS-VIDEO-SPEC",
    },

    durationMode:
      "adaptive",

    fixedDurationSec:
      90,

    visual: {
      style:
        "editorial-dark",

      format:
        "vertical",

      aspectRatio:
        "9:16",

      safeFrame:
        true,

      semanticVisuals:
        true,

      multimodal:
        true,

      localization: {
        country:
          "Bolivia",

        language:
          "es",

        foreignFlags:
          "only-if-contextually-justified",

        visibleTextPreference:
          "Spanish",
      },
    },

    audio: {
      narrationText:
        narration,

      language:
        "es-BO",

      voice:
        "es-BO-MarceloNeural",

      prosodyDirector:
        "V3.15-C",
    },

    scenes:
      scenes.map(
        (
          scene,
          index,
        ) => ({
          id:
            scene.id,

          order:
            index + 1,

          title:
            scene.title,

          narration:
            scene.narration,

          visualIntent:
            scene.visualIntent,

          keywords:
            scene.keywords,

          transition:
            index === 0
              ? "fade"
              : "cinematic-crossfade",
        }),
      ),
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
    "V3.17-C — AUTONOMOUS VIDEO SPEC BUILDER",
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
    "✅ Autonomous VideoSpec generated.",
  );
}

main();
