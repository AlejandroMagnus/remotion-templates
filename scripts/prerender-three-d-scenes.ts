import fs from "node:fs";
import path from "node:path";
import { VideoSpecSchema, dimensions, type VideoSpec } from "../src/schema";
import type { EvidenceScene } from "../src/threeD/schema";
import { runRemotion } from "./shared";

type ManifestAsset = {
  id: string;
  startMs: number;
  endMs: number;
  status?: string;
  asset?: {
    provider?: string;
    providerId?: string;
    mediaType?: string;
    localSrc?: string;
    threeD?: unknown;
    [key: string]: unknown;
  };
  mediaDecision?: Record<string, unknown>;
  [key: string]: unknown;
};

type Manifest = {
  productionCode?: string;
  assets?: ManifestAsset[];
  mediaSummary?: Record<string, number>;
  creativeExecution?: Record<string, unknown>;
  [key: string]: unknown;
};

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function normalizeScene(scene: EvidenceScene): EvidenceScene {
  const durationMs = scene.endMs - scene.startMs;
  return {
    ...scene,
    startMs: 0,
    endMs: durationMs,
    cueMs: Math.max(0, scene.cueMs - scene.startMs),
  };
}

function findManifestAsset(
  assets: ManifestAsset[],
  scene: EvidenceScene,
): ManifestAsset {
  const matches = assets.filter(
    (item) =>
      item.id === scene.assetSceneId &&
      item.startMs === scene.startMs &&
      item.endMs === scene.endMs,
  );
  if (matches.length !== 1) {
    throw new Error(
      `3D prerender expected exactly one manifest asset for ${scene.assetSceneId}; found ${matches.length}.`,
    );
  }
  const item = matches[0];
  if (item.asset?.mediaType !== "threeD") {
    throw new Error(
      `3D prerender expected mediaType=threeD for ${scene.assetSceneId}.`,
    );
  }
  return item;
}

export async function prerenderThreeDScenes(
  spec: VideoSpec,
): Promise<VideoSpec> {
  const scenes = spec.threeD?.scenes ?? [];
  if (!scenes.length) {
    console.log(
      "3D prerender: no compatible scene selected; using normal fast render.",
    );
    return spec;
  }

  const manifestPath = path.resolve(
    "public/generated",
    `${spec.id}-resolved-assets.json`,
  );
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`3D prerender manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  ) as Manifest;
  const assets = manifest.assets ?? [];
  const { width, height } = dimensions(spec.target.aspect);
  const fps = spec.target.fps;
  const outputDir = path.resolve("public/generated", spec.id, "three-d");
  fs.mkdirSync(outputDir, { recursive: true });

  const audit: Array<Record<string, unknown>> = [];

  for (const [index, scene] of scenes.entries()) {
    const item = findManifestAsset(assets, scene);
    const normalized = normalizeScene(scene);
    const durationMs = normalized.endMs;
    const durationInFrames = Math.max(1, Math.ceil((durationMs / 1000) * fps));

    const propsPath = path.resolve(
      "public/generated",
      `${spec.id}-three-d-${index + 1}-props.json`,
    );

    writeJson(propsPath, {
      scene: normalized,
      width,
      height,
      fps,
      durationInFrames,
    });

    const fileName = `scene-${String(index + 1).padStart(2, "0")}.mp4`;
    const localSrc = `generated/${spec.id}/three-d/${fileName}`;
    const output = path.resolve("public", localSrc);

    console.log(
      `3D prerender ${index + 1}/${scenes.length}: ${scene.assetSceneId} (${durationMs} ms)`,
    );

    runRemotion([
      "render",
      "src/threeD/render-entry.tsx",
      "EvidenceDossierClip",
      output,
      "--props",
      propsPath,
      "--gl=swangle",
      "--concurrency=1",
      "--codec=h264",
      "--crf=18",
    ]);

    if (!fs.existsSync(output) || fs.statSync(output).size < 10_000) {
      throw new Error(`3D prerender output invalid: ${output}`);
    }

    item.asset = {
      ...(item.asset ?? {}),
      provider: "native-three-prerendered",
      providerId: `${spec.id}:${scene.assetSceneId}:${index + 1}`,
      mediaType: "video",
      localSrc,
    };
    delete item.asset.threeD;

    item.mediaDecision = {
      ...(item.mediaDecision ?? {}),
      preferred: "video",
      resolvedAs: "video",
      creativeIntent: "threeD-prerendered",
      executionFallback: "none",
      fallbackToImage: false,
      reason:
        "Native 3D rendered once as a short clip, then composed by the normal fast 2D pipeline.",
    };

    audit.push({
      index: index + 1,
      assetSceneId: scene.assetSceneId,
      startMs: scene.startMs,
      endMs: scene.endMs,
      durationMs,
      localSrc,
      bytes: fs.statSync(output).size,
      backend: "swangle",
    });
  }

  if (manifest.mediaSummary) {
    const oldThreeD = Number(manifest.mediaSummary.threeD ?? 0);
    const oldVideos = Number(manifest.mediaSummary.videos ?? 0);
    manifest.mediaSummary.threeD = Math.max(0, oldThreeD - scenes.length);
    manifest.mediaSummary.videos = oldVideos + scenes.length;
  }

  manifest.creativeExecution = {
    ...(manifest.creativeExecution ?? {}),
    nativeThreeDPrerenderedSceneCount: scenes.length,
    finalRenderBackend: "normal-2d",
  };

  writeJson(manifestPath, manifest);

  writeJson(
    path.resolve("public/generated", `${spec.id}-three-d-prerender.json`),
    {
      productionCode: spec.id,
      version: "V3.18-SELECTIVE-3D-PRERENDER",
      sceneCount: scenes.length,
      clips: audit,
      finalRenderBackend: "normal-2d",
    },
  );

  const { threeD: _removed, ...withoutThreeD } = spec;
  const finalSpec = VideoSpecSchema.parse(withoutThreeD);

  console.log(
    `3D prerender complete: ${scenes.length} clip(s). Final video returns to normal 2D render.`,
  );

  return finalSpec;
}
