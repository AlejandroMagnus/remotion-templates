import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { evaluateSpec } from "../src/quality";
import { resolveNativeScene } from "../src/threeD/resolver";
import { loadSpec, runRemotion, writeProps } from "./shared";
import { inspectRenderedMedia } from "./media-qa";

const mode = process.argv[2] ?? "preview";
if (!["prepare", "preview", "render"].includes(mode))
  throw new Error("Use prepare, preview or render.");
const { spec } = await loadSpec("examples/native-3d-pilot.video.json");
for (const issue of evaluateSpec(spec)) {
  console.log(`${issue.level}: ${issue.message}`);
  if (issue.level === "error") throw new Error(issue.message);
}
const directory = path.resolve("public/generated", spec.id);
mkdirSync(directory, { recursive: true });
const assets = spec.threeD!.scenes.map((scene, index) => {
  const resolved = resolveNativeScene(
    {
      id: scene.assetSceneId,
      ruleId: "prueba",
      startMs: scene.startMs,
      endMs: scene.endMs,
    },
    scene,
    spec.id,
    index,
  );
  resolved.asset.localSrc = `generated/${spec.id}/native-three-${index}.json`;
  writeFileSync(
    path.resolve("public", resolved.asset.localSrc),
    JSON.stringify(scene, null, 2),
  );
  return resolved;
});
writeFileSync(
  path.resolve("public/generated", `${spec.id}-resolved-assets.json`),
  JSON.stringify({ productionCode: spec.id, assets }, null, 2),
);
if (mode !== "prepare") {
  const propsPath = await writeProps(spec);
  const common = ["--props", propsPath, "--gl=swangle"];
  if (mode === "preview") {
    const outputDir = path.resolve("out/previews", spec.id);
    mkdirSync(outputDir, { recursive: true });
    // Opening, cue, scene midpoint and held ending.
    for (const frame of [15, 40, 120, 210]) {
      runRemotion([
        "still",
        "src/threeD/preview-entry.tsx",
        "Native3DPilot",
        path.join(outputDir, `${frame}.png`),
        "--frame",
        String(frame),
        ...common,
      ]);
    }
    console.log(`3D pilot previews: ${outputDir}`);
  } else {
    const output = path.resolve("out", `${spec.id}.mp4`);
    runRemotion([
      "render",
      "src/threeD/preview-entry.tsx",
      "Native3DPilot",
      output,
      ...common,
      "--concurrency=1",
    ]);
    const qa = inspectRenderedMedia(output, spec);
    console.log(qa.summary);
    if (!qa.passed) process.exit(1);
    console.log(`3D pilot: ${output} (intentional silence)`);
  }
}
