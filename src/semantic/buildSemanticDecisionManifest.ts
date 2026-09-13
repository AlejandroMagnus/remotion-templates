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

const timelinePath = resolve(
  root,
  "public/generated/video-juridico-001-timeline.json",
);

const catalogPath = resolve(
  root,
  "public/catalogs/onda-catalog.json",
);

const outputPath = resolve(
  root,
  "public/generated/video-juridico-001-semantic-decisions.json",
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

const events =
  buildSemanticEvents(
    timeline.words,
  );

/**
 * V3.7.1
 * Director secuencial con:
 * - memoria audiovisual;
 * - penalización de repetición;
 * - diversidad;
 * - adecuación temporal;
 * - tratamiento especial de fillers.
 */
const decisions =
  buildDirectorDecisionSequence(
    events,
    catalog,
    3,
  );

const summary = {
  productionCode:
    "video-juridico-001",

  directorVersion:
    "V3.7.1-stateful",

  catalogResources:
    catalog.length,

  semanticEvents:
    events.length,

  accept:
    decisions.filter(
      (item) =>
        item.decision.status ===
        "ACCEPT",
    ).length,

  review:
    decisions.filter(
      (item) =>
        item.decision.status ===
        "REVIEW",
    ).length,

  reject:
    decisions.filter(
      (item) =>
        item.decision.status ===
        "REJECT",
    ).length,
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
  "\n=== DIRECTOR SEMANTIC DECISION RUN V3.7.1 ===",
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

      "\nDURATION:",
      `${decision.event.durationMs}ms`,

      "\nDECISION:",
      decision.decision.status,

      "| SCORE:",
      decision.decision.score,

      "\nWINNER:",
      decision.selected
        ?.resource.name ??
        "NONE",

      "| CATEGORY:",
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
  `\nManifest written to:\n${outputPath}`,
);
