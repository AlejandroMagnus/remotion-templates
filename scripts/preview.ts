import { mkdir } from "node:fs/promises";
import path from "node:path";

import { evaluateSpec } from "../src/quality";
import { sceneDurationMs } from "../src/schema";
import { loadSpec, runRemotion, writeProps } from "./shared";

const { spec } = await loadSpec(process.argv[2]);
const issues = evaluateSpec(spec);
for (const issue of issues) {
  console.log(`${issue.level.toUpperCase()} [${issue.code}] ${issue.message}`);
}
if (issues.some((issue) => issue.level === "error")) process.exit(1);

const propsPath = await writeProps(spec);
if (process.argv.includes("--studio")) {
  runRemotion(["studio", "src/index.ts", "--props", propsPath]);
} else {
  const directory = path.resolve("out", "previews", spec.id);
  await mkdir(directory, { recursive: true });
  let cursor = 0;
  for (const [index, scene] of spec.scenes.entries()) {
    const frames = Math.max(
      1,
      Math.round((sceneDurationMs(spec, scene) / 1000) * spec.target.fps),
    );
    const midpoint = cursor + Math.floor(frames / 2);
    const output = path.join(
      directory,
      `${String(index + 1).padStart(2, "0")}-${scene.id}.png`,
    );
    runRemotion([
      "still",
      "src/index.ts",
      `InstavarTemplate${spec.target.aspect === "9:16" ? "Vertical" : spec.target.aspect === "4:5" ? "Portrait" : "Square"}`,
      output,
      "--frame",
      String(midpoint),
      "--props",
      propsPath,
      ...(spec.threeD?.scenes.length ? ["--gl=angle"] : []),
    ]);
    cursor += frames;
  }
  for (const [index, scene] of (spec.threeD?.scenes ?? []).entries()) {
    const midpoint = Math.floor(((scene.startMs + scene.endMs) / 2000) * spec.target.fps);
    runRemotion([
      "still", "src/index.ts",
      `InstavarTemplate${spec.target.aspect === "9:16" ? "Vertical" : spec.target.aspect === "4:5" ? "Portrait" : "Square"}`,
      path.join(directory, `3d-${index + 1}.png`),
      "--frame", String(midpoint), "--props", propsPath, "--gl=angle",
    ]);
  }
  console.log(`Previewed every scene: ${directory}`);
}
