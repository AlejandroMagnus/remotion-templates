/**
 * V3.14.1 — BUILD ASSET SCENE PLAN
 *
 * Puente cinematográfico:
 *
 * intención + narración + timeline real
 * → MasterAudiovisualDirector
 * → beats semánticos
 * → normalización de ritmo visual
 * → microbeats cinematográficos
 * → Asset Scene Plan
 *
 * PRINCIPIO:
 * El Director decide el ritmo.
 * El límite temporal es únicamente una red de seguridad
 * contra planos accidentalmente congelados.
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
   CINEMATIC RHYTHM SAFETY
   ========================================================= */

/**
 * No es una regla artística rígida.
 *
 * El Master Director conserva la decisión narrativa.
 * Este valor solamente impide que un error de segmentación
 * produzca un plano visual de 20, 30 o más segundos.
 */
const MAX_ORDINARY_VISUAL_HOLD_MS = 6000;

/**
 * Evita generar microplanos ridículamente breves
 * cuando una división cae muy cerca del final.
 */
const MIN_VISUAL_FRAGMENT_MS = 1800;

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

/* =========================================================
   CINEMATIC RHYTHM NORMALIZER
   ========================================================= */

/**
 * Obtiene el texto realmente pronunciado dentro de una
 * ventana temporal.
 *
 * Esto mantiene sincronizados:
 * LO QUE SE DICE = LO QUE SE VE.
 */
const textForWindow = (
  startMs: number,
  endMs: number,
  fallback: string
): string => {
  const words = wordTimeline
    .filter(
      (word) =>
        word.endMs > startMs &&
        word.startMs < endMs
    )
    .map((word) => word.word)
    .filter(Boolean);

  return words.length > 0
    ? words.join(" ")
    : fallback;
};

/**
 * El Master Director manda.
 *
 * Si su beat ya tiene una duración cinematográficamente
 * razonable, NO se toca.
 *
 * Solamente intervenimos cuando un beat excesivamente largo
 * podría producir una fotografía congelada durante decenas
 * de segundos.
 */
const rhythmicBeats = score.beats.flatMap(
  (beat) => {
    const durationMs =
      Math.max(
        0,
        beat.endMs - beat.startMs
      );

    if (
      durationMs <=
      MAX_ORDINARY_VISUAL_HOLD_MS
    ) {
      return [
        {
          ...beat,
          durationMs,
        },
      ];
    }

    /**
     * Dividimos proporcionalmente para evitar un último
     * fragmento extremadamente corto.
     *
     * Ejemplo:
     * 30 s → 5 fragmentos de aproximadamente 6 s.
     */
    let fragmentCount =
      Math.ceil(
        durationMs /
        MAX_ORDINARY_VISUAL_HOLD_MS
      );

    while (
      fragmentCount > 1 &&
      durationMs / fragmentCount <
        MIN_VISUAL_FRAGMENT_MS
    ) {
      fragmentCount -= 1;
    }

    const fragmentDuration =
      durationMs / fragmentCount;

    return Array.from(
      {length: fragmentCount},
      (_, index) => {
        const startMs =
          Math.round(
            beat.startMs +
            fragmentDuration * index
          );

        const endMs =
          index === fragmentCount - 1
            ? beat.endMs
            : Math.round(
                beat.startMs +
                fragmentDuration *
                  (index + 1)
              );

        return {
          ...beat,

          /**
           * ID único = escena realmente independiente.
           */
          id:
            `${beat.id}-rhythm-${index + 1}`,

          text: textForWindow(
            startMs,
            endMs,
            beat.text
          ),

          startMs,
          endMs,
          durationMs:
            endMs - startMs,

          /**
           * El resolver downstream recibe una orden
           * inequívoca de renovación visual.
           */
          forceVisualChange: true,
        };
      }
    );
  }
);

/* =========================================================
   RHYTHM QA
   ========================================================= */

const excessiveBeat =
  rhythmicBeats.find(
    (beat) =>
      beat.endMs - beat.startMs >
      MAX_ORDINARY_VISUAL_HOLD_MS + 10
  );

if (excessiveBeat) {
  throw new Error(
    `Visual rhythm QA failed: ${excessiveBeat.id} lasts ${
      excessiveBeat.endMs -
      excessiveBeat.startMs
    } ms`
  );
}

/* =========================================================
   SAVE DIRECTOR SCORE
   ========================================================= */

/**
 * Guardamos tanto la decisión original del Director como
 * el timeline visual finalmente normalizado.
 */
const directorScore = {
  ...score,

  rhythmSafety: {
    maxOrdinaryVisualHoldMs:
      MAX_ORDINARY_VISUAL_HOLD_MS,

    originalBeatCount:
      score.beats.length,

    finalBeatCount:
      rhythmicBeats.length,

    interventionApplied:
      rhythmicBeats.length !==
      score.beats.length,
  },

  beats: rhythmicBeats,
};

fs.mkdirSync(
  path.dirname(directorOutputPath),
  {recursive: true}
);

fs.writeFileSync(
  directorOutputPath,
  JSON.stringify(
    directorScore,
    null,
    2
  )
);

/* =========================================================
   HARD QA GATE
   ========================================================= */

console.log("");
console.log(
  "=========================================="
);
console.log(
  "🎬 V3.14.1 MASTER AUDIOVISUAL DIRECTOR"
);
console.log(
  "=========================================="
);

console.log(
  `Production: ${productionCode}`
);

console.log(
  `Director beats: ${score.beats.length}`
);

console.log(
  `Visual microbeats: ${rhythmicBeats.length}`
);

console.log(
  `Duration: ${(score.totalDurationMs / 1000).toFixed(2)} s`
);

console.log(
  `QA: ${score.qa.passed ? "PASS" : "FAIL"}`
);

if (
  rhythmicBeats.length !==
  score.beats.length
) {
  console.log(
    "🎞️ Rhythm safety: ACTIVE"
  );
}

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
 * Cada beat cinematográfico es una unidad visual
 * independiente.
 *
 * La duración NO crea por sí sola la narrativa:
 * intent + visualRole + texto + contexto + timeline
 * continúan siendo decisiones del Director.
 *
 * El límite de 6 s únicamente evita congelamientos
 * accidentales.
 */
const semanticUnits =
  rhythmicBeats.map(
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

      durationMs:
        beat.endMs -
        beat.startMs,

      confidence: beat.emphasis,

      priority: Math.round(
        beat.emphasis * 100
      ),

      source:
        "MASTER_AUDIOVISUAL_DIRECTOR",

      metadata: {
        directorVersion:
          "V3.14.1",

        intent: beat.intent,
        visualRole:
          beat.visualRole,

        searchQueries:
          beat.searchQueries,

        motion: beat.motion,
        transition:
          beat.transition,

        locale: beat.locale,
        country: beat.country,

        requireSpanishDocument:
          beat.requireSpanishDocument,

        preferBoliviaContext:
          beat.preferBoliviaContext,

        /**
         * Toda unidad proveniente de una fragmentación
         * temporal exige renovación visual.
         */
        forceVisualChange:
          beat.forceVisualChange,

        sequenceIndex: index,
      },
    })
  );

/* =========================================================
   EXISTING DOWNSTREAM CONTRACT
   ========================================================= */

const plan =
  buildAssetScenePlan(
    semanticUnits as any
  );

/* =========================================================
   FINAL PLAN QA
   ========================================================= */

const excessiveScene =
  plan.find(
    (item: any) =>
      Number(item.endMs) -
        Number(item.startMs) >
      MAX_ORDINARY_VISUAL_HOLD_MS + 10
  );

if (excessiveScene) {
  throw new Error(
    `Asset Scene Plan QA failed: scene ${
      excessiveScene.id ??
      "unknown"
    } exceeds visual hold limit.`
  );
}

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
  `✅ Final visual scenes: ${plan.length}`
);

console.log(
  "✅ V3.14.1 ORCHESTRATION COMPLETED"
);
