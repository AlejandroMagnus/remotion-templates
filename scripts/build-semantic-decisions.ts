import {
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
  buildDirectorDecisionSequence,
} from "../src/semantic/buildDirectorDecisionSequence";

import type {
  OndaResource,
} from "../src/semantic/selectSemanticResource";

type Timeline = {
  words: WordTiming[];
};

const root = process.cwd();

const productionCode =
  process.env.PRODUCTION_CODE ??
  "video-juridico-001";

const timelinePath = resolve(
  root,
  `public/generated/${productionCode}-timeline.json`,
);

const catalogPath = resolve(
  root,
  "public/catalogs/onda-catalog.json",
);

const outputPath = resolve(
  root,
  `public/generated/${productionCode}-semantic-decisions.json`,
);

const timeline = JSON.parse(
  readFileSync(
    timelinePath,
    "utf8",
  ),
) as Timeline;

const catalog = JSON.parse(
  readFileSync(
    catalogPath,
    "utf8",
  ),
) as OndaResource[];

if (
  !Array.isArray(timeline.words) ||
  timeline.words.length === 0
) {
  throw new Error(
    "Timeline contains no words.",
  );
}

if (
  !Array.isArray(catalog) ||
  catalog.length === 0
) {
  throw new Error(
    "Onda catalog is empty.",
  );
}

/**
 * V3.15-A
 *
 * 1. La narración se transforma en eventos semánticos
 *    ya calibrados temporalmente.
 *
 * 2. El Director evalúa la secuencia completa.
 *
 * 3. Cada decisión conserva memoria de las anteriores
 *    para reducir repetición y mejorar diversidad.
 *
 * 4. El contrato externo permanece:
 *
 *    {
 *      summary,
 *      decisions
 *    }
 *
 * De este modo SemanticExecutionEngine continúa siendo
 * compatible sin reconstruir el renderer.
 */

const events =
  buildSemanticEvents(
    timeline.words,
  );

const decisions =
  buildDirectorDecisionSequence(
    events,
    catalog,
    3,
  );

const accept =
  decisions.filter(
    (item) =>
      item.decision.status ===
      "ACCEPT",
  ).length;

const review =
  decisions.filter(
    (item) =>
      item.decision.status ===
      "REVIEW",
  ).length;

const reject =
  decisions.filter(
    (item) =>
      item.decision.status ===
      "REJECT",
  ).length;

const scores =
  decisions.map(
    (item) =>
      item.decision.score,
  );

const averageScore =
  scores.length > 0
    ? Number(
        (
          scores.reduce(
            (sum, score) =>
              sum + score,
            0,
          ) / scores.length
        ).toFixed(2),
      )
    : 0;

const summary = {
  productionCode,

  directorVersion:
    "V3.15-A",

  mode:
    "SEQUENTIAL_DIRECTOR",

  catalogResources:
    catalog.length,

  semanticEvents:
    events.length,

  accept,
  review,
  reject,

  averageScore,
};

const manifest = {
  summary,
  decisions,
};

mkdirSync(
  dirname(outputPath),
  {
    recursive: true,
  },
);

writeFileSync(
  outputPath,
  JSON.stringify(
    manifest,
    null,
    2,
  ),
);

console.log(
  "\n=== MASTER AUDIOVISUAL DIRECTOR V3.15-A ===",
);

console.log(summary);

for (
  const decision of decisions
) {
  console.log(
    [
      "\nEVENT:",
      decision.event.ruleId,
      "|",
      decision.event.concept,

      "\nTIME:",
      `${decision.event.startMs}-${decision.event.endMs}ms`,

      "\nDECISION:",
      decision.decision.status,

      "| SCORE:",
      decision.decision.score,

      "\nWINNER:",
      decision.selected
        ?.resource.name ??
        "NONE",

      "\nCATEGORY:",
      decision.selected
        ?.resource.category ??
        "NONE",

      "\nTOP 3:",
      decision.candidates
        .map(
          (candidate) =>
            `${candidate.resource.name}(${candidate.score})`,
        )
        .join(" | "),
    ].join(" "),
  );
}

console.log(
  "\n=== DIRECTOR MEMORY ACTIVE ===",
);

console.log(
  "Sequential anti-repetition and category-diversity logic enabled.",
);

console.log(
  `\nManifest written to:\n${outputPath}`,
);
