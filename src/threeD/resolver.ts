import {
  assetSceneKey,
  EvidenceSceneSchema,
  assertThreeDPlanMatches,
  matchThreeDScene,
  type ThreeDPlan,
  type EvidenceScene,
  type TimedAssetScene,
} from "./schema";

export function assertNativeManifest(
  plan: ThreeDPlan | undefined,
  items: Array<
    TimedAssetScene & {
      status: string;
      asset?: { mediaType: string; threeD?: unknown };
    }
  >,
) {
  const nativeItems = items.filter(
    (item) => item.status === "resolved" && item.asset?.mediaType === "threeD",
  );
  assertThreeDPlanMatches(plan, nativeItems);
  for (const item of nativeItems) {
    const expected = matchThreeDScene(plan, item);
    const actual = EvidenceSceneSchema.safeParse(item.asset?.threeD);
    if (
      !expected ||
      !actual.success ||
      JSON.stringify(actual.data) !== JSON.stringify(expected)
    ) {
      throw new Error(
        "Native 3D manifest does not match VideoSpec. Rebuild resolved assets.",
      );
    }
  }
}

export function resolveNativeScene(
  scene: TimedAssetScene,
  native: EvidenceScene,
  productionCode: string,
  index: number,
) {
  return {
    ...scene,
    durationMs: scene.endMs - scene.startMs,
    mediaIntent: "threeD-intent" as const,
    status: "resolved" as const,
    asset: {
      provider: "native-three",
      providerId: `${productionCode}:${assetSceneKey(scene)}`,
      mediaType: "threeD" as const,
      localSrc: `generated/assets/native-three-${index}.json`,
      threeD: native,
    },
    mediaDecision: {
      preferred: "threeD",
      resolvedAs: "threeD",
      creativeIntent: "threeD-intent",
      executionFallback: "none",
      fallbackToImage: false,
      reason:
        "Native evidence-dossier executor selected by the timed VideoSpec plan.",
    },
  };
}
