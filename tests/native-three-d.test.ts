import { describe, expect, it } from "vitest";
import pilot from "../examples/native-3d-pilot.video.json";
import original from "../examples/proof-walkthrough.video.json";
import { VideoSpecSchema } from "../src/schema";
import {
  ThreeDPlanSchema,
  assertThreeDPlanMatches,
  matchThreeDScene,
} from "../src/threeD/schema";
import { planNativeThreeD } from "../src/threeD/planner";
import {
  resolveNativeScene,
  assertNativeManifest,
} from "../src/threeD/resolver";
import { evidenceMotion } from "../src/threeD/motion";

const shot = (startMs: number, ruleId = "prueba") => ({
  id: "split-shot",
  ruleId,
  startMs,
  endMs: startMs + 4000,
});
const word = (startMs: number, text = "prueba") => ({
  text,
  startMs,
  endMs: startMs + 200,
});
const native = VideoSpecSchema.parse(pilot).threeD!.scenes[0];

describe("native 3D contract", () => {
  it("keeps old specs compatible and does not activate 3D by default", () => {
    expect(VideoSpecSchema.parse(original).threeD).toBeUndefined();
    expect(
      planNativeThreeD({
        enabled: false,
        durationMs: 60000,
        scenes: [shot(5000)],
        words: [word(5200)],
      }).plan.scenes,
    ).toEqual([]);
  });

  it("preserves narrative timing and waits for an actual proof word", () => {
    const scenes = [shot(5000), shot(16000, "plazos"), shot(27000)];
    const words = [word(5400), word(16400), word(27400, "expediente")];
    const snapshot = structuredClone({ scenes, words });
    const result = planNativeThreeD({
      enabled: true,
      durationMs: 60000,
      scenes,
      words,
    });
    expect(
      result.plan.scenes.map((s) => [s.startMs, s.endMs, s.cueMs]),
    ).toEqual([
      [5000, 9000, 5400],
      [27000, 31000, 27400],
    ]);
    expect({ scenes, words }).toEqual(snapshot);
  });

  it("does not force a dossier on unrelated narration or near the end card", () => {
    const scenes = [shot(1000), shot(12000), shot(27000)];
    const result = planNativeThreeD({
      enabled: true,
      durationMs: 32000,
      scenes,
      words: [word(1300, "contrato"), word(15200), word(27400)],
    });
    // At 15.2s fewer than 900ms remain; the final shot overlaps the signature.
    expect(result.plan.scenes).toEqual([]);
    expect(result.reasons).toContain("no-compatible-3d-scene");
  });

  it("caps 3D at two shots, 30 percent and leaves space between appearances", () => {
    const scenes = [shot(0), shot(5000), shot(10000), shot(20000)];
    const result = planNativeThreeD({
      enabled: true,
      durationMs: 30000,
      scenes,
      words: scenes.map((s) => word(s.startMs + 200)),
    });
    expect(result.plan.scenes.map((s) => s.startMs)).toEqual([0, 10000]);
    const short = planNativeThreeD({
      enabled: true,
      durationMs: 11000,
      scenes,
      words: [word(200)],
    });
    expect(short.plan.scenes).toEqual([]);
  });

  it("uses ID and exact time to distinguish split shots and rejects stale plans", () => {
    const scene = {
      ...native,
      assetSceneId: "split-shot",
      startMs: 5000,
      endMs: 9000,
      cueMs: 5200,
    };
    const plan = ThreeDPlanSchema.parse({ version: "1.0", scenes: [scene] });
    expect(matchThreeDScene(plan, shot(1000))).toBeUndefined();
    expect(matchThreeDScene(plan, shot(5000))).toEqual(scene);
    expect(() => assertThreeDPlanMatches(plan, [shot(1000)])).toThrow(/Stale/);
    expect(() =>
      assertThreeDPlanMatches(plan, [shot(5000), shot(5000)]),
    ).toThrow(/ambiguous/);
    expect(() =>
      assertThreeDPlanMatches(plan, [shot(1000), shot(5000)]),
    ).not.toThrow();
  });

  it("rejects invalid, overlapping, oversized and out-of-composition scenes", () => {
    expect(
      ThreeDPlanSchema.safeParse({
        version: "1.0",
        scenes: [{ ...native, cueMs: 8000 }],
      }).success,
    ).toBe(false);
    expect(
      ThreeDPlanSchema.safeParse({
        version: "1.0",
        scenes: [{ ...native, endMs: 0 }],
      }).success,
    ).toBe(false);
    expect(
      ThreeDPlanSchema.safeParse({ version: "1.0", scenes: [native, native] })
        .success,
    ).toBe(false);
    expect(
      ThreeDPlanSchema.safeParse({
        version: "1.0",
        scenes: [{ ...native, endMs: 11000 }],
      }).success,
    ).toBe(false);
    expect(
      VideoSpecSchema.safeParse({
        ...pilot,
        target: { ...pilot.target, fixedDurationSec: 7 },
      }).success,
    ).toBe(false);
  });

  it("resolves native geometry without claiming a stock-video fallback", () => {
    const result = resolveNativeScene(
      { id: native.assetSceneId, ruleId: "prueba", startMs: 0, endMs: 8000 },
      native,
      "native-3d-pilot",
      0,
    );
    expect(result.asset.provider).toBe("native-three");
    expect(result.asset.mediaType).toBe("threeD");
    expect(result.mediaDecision).toMatchObject({
      resolvedAs: "threeD",
      executionFallback: "none",
      fallbackToImage: false,
    });
  });

  it("renders the same motion when seeking backward, and cues use seconds at every fps", () => {
    const first = evidenceMotion(90, 30, 1500);
    evidenceMotion(210, 30, 1500);
    expect(evidenceMotion(90, 30, 1500)).toEqual(first);
    expect(evidenceMotion(180, 60, 1500)).toEqual(first);
    expect(evidenceMotion(44, 30, 1500).opening).toBe(0);
    expect(evidenceMotion(60, 30, 1500).opening).toBeGreaterThan(0);
    expect(evidenceMotion(-10, 30, 1500)).toEqual(evidenceMotion(0, 30, 1500));
  });

  it("refuses missing, mutated or stale native assets instead of rendering a blank scene", () => {
    const plan = ThreeDPlanSchema.parse({ version: "1.0", scenes: [native] });
    const result = resolveNativeScene(
      { id: native.assetSceneId, ruleId: "prueba", startMs: 0, endMs: 8000 },
      native,
      "native-3d-pilot",
      0,
    );
    expect(() => assertNativeManifest(plan, [result])).not.toThrow();
    expect(() => assertNativeManifest(plan, [])).toThrow();
    expect(() => assertNativeManifest(undefined, [result])).toThrow(/3D/);
    expect(() =>
      assertNativeManifest(plan, [
        {
          ...result,
          asset: { ...result.asset, threeD: { ...native, cueMs: 801 } },
        },
      ]),
    ).toThrow(/3D/);
    expect(() =>
      assertNativeManifest(undefined, [
        { ...result, asset: { ...result.asset, threeD: {} } },
      ]),
    ).toThrow(/3D/);
  });
});
