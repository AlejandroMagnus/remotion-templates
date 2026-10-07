import fs from "node:fs";
import path from "node:path";

type Input = {
  productionCode: string;
  topic: string;
  hook: string;
  reasoningChain: string[];
  conclusion: string;
  closingIdea: string;
};

const root = process.cwd();
const contentDir = path.join(root, "content");
const examplesDir = path.join(root, "examples");
const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}
function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

const files = fs.readdirSync(contentDir).filter((name) => /^video-\d{3}\.silec\.json$/.test(name));
let count = 0;
for (const name of files) {
  const input = readJson<Input>(path.join(contentDir, name));
  const code = input.productionCode;
  const examplePath = path.join(examplesDir, `${code}.video.json`);
  const existing = fs.existsSync(examplePath) ? readJson<any>(examplePath) : {};
  const narration = [input.hook, ...input.reasoningChain, input.conclusion, input.closingIdea]
    .map(clean)
    .filter(Boolean)
    .join(" ");
  const scenes = [
    {
      id: "scene-01",
      kind: "hero",
      content: { title: input.topic, subtitle: input.hook },
      timing: { durationMs: 8000 },
    },
    ...input.reasoningChain.slice(0, 4).map((text, index) => ({
      id: `scene-${String(index + 2).padStart(2, "0")}`,
      kind: "statement",
      content: { title: `Paso ${index + 1}`, subtitle: text },
      timing: { durationMs: 9000 },
    })),
    {
      id: `scene-${String(Math.min(input.reasoningChain.length, 4) + 2).padStart(2, "0")}`,
      kind: "cta",
      content: { title: input.conclusion, subtitle: input.closingIdea },
      timing: { durationMs: 10000 },
    },
  ];
  writeJson(examplePath, {
    ...existing,
    id: code,
    schemaVersion: existing.schemaVersion ?? "1.0",
    audio: { ...(existing.audio ?? {}), mode: "narration", narrationText: narration },
    scenes,
  });
  count++;
}
console.log(`SILEC examples sincronizados: ${count}`);
