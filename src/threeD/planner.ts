import type { WordTiming } from "../buildSemanticEvents";
import {
  ThreeDPlanSchema,
  type ThreeDPlan,
  type TimedAssetScene,
} from "./schema";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const proofWords =
  /\b(expedientes?|pruebas?|evidencias?|documentos?|probatorios?)\b/;
const compatibleRules = new Set(["expediente", "prueba"]);

/** Optional executor selection underneath the existing semantic director. */
export function planNativeThreeD(options: {
  enabled: boolean;
  durationMs: number;
  scenes: TimedAssetScene[];
  words: WordTiming[];
}): { plan: ThreeDPlan; reasons: string[] } {
  const plan: ThreeDPlan = { version: "1.0", scenes: [] };
  if (!options.enabled) return { plan, reasons: ["3d-disabled"] };
  if (!Number.isFinite(options.durationMs) || options.durationMs <= 0) {
    throw new Error("Invalid composition duration for 3D planning.");
  }
  const reasons: string[] = [];
  // Reserve the existing signature/end card; do not rewrite narration or scene timing.
  const closingStart = options.durationMs - 4100;
  const budget = Math.floor(options.durationMs * 0.3);
  let usedMs = 0;
  let previousEnd = -5000;
  for (const scene of [...options.scenes].sort(
    (a, b) => a.startMs - b.startMs,
  )) {
    if (!compatibleRules.has(scene.ruleId)) continue;
    const duration = scene.endMs - scene.startMs;
    const cue = options.words.find(
      (word) =>
        word.startMs >= scene.startMs &&
        word.startMs < scene.endMs - 900 &&
        proofWords.test(normalize(word.text)),
    );
    if (
      !cue ||
      duration < 3000 ||
      duration > 6000 ||
      scene.startMs < 0 ||
      scene.endMs > closingStart ||
      scene.startMs < previousEnd + 5000 ||
      usedMs + duration > budget ||
      plan.scenes.length >= 2
    ) {
      reasons.push(`kept-original:${scene.id}:${scene.startMs}`);
      continue;
    }
    plan.scenes.push({
      kind: "evidence-dossier",
      assetSceneId: scene.id,
      startMs: scene.startMs,
      endMs: scene.endMs,
      title:
        scene.ruleId === "expediente"
          ? "Organizar el expediente"
          : "Examinar la prueba",
      labels: ["Documentos", "Cronología", "Hechos"],
      cueMs: cue.startMs,
    });
    usedMs += duration;
    previousEnd = scene.endMs;
  }
  if (!plan.scenes.length) reasons.push("no-compatible-3d-scene");
  return { plan: ThreeDPlanSchema.parse(plan), reasons };
}
