import { z } from "zod";

/** Only reviewed visual executors belong here; this does not validate legal content. */
export const EvidenceSceneSchema = z
  .object({
    kind: z.literal("evidence-dossier"),
    assetSceneId: z.string().min(1).max(180),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    title: z.string().min(1).max(64),
    labels: z.tuple([
      z.string().min(1).max(24),
      z.string().min(1).max(24),
      z.string().min(1).max(24),
    ]),
    cueMs: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((scene, context) => {
    if (scene.endMs <= scene.startMs || scene.endMs - scene.startMs > 10000) {
      context.addIssue({
        code: "custom",
        message: "3D scenes require 0 < duration <= 10000 ms.",
      });
    }
    if (scene.cueMs < scene.startMs || scene.cueMs >= scene.endMs) {
      context.addIssue({
        code: "custom",
        path: ["cueMs"],
        message: "The narration cue must be inside the 3D scene.",
      });
    }
  });

export const ThreeDPlanSchema = z
  .object({
    version: z.literal("1.0"),
    scenes: z.array(EvidenceSceneSchema).max(2),
  })
  .strict()
  .superRefine((plan, context) => {
    let endMs = 0;
    for (const [index, scene] of plan.scenes.entries()) {
      if (scene.startMs < endMs) {
        context.addIssue({
          code: "custom",
          path: ["scenes", index],
          message: "3D scenes must be ordered and may not overlap.",
        });
      }
      endMs = scene.endMs;
    }
  });

export type EvidenceScene = z.infer<typeof EvidenceSceneSchema>;
export type ThreeDPlan = z.infer<typeof ThreeDPlanSchema>;

export type TimedAssetScene = {
  id: string;
  ruleId: string;
  startMs: number;
  endMs: number;
};

// Split shots can share an ID in the existing director: time is part of identity.
export const assetSceneKey = (scene: {
  id: string;
  startMs: number;
  endMs: number;
}) => JSON.stringify([scene.id, scene.startMs, scene.endMs]);

export function matchThreeDScene(
  plan: ThreeDPlan | undefined,
  scene: TimedAssetScene,
) {
  return plan?.scenes.find(
    (item) =>
      item.assetSceneId === scene.id &&
      item.startMs === scene.startMs &&
      item.endMs === scene.endMs,
  );
}

export function assertThreeDPlanMatches(
  plan: ThreeDPlan | undefined,
  scenes: TimedAssetScene[],
) {
  for (const native of plan?.scenes ?? []) {
    const matches = scenes.filter(
      (scene) =>
        scene.id === native.assetSceneId &&
        scene.startMs === native.startMs &&
        scene.endMs === native.endMs,
    );
    if (matches.length !== 1) {
      throw new Error(
        `Stale or ambiguous 3D plan for ${native.assetSceneId}. Rebuild the 3D plan after the timeline.`,
      );
    }
  }
}
