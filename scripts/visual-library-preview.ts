import fs from "node:fs";
import path from "node:path";
import {
  loadCatalog,
  catalogFile,
  validateGlb,
} from "../src/assets/localCatalog";
import { EvidenceSceneSchema } from "../src/threeD/schema";
import { runRemotion } from "./shared";

const entry = loadCatalog().find(
  (a) => a.id === (process.argv[2] ?? "ph-book_encyclopedia_set_01"),
);
if (!entry || entry.mediaType !== "model")
  throw new Error("Indique el ID de un modelo importado.");
validateGlb(fs.readFileSync(catalogFile(entry)));
const directory = path.resolve("out/previews/visual-library", entry.id);
fs.mkdirSync(directory, { recursive: true });
const props = path.join(directory, "props.json");
const scene = EvidenceSceneSchema.parse({
  kind: "library-model",
  assetSceneId: "library-preview",
  startMs: 0,
  endMs: 4000,
  cueMs: 600,
  title: "Explorar el conocimiento",
  labels: ["Estudio", "Fuentes", "Criterio"],
  model: {
    id: entry.id,
    provider: entry.provider,
    src: entry.file,
    sha256: entry.sha256,
    sourceUrl: entry.sourceUrl,
    creator: entry.creator,
    license: entry.license,
  },
});
fs.writeFileSync(
  props,
  JSON.stringify({
    scene,
    width: 1080,
    height: 1920,
    fps: 30,
    durationInFrames: 120,
  }),
);
for (const frame of [15, 90])
  runRemotion([
    "still",
    "src/threeD/render-entry.tsx",
    "EvidenceDossierClip",
    path.join(directory, `${frame}.png`),
    "--frame",
    String(frame),
    "--props",
    props,
    "--gl=swangle",
  ]);
console.log(
  `Revise los fotogramas en ${directory}. La previsualización no aprueba el catálogo.`,
);
