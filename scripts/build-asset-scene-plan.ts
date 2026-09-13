import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";

import {
  buildSemanticEvents,
  type WordTiming,
} from "../src/buildSemanticEvents";

import {buildAssetScenePlan} from "../src/semantic/buildAssetScenePlan";

type Timeline = {
  words: WordTiming[];
};

const root = process.cwd();

const timelinePath = resolve(
  root,
  "public/generated/video-juridico-001-timeline.json",
);

const outputPath = resolve(
  root,
  "public/generated/video-juridico-001-asset-scene-plan.json",
);

const timeline = JSON.parse(
  readFileSync(timelinePath, "utf8"),
) as Timeline;

if (!Array.isArray(timeline.words) || timeline.words.length === 0) {
  throw new Error("Timeline contains no words.");
}

const events = buildSemanticEvents(timeline.words);
const plan = buildAssetScenePlan(events).map((item) => {
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

mkdirSync(dirname(outputPath), {recursive: true});

writeFileSync(
  outputPath,
  JSON.stringify(
    {
      productionCode: "video-juridico-001",
      version: "V3.9.5",
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
