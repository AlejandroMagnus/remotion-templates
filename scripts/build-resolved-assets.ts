import fs from "node:fs";
import path from "node:path";

import {
  type PexelsResolvedAsset,
  searchPexelsPhotos,
} from "../src/assets/providers/pexelsProvider";

import {
  rankVisualCandidate,
  semanticQueries,
  type DirectorScene,
} from "../src/assets/semanticVisualRanker";

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

const usedProviderIds =
  new Set<number>();

const usedSourceUrls =
  new Set<string>();

const creatorUsage =
  new Map<string, number>();

const searchCache =
  new Map<string, PexelsResolvedAsset[]>();

async function cachedSearch(
  query: string,
): Promise<PexelsResolvedAsset[]> {
  const cached =
    searchCache.get(query);

  if (cached) {
    return cached;
  }

  const result =
    await searchPexelsPhotos(
      query,
      20,
    );

  searchCache.set(
    query,
    result,
  );

  return result;
}

async function download(
  url: string,
  target: string,
) {
  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Download failed ${response.status}: ${url}`,
    );
  }

  fs.writeFileSync(
    target,
    Buffer.from(
      await response.arrayBuffer(),
    ),
  );
}

async function main() {
  if (!fs.existsSync(planPath)) {
    throw new Error(
      `Missing asset scene plan: ${planPath}`,
    );
  }

  fs.rmSync(
    outputDir,
    {
      recursive: true,
      force: true,
    },
  );

  fs.mkdirSync(
    outputDir,
    {
      recursive: true,
    },
  );

  const source =
    JSON.parse(
      fs.readFileSync(
        planPath,
        "utf8",
      ),
    );

  const scenes =
    source.scenes ?? [];

  const resolved: any[] = [];

  for (
    let sceneIndex = 0;
    sceneIndex < scenes.length;
    sceneIndex++
  ) {
    const scene =
      scenes[sceneIndex] as DirectorScene & {
        id: string;
        startMs: number;
        endMs: number;
        durationMs: number;
        route: string;
      };

    const queries =
      semanticQueries(
        scene,
        sceneIndex,
      );

    type RankedCandidate = {
      asset: PexelsResolvedAsset;
      query: string;
      queryIndex: number;
      searchPosition: number;
      score: ReturnType<
        typeof rankVisualCandidate
      >;
    };

    const candidateMap =
      new Map<
        number,
        RankedCandidate
      >();

    for (
      let queryIndex = 0;
      queryIndex < queries.length;
      queryIndex++
    ) {
      const query =
        queries[queryIndex];

      const candidates =
        await cachedSearch(query);

      candidates.forEach(
        (
          asset,
          searchPosition,
        ) => {
          if (
            usedProviderIds.has(
              asset.providerId,
            ) ||
            usedSourceUrls.has(
              asset.sourceUrl,
            )
          ) {
            return;
          }

          const creatorUseCount =
            creatorUsage.get(
              asset.creator,
            ) ?? 0;

          const score =
            rankVisualCandidate(
              scene,
              asset,
              query,
              searchPosition,
              creatorUseCount,
            );

          const previous =
            candidateMap.get(
              asset.providerId,
            );

          if (
            !previous ||
            score.total >
              previous.score.total
          ) {
            candidateMap.set(
              asset.providerId,
              {
                asset,
                query,
                queryIndex,
                searchPosition,
                score,
              },
            );
          }
        },
      );
    }

    const ranked =
      [...candidateMap.values()]
        .sort(
          (a, b) =>
            b.score.total -
            a.score.total,
        );

    const selected =
      ranked[0];

    const base = {
      id: scene.id,
      ruleId: scene.ruleId,
      concept: scene.concept,
      route: scene.route,
      startMs: scene.startMs,
      endMs: scene.endMs,
      durationMs:
        scene.durationMs,
      narrationContext:
        scene.narrationContext,
    };

    console.log(
      `\n[DIRECTOR ${sceneIndex + 1}/${scenes.length}] ${scene.ruleId}`,
    );

    console.log(
      `Candidates: ${ranked.length}`,
    );

    if (!selected) {
      console.log(
        "UNRESOLVED",
      );

      resolved.push({
        ...base,
        status: "unresolved",
      });

      continue;
    }

    const asset =
      selected.asset;

    usedProviderIds.add(
      asset.providerId,
    );

    usedSourceUrls.add(
      asset.sourceUrl,
    );

    creatorUsage.set(
      asset.creator,
      (creatorUsage.get(
        asset.creator,
      ) ?? 0) + 1,
    );

    console.log(
      `SELECTED: ${asset.providerId} | SCORE ${selected.score.total}`,
    );

    console.log(
      `ALT: ${asset.altText ?? ""}`,
    );

    console.log(
      `SEMANTIC HITS: ${selected.score.semanticHits.join(", ")}`,
    );

    const filename =
      `${String(
        sceneIndex + 1,
      ).padStart(
        2,
        "0",
      )}-${scene.ruleId}-${asset.providerId}.jpg`;

    const target =
      path.join(
        outputDir,
        filename,
      );

    await download(
      asset.remoteUrl,
      target,
    );

    resolved.push({
      ...base,

      status: "resolved",

      query:
        selected.query,

      directorSelection: {
        candidateCount:
          ranked.length,

        selectedScore:
          selected.score.total,

        scoreBreakdown:
          selected.score,

        selectedAlt:
          asset.altText ?? "",

        topCandidates:
          ranked
            .slice(0, 5)
            .map(
              (
                candidate,
                rank,
              ) => ({
                rank:
                  rank + 1,

                providerId:
                  candidate.asset
                    .providerId,

                score:
                  candidate.score
                    .total,

                alt:
                  candidate.asset
                    .altText ?? "",

                query:
                  candidate.query,

                semanticHits:
                  candidate.score
                    .semanticHits,
              }),
            ),
      },

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
        item.status ===
        "resolved",
    ).length;

  const uniqueCount =
    new Set(
      resolved
        .filter(
          (item) =>
            item.status ===
            "resolved",
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
      "V3.9.5-SEMANTIC-RANKING",

    generatedAt:
      new Date().toISOString(),

    totalScenes:
      scenes.length,

    resolvedCount,
    uniqueCount,

    duplicateAssets:
      resolvedCount -
      uniqueCount,

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
    "\n=== V3.9.5 SEMANTIC VISUAL RANKING ===",
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
      resolvedCount -
      uniqueCount
    }`,
  );

  if (
    resolvedCount === 0
  ) {
    throw new Error(
      "No semantic visual assets resolved",
    );
  }

  if (
    resolvedCount !==
    uniqueCount
  ) {
    throw new Error(
      "Duplicated assets detected",
    );
  }
}

main().catch(
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
