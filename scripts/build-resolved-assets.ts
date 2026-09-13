import fs from "node:fs";
import path from "node:path";
import {
  searchPexelsPhoto,
  searchPexelsVideo,
} from "../src/assets/providers/pexelsProvider";

const ROOT = process.cwd();

const planPath = path.join(
  ROOT,
  "public/generated/video-juridico-001-asset-scene-plan.json",
);

const outputDir = path.join(ROOT, "public/generated/assets");

const manifestPath = path.join(
  ROOT,
  "public/generated/video-juridico-001-resolved-assets.json",
);

const queries: Record<string, string> = {
  autoridad: "government official working office legal documents",
  expediente: "legal case file documents desk",
  recurso: "lawyer legal appeal documents office",
  motivacion: "legal reasoning documents law office",
  decision: "legal decision document office",
};

async function download(url: string, target: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(target, buffer);
}

async function main() {
  if (!fs.existsSync(planPath)) {
    throw new Error(`Missing asset scene plan: ${planPath}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const source = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const resolved: any[] = [];

  for (const scene of source.scenes ?? []) {
    const base = {
      id: scene.id,
      ruleId: scene.ruleId,
      concept: scene.concept,
      route: scene.route,
      startMs: scene.startMs,
      endMs: scene.endMs,
      durationMs: scene.durationMs,
    };

    if (
      scene.route !== "REALISTIC_SCENE" &&
      scene.route !== "DOCUMENT_OBJECT"
    ) {
      resolved.push({ ...base, status: "delegated" });
      continue;
    }

    const query =
      queries[scene.ruleId] ??
      queries[scene.concept] ??
      String(scene.concept ?? scene.ruleId).replaceAll("-", " ");

    console.log(`Resolving ${scene.ruleId} | ${scene.route} | ${query}`);

    let asset = null;

    if (scene.route === "REALISTIC_SCENE") {
      asset = await searchPexelsVideo(query, scene.durationMs);

      if (!asset) {
        asset = await searchPexelsPhoto(query);
      }
    } else {
      asset = await searchPexelsPhoto(query);

      if (!asset) {
        asset = await searchPexelsVideo(query, scene.durationMs);
      }
    }

    if (!asset) {
      console.log(`UNRESOLVED: ${scene.ruleId}`);
      resolved.push({ ...base, status: "unresolved", query });
      continue;
    }

    const extension = asset.mediaType === "video" ? "mp4" : "jpg";
    const filename = `${scene.id}-${scene.ruleId}.${extension}`;
    const target = path.join(outputDir, filename);

    await download(asset.remoteUrl, target);

    console.log(
      `RESOLVED: ${scene.ruleId} -> ${asset.mediaType} -> ${filename}`,
    );

    resolved.push({
      ...base,
      status: "resolved",
      query,
      asset: {
        ...asset,
        localSrc: `generated/assets/${filename}`,
      },
    });
  }

  const manifest = {
    productionCode: "video-juridico-001",
    version: "V3.9.2-A",
    provider: "pexels",
    generatedAt: new Date().toISOString(),
    resolvedCount: resolved.filter((x) => x.status === "resolved").length,
    assets: resolved,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log("=== V3.9.2-A ASSET RESOLVER ===");
  console.log(`Resolved: ${manifest.resolvedCount}`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
