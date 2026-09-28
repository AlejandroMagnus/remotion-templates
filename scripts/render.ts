import path from "node:path";

import { evaluateSpec } from "../src/quality";
import { inspectRenderedMedia } from "./media-qa";
import { prerenderThreeDScenes } from "./prerender-three-d-scenes";
import { compositionId, loadSpec, runRemotion, writeProps } from "./shared";

const { spec } = await loadSpec(process.argv[2]);
const issues = evaluateSpec(spec);
for (const issue of issues) {
  console.log(`${issue.level.toUpperCase()} [${issue.code}] ${issue.message}`);
}
if (issues.some((issue) => issue.level === "error")) process.exit(1);
const renderSpec = await prerenderThreeDScenes(spec);
const propsPath = await writeProps(renderSpec);
const output = path.resolve(
  process.argv[3] ?? path.join("out", `${spec.id}.mp4`),
);
runRemotion([
  "render",
  "src/index.ts",
  compositionId(spec),
  output,
  "--props",
  propsPath,
]);
const qa = inspectRenderedMedia(output, renderSpec);
console.log(qa.summary);
if (!qa.passed) process.exit(1);
console.log(`Rendered and verified: ${output}`);
