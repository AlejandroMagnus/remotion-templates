import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { durationInFrames, VideoSpecSchema } from "../src/schema";
import {
  loadCatalog,
  catalogMatch,
  catalogFile,
  validateGlb,
} from "../src/assets/localCatalog";
import { VisualMemory } from "../src/assets/visualMemory";
import { assetSceneKey, type LibraryModel } from "../src/threeD/schema";
import { planNativeThreeD } from "../src/threeD/planner";

const code = process.env.PRODUCTION_CODE ?? process.argv[2];
if (!code || !/^[a-z0-9][a-z0-9-]{2,80}$/.test(code))
  throw new Error("Valid PRODUCTION_CODE is required.");
const flag = process.env.ENABLE_3D ?? "false";
if (flag !== "true" && flag !== "false")
  throw new Error("ENABLE_3D must be true or false.");
const specPath = resolve(`examples/${code}.video.json`);
const rawSpec = JSON.parse(readFileSync(specPath, "utf8"));
// Clear stale timing from previous runs before validating the new composition.
delete rawSpec.threeD;
const spec = VideoSpecSchema.parse(rawSpec);
if (spec.id !== code) throw new Error("VideoSpec production code mismatch.");
const timedScene = z.object({
  id: z.string(),
  ruleId: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  narrationContext: z.string().optional(),
  concept: z.string().optional(),
});
const source = z
  .object({ productionCode: z.literal(code), scenes: z.array(timedScene) })
  .parse(
    JSON.parse(
      readFileSync(
        resolve(`public/generated/${code}-asset-scene-plan.json`),
        "utf8",
      ),
    ),
  );
const timeline = z
  .object({
    words: z.array(
      z.object({
        text: z.string(),
        startMs: z.number().int().nonnegative(),
        endMs: z.number().int().positive(),
      }),
    ),
  })
  .parse(
    JSON.parse(
      readFileSync(resolve(`public/generated/${code}-timeline.json`), "utf8"),
    ),
  );
const library = loadCatalog().filter(
  (a) =>
    a.mediaType === "model" &&
    a.review.status === "approved" &&
    a.review.reviewer &&
    a.review.date,
);
const memory = flag === "true" ? await new VisualMemory(code).load() : null;
const models: Record<string, { model: LibraryModel; title: string }> = {};
if (memory)
  for (const scene of source.scenes) {
    const text = [scene.narrationContext, scene.concept, scene.ruleId].join(
      " ",
    );
    const entry = library
      .filter(
        (a) =>
          catalogMatch(a, text) > 0 &&
          !memory.rejection(
            {
              provider: a.provider,
              providerId: a.id,
              mediaType: "model",
              sourceUrl: a.sourceUrl,
              remoteUrl: "",
              creator: a.creator,
              width: 0,
              height: 0,
              sha256: a.sha256,
            },
            true,
          ),
      )
      .sort(
        (a, b) =>
          catalogMatch(b, text) - catalogMatch(a, text) ||
          a.id.localeCompare(b.id),
      )[0];
    if (!entry) continue;
    validateGlb(readFileSync(catalogFile(entry)));
    models[assetSceneKey(scene)] = {
      model: {
        id: entry.id,
        provider: entry.provider,
        src: entry.file,
        sha256: entry.sha256,
        sourceUrl: entry.sourceUrl,
        creator: entry.creator,
        license: entry.license,
      },
      title: (scene.concept || "Explorar el conocimiento").slice(0, 64),
    };
  }
const result = planNativeThreeD({
  enabled: flag === "true",
  durationMs: (durationInFrames(spec) / spec.target.fps) * 1000,
  scenes: source.scenes,
  words: timeline.words,
  models,
});
if (flag === "true") rawSpec.threeD = result.plan;
VideoSpecSchema.parse(rawSpec);
writeFileSync(specPath, JSON.stringify(rawSpec, null, 2) + "\n");
writeFileSync(
  resolve(`public/generated/${code}-three-d-plan.json`),
  JSON.stringify(
    {
      productionCode: code,
      enabled: flag === "true",
      ...result,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Native 3D plan: ${result.plan.scenes.length} scene(s); enabled=${flag}.`,
);
console.log(result.reasons.join("\n"));
