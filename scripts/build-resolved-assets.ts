import fs from "node:fs";
import path from "node:path";
import {
  PexelsResolvedAsset,
  searchPexelsPhotos,
  searchPexelsVideo,
} from "../src/assets/providers/pexelsProvider";

const ROOT = process.cwd();

const planPath = path.join(
  ROOT,
  "public/generated/video-juridico-001-asset-scene-plan.json",
);

const outputDir = path.join(
  ROOT,
  "public/generated/assets",
);

const manifestPath = path.join(
  ROOT,
  "public/generated/video-juridico-001-resolved-assets.json",
);

const QUERY_SETS: Record<string, string[]> = {
  autoridad: [
    "government official reviewing documents office",
    "public administration professional paperwork",
    "professional reading legal documents office",
  ],

  expediente: [
    "legal case file folder desk",
    "law office case documents",
    "court case paperwork close up",
  ],

  argumentos: [
    "lawyer reviewing legal strategy",
    "attorney writing case notes",
    "lawyer analyzing documents desk",
  ],

  prueba: [
    "legal evidence documents",
    "investigation paperwork evidence",
    "lawyer examining case documents",
  ],

  motivacion: [
    "lawyer analyzing written decision",
    "legal reasoning notes office",
    "judge reviewing documents",
  ],

  recurso: [
    "lawyer preparing appeal documents",
    "attorney court filing paperwork",
    "legal appeal documents desk",
  ],

  decision: [
    "legal decision document",
    "official signing documents",
    "court ruling paperwork",
  ],

  "debido-proceso": [
    "courtroom legal process",
    "lawyer court hearing",
    "justice legal procedure",
  ],

  defensa: [
    "defense lawyer client meeting",
    "lawyer preparing defense",
    "attorney consultation office",
  ],

  plazos: [
    "calendar legal deadline",
    "lawyer checking calendar",
    "deadline paperwork office",
  ],

  ignorar: [
    "unread documents desk",
    "bureaucracy paperwork office",
    "legal documents waiting",
  ],

  vulneracion: [
    "concerned lawyer documents",
    "legal rights attorney",
    "serious lawyer reviewing case",
  ],

  "accion-final": [
    "lawyer filing legal action",
    "attorney submitting documents",
    "lawyer courthouse documents",
  ],

  "semantic-filler": [
    "law office documents close up",
    "hands organizing paperwork",
    "professional office legal papers",
    "law books documents desk",
    "lawyer hands writing notes",
  ],
};

const usedProviderIds = new Set<number>();
const usedSourceUrls = new Set<string>();

function querySet(scene: any, index: number) {
  const key =
    scene.ruleId ??
    scene.concept ??
    "semantic-filler";

  const candidates =
    QUERY_SETS[key] ??
    QUERY_SETS["semantic-filler"];

  // Rotamos la primera búsqueda para aumentar diversidad.
  const offset = index % candidates.length;

  return [
    ...candidates.slice(offset),
    ...candidates.slice(0, offset),
  ];
}

function scoreCandidate(
  asset: PexelsResolvedAsset,
): number {
  const aspect =
    asset.width / asset.height;

  const verticalDistance =
    Math.abs(aspect - 9 / 16);

  const resolutionBonus =
    Math.min(asset.width * asset.height, 8_000_000) /
    8_000_000;

  return (
    verticalDistance * 100 -
    resolutionBonus * 8
  );
}

async function resolveUniquePhoto(
  queries: string[],
): Promise<{
  asset: PexelsResolvedAsset;
  query: string;
} | null> {
  for (const query of queries) {
    const candidates =
      await searchPexelsPhotos(query, 30);

    const unique = candidates
      .filter(
        (asset) =>
          !usedProviderIds.has(asset.providerId) &&
          !usedSourceUrls.has(asset.sourceUrl),
      )
      .sort(
        (a, b) =>
          scoreCandidate(a) -
          scoreCandidate(b),
      );

    const best = unique[0];

    if (best) {
      usedProviderIds.add(best.providerId);
      usedSourceUrls.add(best.sourceUrl);

      return {
        asset: best,
        query,
      };
    }
  }

  return null;
}

async function download(
  url: string,
  target: string,
) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `Download failed ${res.status}: ${url}`,
    );
  }

  fs.writeFileSync(
    target,
    Buffer.from(
      await res.arrayBuffer(),
    ),
  );
}

async function main() {
  if (!fs.existsSync(planPath)) {
    throw new Error(
      `Missing asset scene plan: ${planPath}`,
    );
  }

  fs.rmSync(outputDir, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  const source = JSON.parse(
    fs.readFileSync(planPath, "utf8"),
  );

  const scenes = source.scenes ?? [];
  const resolved: any[] = [];

  for (
    let index = 0;
    index < scenes.length;
    index++
  ) {
    const scene = scenes[index];

    const base = {
      id: scene.id,
      ruleId: scene.ruleId,
      concept: scene.concept,
      route: scene.route,
      startMs: scene.startMs,
      endMs: scene.endMs,
      durationMs: scene.durationMs,
    };

    const queries = querySet(
      scene,
      index,
    );

    console.log(
      `[${index + 1}/${scenes.length}] ` +
      `${scene.ruleId} | buscando asset único`,
    );

    let selection =
      await resolveUniquePhoto(queries);

    // Respaldo excepcional: video distinto.
    if (!selection) {
      const fallbackQuery =
        queries[0];

      const video =
        await searchPexelsVideo(
          fallbackQuery,
          scene.durationMs,
        );

      if (
        video &&
        !usedProviderIds.has(video.providerId)
      ) {
        usedProviderIds.add(video.providerId);
        usedSourceUrls.add(video.sourceUrl);

        selection = {
          asset: video,
          query: fallbackQuery,
        };
      }
    }

    if (!selection) {
      console.log(
        `UNRESOLVED: ${scene.ruleId}`,
      );

      resolved.push({
        ...base,
        status: "unresolved",
      });

      continue;
    }

    const asset = selection.asset;

    const extension =
      asset.mediaType === "video"
        ? "mp4"
        : "jpg";

    const filename =
      `${String(index + 1).padStart(2, "0")}-` +
      `${scene.ruleId}-${asset.providerId}.${extension}`;

    const target = path.join(
      outputDir,
      filename,
    );

    await download(
      asset.remoteUrl,
      target,
    );

    console.log(
      `RESOLVED UNIQUE: ` +
      `${scene.ruleId} -> ${filename}`,
    );

    resolved.push({
      ...base,
      status: "resolved",
      query: selection.query,
      asset: {
        ...asset,
        localSrc:
          `generated/assets/${filename}`,
      },
    });
  }

  const resolvedCount =
    resolved.filter(
      (item) =>
        item.status === "resolved",
    ).length;

  const uniqueCount =
    new Set(
      resolved
        .filter(
          (item) =>
            item.status === "resolved",
        )
        .map(
          (item) =>
            item.asset.providerId,
        ),
    ).size;

  const manifest = {
    productionCode:
      "video-juridico-001",

    version:
      "V3.9.4-DIVERSITY-MOTION",

    generatedAt:
      new Date().toISOString(),

    totalScenes:
      scenes.length,

    resolvedCount,

    uniqueCount,

    duplicateAssets:
      resolvedCount - uniqueCount,

    assets:
      resolved,
  };

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      manifest,
      null,
      2,
    ),
  );

  console.log(
    "=== V3.9.4 DIVERSITY ===",
  );

  console.log(
    `Scenes: ${scenes.length}`,
  );

  console.log(
    `Resolved: ${resolvedCount}`,
  );

  console.log(
    `Unique: ${uniqueCount}`,
  );

  console.log(
    `Duplicates: ${
      resolvedCount - uniqueCount
    }`,
  );

  if (resolvedCount === 0) {
    throw new Error(
      "No visual assets resolved",
    );
  }

  if (
    resolvedCount !== uniqueCount
  ) {
    throw new Error(
      "V3.9.4 detected duplicated assets",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
