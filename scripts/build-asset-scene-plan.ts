/**
 * V3.14 — BUILD ASSET SCENE PLAN
 *
 * Puente entre:
 * narración + timeline real
 * → MasterAudiovisualDirector
 * → microbeats
 * → Asset Scene Plan existente
 *
 * Mantiene compatibilidad con la arquitectura anterior.
 */

import fs from "fs";
import path from "path";

import {buildAssetScenePlan} from "../src/semantic/buildAssetScenePlan";
import {
  directAudiovisualProduction,
  type WordTiming,
} from "../src/MasterAudiovisualDirector";

/* =========================================================
   PRODUCTION CODE
   ========================================================= */

const productionCode =
  process.argv[2] ||
  process.env.PRODUCTION_CODE ||
  "video-juridico-004";

/* =========================================================
   PATHS
   ========================================================= */

const root = process.cwd();

const specPath = path.join(
  root,
  "examples",
  `${productionCode}.video.json`
);

const timelinePath = path.join(
  root,
  "public",
  "generated",
  `${productionCode}-timeline.json`
);

const directorOutputPath = path.join(
  root,
  "public",
  "generated",
  `${productionCode}-audiovisual-score.json`
);

const planOutputPath = path.join(
  root,
  "public",
  "generated",
  `${productionCode}-asset-scene-plan.json`
);

/* =========================================================
   GUARDS
   ========================================================= */

if (!fs.existsSync(specPath)) {
  throw new Error(
    `Video spec not found: ${specPath}`
  );
}

if (!fs.existsSync(timelinePath)) {
  throw new Error(
    `Word timeline not found: ${timelinePath}`
  );
}

/* =========================================================
   LOAD SPEC
   ========================================================= */

const spec = JSON.parse(
  fs.readFileSync(specPath, "utf8")
);

/**
 * Compatibilidad con las variantes de spec que ya hemos
 * utilizado. El Director no obliga a reconstruir el schema.
 */
const narration =
  spec?.audio?.narrationText ??
  spec?.narrationText ??
  spec?.narration ??
  "";

if (
  typeof narration !== "string" ||
  narration.trim().length === 0
) {
  throw new Error(
    `Narration text not found in ${specPath}`
  );
}

/* =========================================================
   LOAD + NORMALIZE WORD TIMELINE
   ========================================================= */

const rawTimeline = JSON.parse(
  fs.readFileSync(timelinePath, "utf8")
);

const sourceWords = Array.isArray(rawTimeline)
  ? rawTimeline
  : Array.isArray(rawTimeline?.words)
    ? rawTimeline.words
    : Array.isArray(rawTimeline?.timeline)
      ? rawTimeline.timeline
      : [];

if (sourceWords.length === 0) {
  throw new Error(
    `Timeline contains no words: ${timelinePath}`
  );
}

const numberOr = (
  ...values: unknown[]
): number => {
  for (const value of values) {
    const n = Number(value);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  return 0;
};

const normalizeMilliseconds = (
  value: number
): number => {
  /**
   * Nuestros timelines pueden provenir de distintas
   * etapas. Valores pequeños suelen estar expresados
   * en segundos; valores grandes, en milisegundos.
   */
  if (value > 0 && value < 1000) {
    return Math.round(value * 1000);
  }

  return Math.round(value);
};

const wordTimeline: WordTiming[] =
  sourceWords
    .map((item: any) => {
      const word =
        String(
          item?.word ??
          item?.text ??
          item?.token ??
          ""
        ).trim();

      const rawStart = numberOr(
        item?.startMs,
        item?.start,
        item?.offsetMs,
        item?.offset
      );

      let rawEnd = numberOr(
        item?.endMs,
        item?.end
      );

      const duration = numberOr(
        item?.durationMs,
        item?.duration
      );

      if (
        rawEnd <= rawStart &&
        duration > 0
      ) {
        rawEnd = rawStart + duration;
      }

      return {
        word,
        startMs:
          normalizeMilliseconds(rawStart),
        endMs:
          normalizeMilliseconds(rawEnd),
      };
    })
    .filter(
      (item: WordTiming) =>
        item.word.length > 0 &&
        item.endMs >= item.startMs
    );

if (wordTimeline.length === 0) {
  throw new Error(
    "Timeline could not be normalized."
  );
}

/* =========================================================
   MASTER AUDIOVISUAL DIRECTOR
   ========================================================= */

const score = directAudiovisualProduction({
  productionCode,
  narration,
  wordTimeline,
});

fs.mkdirSync(
  path.dirname(directorOutputPath),
  {recursive: true}
);

fs.writeFileSync(
  directorOutputPath,
  JSON.stringify(score, null, 2)
);

/* =========================================================
   HARD QA GATE
   ========================================================= */

console.log("");
console.log(
  "=========================================="
);
console.log(
  "🎬 V3.14 MASTER AUDIOVISUAL DIRECTOR"
);
console.log(
  "=========================================="
);
console.log(
  `Production: ${productionCode}`
);
console.log(
  `Microbeats: ${score.beats.length}`
);
console.log(
  `Duration: ${(score.totalDurationMs / 1000).toFixed(2)} s`
);
console.log(
  `QA: ${score.qa.passed ? "PASS" : "FAIL"}`
);

if (score.qa.warnings.length > 0) {
  console.log("");
  console.log("⚠️ QA WARNINGS");

  score.qa.warnings.forEach(
    (warning) =>
      console.log(`- ${warning}`)
  );
}

if (!score.qa.passed) {
  console.error("");
  console.error("❌ QA ERRORS");

  score.qa.errors.forEach(
    (error) =>
      console.error(`- ${error}`)
  );

  throw new Error(
    "Master Audiovisual Director QA failed."
  );
}

/* =========================================================
   ADAPTER
   MASTER BEATS → EXISTING ASSET SCENE PLAN
   ========================================================= */

/**
 * Conservamos buildAssetScenePlan como contrato downstream.
 *
 * Cada microbeat del Director se convierte ahora en una
 * unidad semántica independiente.
 *
 * Resultado:
 * ya no permitimos que un gran párrafo produzca por accidente
 * un único recurso visual durante decenas de segundos.
 */
const semanticUnits = score.beats.map(
  (beat, index) => ({
    id: beat.id,

    ruleId:
      `master-${beat.intent.toLowerCase()}-${beat.visualRole.toLowerCase()}`,

    label: beat.text,

    text: beat.text,

    startMs: beat.startMs,
    endMs: beat.endMs,

    start: beat.startMs,
    end: beat.endMs,

    durationMs: beat.durationMs,

    confidence: beat.emphasis,

    priority: Math.round(
      beat.emphasis * 100
    ),

    source: "MASTER_AUDIOVISUAL_DIRECTOR",

    metadata: {
      directorVersion: "V3.14",

      intent: beat.intent,
      visualRole: beat.visualRole,

      searchQueries:
        beat.searchQueries,

      motion: beat.motion,
      transition: beat.transition,

      locale: beat.locale,
      country: beat.country,

      requireSpanishDocument:
        beat.requireSpanishDocument,

      preferBoliviaContext:
        beat.preferBoliviaContext,

      forceVisualChange:
        beat.forceVisualChange,

      sequenceIndex: index,
    },
  })
);

/**
 * buildAssetScenePlan históricamente recibió eventos
 * semánticos. Mantenemos ese contrato y dejamos al
 * compilador verificar incompatibilidades reales.
 */
const plan =
  buildAssetScenePlan(
    semanticUnits as any
  );

/* =========================================================
   OUTPUT
   ========================================================= */

fs.writeFileSync(
  planOutputPath,
  JSON.stringify(plan, null, 2)
);

console.log("");
console.log(
  `✅ Audiovisual score: ${directorOutputPath}`
);
console.log(
  `✅ Asset scene plan: ${planOutputPath}`
);
console.log(
  "✅ V3.14 ORCHESTRATION COMPLETED"
);
