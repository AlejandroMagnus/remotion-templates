import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";

import {
  buildSemanticEvents,
  type WordTiming,
} from "../src/buildSemanticEvents";

import {buildAssetScenePlan} from "../src/semantic/buildAssetScenePlan";
import {buildNarrationFallbackEvents} from "../src/semantic/narrationFallback";

type Timeline = {
  words: WordTiming[];
};

const root = process.cwd();
const productionCode = process.env.PRODUCTION_CODE ?? "video-juridico-001";

const timelinePath = resolve(
  root,
  `public/generated/${productionCode}-timeline.json`,
);

const outputPath = resolve(
  root,
  `public/generated/${productionCode}-asset-scene-plan.json`,
);

const timeline = JSON.parse(
  readFileSync(timelinePath, "utf8"),
) as Timeline;

if (!Array.isArray(timeline.words) || timeline.words.length === 0) {
  throw new Error("Timeline contains no words.");
}

const semanticEvents = buildSemanticEvents(timeline.words);
const usingNarrationFallback = semanticEvents.length === 0;
const events = usingNarrationFallback
  ? buildNarrationFallbackEvents(timeline.words)
  : semanticEvents;
if (!events.length) {
  throw new Error("ASSET_SCENE_EMPTY_SOURCE_BOUND_EVENTS");
}
const plan = buildAssetScenePlan(events).flatMap((item) => { const d=item.endMs-item.startMs; const n=Math.max(1,Math.ceil(d/6000)); return Array.from({length:n},(_,i)=>{const startMs=Math.round(item.startMs+d*i/n);const endMs=Math.round(item.startMs+d*(i+1)/n);return {...item,startMs,endMs};}); }).map((item) => {
  const contextStartMs = Math.max(0, item.startMs - 1200);
  const contextEndMs = item.endMs + 1200;

  const narrationContext = timeline.words
    .filter(
      (word) =>
        word.endMs >= contextStartMs &&
        word.startMs <= contextEndMs,
    )
    .map((word) => word.text)
    .join(" ")
    .trim();

  return {
    ...item,
    narrationContext,
  };
});

if (!plan.length || plan.some((item) =>
  !Number.isFinite(item.startMs) || !Number.isFinite(item.endMs) ||
  item.endMs <= item.startMs || !item.narrationContext.trim()
)) {
  throw new Error("ASSET_SCENE_EMPTY_OR_INVALID_PLAN");
}
if (usingNarrationFallback) {
  console.log(`ASSET_SCENE_SOURCE_BOUND_FALLBACK: ${plan.length} escenas desde WordBoundary`);
}

mkdirSync(dirname(outputPath), {recursive: true});

writeFileSync(
  outputPath,
  JSON.stringify(
    {
      productionCode,
      version: "V3.9.5",
      planningMode: usingNarrationFallback ? "source-bound-narration-fallback" : "semantic-rules",
      totalScenes: plan.length,
      scenes: plan,
    },
    null,
    2,
  ),
);

console.log("\n=== ASSET & SCENE ORCHESTRATOR V3.9 ===");
console.log(`Scenes: ${plan.length}`);

for (const item of plan) {
  console.log(
    `${item.ruleId} | ${item.route} | ${item.startMs}-${item.endMs}ms`,
  );
}

console.log(`\nPlan written to:\n${outputPath}`);
