import { z } from "zod";
import {ThreeDPlanSchema} from "./threeD/schema";

export const templateIds = [
  "qa-ad",
  "proof-walkthrough",
  "announcement-brief",
  "social-remix",
  "finance-brief",
] as const;

export const sceneKinds = [
  "hero",
  "statement",
  "mechanism",
  "points",
  "equation",
  "video-window",
  "cta",
  "custom",
] as const;

const scene = z.object({
  id: z.string().min(1),
  kind: z.enum(sceneKinds),
  content: z.record(z.string(), z.unknown()),
  timing: z
    .object({ durationMs: z.number().int().positive().optional() })
    .optional(),
});

export const NarrationTimingManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    source: z.literal("segmented-synthesis"),
    durationMs: z
      .number()
      .int()
      .positive()
      .max(20 * 60 * 1000),
    segments: z
      .array(
        z.object({
          sceneId: z.string().min(1).max(80),
          startMs: z.number().int().nonnegative(),
          endMs: z.number().int().positive(),
          durationMs: z.number().int().positive(),
        }),
      )
      .min(1)
      .max(24),
  })
  .superRefine((manifest, context) => {
    let previousEnd = 0;
    const ids = new Set<string>();
    manifest.segments.forEach((segment, index) => {
      if (ids.has(segment.sceneId)) {
        context.addIssue({
          code: "custom",
          path: ["segments", index, "sceneId"],
          message: "Narration timing scene IDs must be unique.",
        });
      }
      ids.add(segment.sceneId);
      if (segment.startMs !== previousEnd) {
        context.addIssue({
          code: "custom",
          path: ["segments", index, "startMs"],
          message: "Narration timing segments must be contiguous.",
        });
      }
      if (segment.durationMs !== segment.endMs - segment.startMs) {
        context.addIssue({
          code: "custom",
          path: ["segments", index, "durationMs"],
          message: "Narration timing duration must equal endMs minus startMs.",
        });
      }
      previousEnd = segment.endMs;
    });
    if (previousEnd !== manifest.durationMs) {
      context.addIssue({
        code: "custom",
        path: ["durationMs"],
        message: "Narration timing duration must end with the final segment.",
      });
    }
  });

export const VideoSpecSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,80}$/),
  templateFamily: z.enum(templateIds),
  meta: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
  target: z.object({
    aspect: z.enum(["9:16", "4:5", "1:1"]),
    fps: z.number().int().positive().default(30),
    durationMode: z.enum(["auto", "fixed"]).default("auto"),
    fixedDurationSec: z.number().positive().optional(),
  }),
  style: z
    .object({
      theme: z
        .enum(["default", "editorial-light", "editorial-dark", "clinical"])
        .default("default"),
      variant: z.string().default("default"),
      safeAreaProfile: z.enum(["baseline", "metaSafe"]).default("baseline"),
      showSceneLabels: z.boolean().default(false),
    })
    .default({
      theme: "default",
      variant: "default",
      safeAreaProfile: "baseline",
      showSceneLabels: false,
    }),
  audio: z
    .object({
      mode: z.enum(["auto", "narration", "music", "silent"]).default("auto"),
      narrationText: z.string().optional(),
      narrationSrc: z.string().optional(),
      narrationTiming: NarrationTimingManifestSchema.optional(),
      narrationVolume: z.number().min(0).max(1).default(1),
      musicSrc: z.string().optional(),
      musicVolume: z.number().min(0).max(1).default(0.16),
      ducking: z.boolean().default(true),
    })
    .default({
      mode: "auto",
      narrationVolume: 1,
      musicVolume: 0.16,
      ducking: true,
    }),
  assets: z
    .object({
      logoSrc: z.string().optional(),
      posterSrc: z.string().optional(),
    })
    .default({}),
  scenes: z.array(scene).min(1),
  threeD: ThreeDPlanSchema.optional(),
}).superRefine((spec, context) => {
  const totalMs = spec.target.durationMode === "fixed" && spec.target.fixedDurationSec
    ? spec.target.fixedDurationSec * 1000
    : spec.scenes.reduce((sum, item) => sum +
      (spec.audio.narrationTiming?.segments.find((segment) => segment.sceneId === item.id)?.durationMs ?? item.timing?.durationMs ?? 3000), 0);
  for (const [index, item] of (spec.threeD?.scenes ?? []).entries()) {
    if (item.endMs > totalMs) context.addIssue({code: "custom", path: ["threeD", "scenes", index, "endMs"], message: "3D scene exceeds composition duration."});
  }
});

export type VideoSpec = z.infer<typeof VideoSpecSchema>;
export type NarrationTimingManifest = z.infer<
  typeof NarrationTimingManifestSchema
>;

export function sceneDurationMs(
  spec: VideoSpec,
  scene: VideoSpec["scenes"][number],
): number {
  const timed = spec.audio.narrationTiming?.segments.find(
    (segment) => segment.sceneId === scene.id,
  );
  return timed?.durationMs ?? scene.timing?.durationMs ?? 3000;
}

export function dimensions(aspect: VideoSpec["target"]["aspect"]) {
  if (aspect === "9:16") return { width: 1080, height: 1920 };
  if (aspect === "4:5") return { width: 1080, height: 1350 };
  return { width: 1080, height: 1080 };
}

export function compositionId(spec: VideoSpec): string {
  const suffix =
    spec.target.aspect === "9:16"
      ? "Vertical"
      : spec.target.aspect === "4:5"
        ? "Portrait"
        : "Square";
  return `InstavarTemplate${suffix}`;
}

export function durationInFrames(spec: VideoSpec): number {
  if (spec.target.durationMode === "fixed" && spec.target.fixedDurationSec) {
    return Math.max(
      1,
      Math.round(spec.target.fixedDurationSec * spec.target.fps),
    );
  }
  const milliseconds = spec.scenes.reduce(
    (sum, item) => sum + sceneDurationMs(spec, item),
    0,
  );
  return Math.max(1, Math.round((milliseconds / 1000) * spec.target.fps));
}

export function expectsAudibleAudio(spec: VideoSpec): boolean {
  if (spec.audio.mode === "silent") return false;
  if (spec.audio.mode === "narration") return true;
  if (spec.audio.mode === "music") return true;
  return Boolean(spec.audio.narrationSrc || spec.audio.musicSrc);
}
