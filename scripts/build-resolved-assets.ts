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

const productionCode =
  process.env.PRODUCTION_CODE ??
  "video-juridico-001";

const planPath = path.join(
  ROOT,
  `public/generated/${productionCode}-asset-scene-plan.json`,
);

const outputDir = path.join(
  ROOT,
  "public/generated/assets",
);

const manifestPath = path.join(
  ROOT,
  `public/generated/${productionCode}-resolved-assets.json`,
);

/**
 * V3.15-B2
 * Memoria visual persistente entre producciones.
 *
 * IMPORTANTE:
 * Este archivo vive fuera de public/generated,
 * porque generated se limpia al comenzar cada render.
 */
const visualMemoryPath = path.join(
  ROOT,
  "data/visual-memory.json",
);

type VisualMemoryAsset = {
  provider: "pexels";
  providerId: number;
  sourceUrl: string;
  creator: string;
  lastProductionCode: string;
  lastUsedAt: string;
  useCount: number;
};

type VisualMemory = {
  version: string;
  assets: VisualMemoryAsset[];
};

const EMPTY_MEMORY: VisualMemory = {
  version: "V3.15-B2",
  assets: [],
};

function loadVisualMemory(): VisualMemory {
  if (
    !fs.existsSync(
      visualMemoryPath,
    )
  ) {
    return {
      ...EMPTY_MEMORY,
      assets: [],
    };
  }

  try {
    const parsed =
      JSON.parse(
        fs.readFileSync(
          visualMemoryPath,
          "utf8",
        ),
      ) as Partial<VisualMemory>;

    return {
      version:
        parsed.version ??
        "V3.15-B2",

      assets:
        Array.isArray(
          parsed.assets,
        )
          ? parsed.assets
          : [],
    };
  } catch (error) {
    console.warn(
      "Visual memory could not be parsed. Starting with empty memory.",
      error,
    );

    return {
      ...EMPTY_MEMORY,
      assets: [],
    };
  }
}

function saveVisualMemory(
  memory: VisualMemory,
) {
  fs.mkdirSync(
    path.dirname(
      visualMemoryPath,
    ),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    visualMemoryPath,
    JSON.stringify(
      memory,
      null,
      2,
    ),
  );
}

/**
 * Duplicación dentro del mismo video:
 * prohibición absoluta.
 */
const usedProviderIds =
  new Set<number>();

const usedSourceUrls =
  new Set<string>();

/**
 * Diversidad de autores dentro
 * del mismo video.
 */
const creatorUsage =
  new Map<string, number>();

const searchCache =
  new Map<
    string,
    PexelsResolvedAsset[]
  >();

async function cachedSearch(
  query: string,
): Promise<
  PexelsResolvedAsset[]
> {
  const cached =
    searchCache.get(query);

  if (cached) {
    return cached;
  }

  /*
   * V3.15-B:
   * ampliamos el universo por consulta.
   */
  const result =
    await searchPexelsPhotos(
      query,
      30,
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

/**
 * Penalización histórica.
 *
 * No prohibimos eternamente una buena
 * fotografía, pero hacemos muy difícil
 * reutilizarla mientras existan
 * alternativas adecuadas.
 */
function historicalPenalty(
  asset: PexelsResolvedAsset,
  memory: VisualMemory,
): {
  penalty: number;
  previousUseCount: number;
  previousProduction:
    string | null;
} {
  const previous =
    memory.assets.find(
      (item) =>
        item.providerId ===
          asset.providerId ||
        item.sourceUrl ===
          asset.sourceUrl,
    );

  if (!previous) {
    return {
      penalty: 0,
      previousUseCount: 0,
      previousProduction:
        null,
    };
  }

  /*
   * 32 puntos por haber aparecido antes,
   * más 12 por cada reutilización
   * histórica adicional.
   */
  const penalty =
    Math.min(
      80,
      32 +
        Math.max(
          0,
          previous.useCount - 1,
        ) *
          12,
    );

  return {
    penalty,
    previousUseCount:
      previous.useCount,
    previousProduction:
      previous.lastProductionCode,
  };
}

function registerHistoricalUse(
  memory: VisualMemory,
  asset: PexelsResolvedAsset,
) {
  const now =
    new Date().toISOString();

  const existing =
    memory.assets.find(
      (item) =>
        item.providerId ===
          asset.providerId ||
        item.sourceUrl ===
          asset.sourceUrl,
    );

  if (existing) {
    existing.useCount += 1;

    existing.lastProductionCode =
      productionCode;

    existing.lastUsedAt =
      now;

    existing.creator =
      asset.creator;

    existing.sourceUrl =
      asset.sourceUrl;

    return;
  }

  memory.assets.push({
    provider: "pexels",

    providerId:
      asset.providerId,

    sourceUrl:
      asset.sourceUrl,

    creator:
      asset.creator,

    lastProductionCode:
      productionCode,

    lastUsedAt:
      now,

    useCount: 1,
  });
}

async function main() {
  if (
    !fs.existsSync(planPath)
  ) {
    throw new Error(
      `Missing asset scene plan: ${planPath}`,
    );
  }

  const visualMemory =
    loadVisualMemory();

  console.log(
    "\n=== VISUAL MEMORY V3.15-B2 ===",
  );

  console.log(
    `Historical assets loaded: ${visualMemory.assets.length}`,
  );

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
    sceneIndex <
    scenes.length;
    sceneIndex++
  ) {
    const scene =
      scenes[
        sceneIndex
      ] as DirectorScene & {
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
      asset:
        PexelsResolvedAsset;

      query: string;

      queryIndex: number;

      searchPosition: number;

      score: ReturnType<
        typeof rankVisualCandidate
      >;

      historicalPenalty:
        number;

      historicalUseCount:
        number;

      previousProduction:
        string | null;

      finalScore:
        number;
    };

    const candidateMap =
      new Map<
        number,
        RankedCandidate
      >();

    for (
      let queryIndex = 0;
      queryIndex <
      queries.length;
      queryIndex++
    ) {
      const query =
        queries[
          queryIndex
        ];

      const candidates =
        await cachedSearch(
          query,
        );

      candidates.forEach(
        (
          asset,
          searchPosition,
        ) => {
          /*
           * Repetición dentro del mismo
           * video: nunca.
           */
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

          const history =
            historicalPenalty(
              asset,
              visualMemory,
            );

          const finalScore =
            score.total -
            history.penalty;

          const previous =
            candidateMap.get(
              asset.providerId,
            );

          if (
            !previous ||
            finalScore >
              previous.finalScore
          ) {
            candidateMap.set(
              asset.providerId,
              {
                asset,
                query,
                queryIndex,
                searchPosition,
                score,

                historicalPenalty:
                  history.penalty,

                historicalUseCount:
                  history.previousUseCount,

                previousProduction:
                  history.previousProduction,

                finalScore,
              },
            );
          }
        },
      );
    }

    const ranked =
      [
        ...candidateMap.values(),
      ].sort(
        (a, b) =>
          b.finalScore -
          a.finalScore,
      );

    const selected =
      ranked[0];

    const base = {
      id:
        scene.id,

      ruleId:
        scene.ruleId,

      concept:
        scene.concept,

      route:
        scene.route,

      startMs:
        scene.startMs,

      endMs:
        scene.endMs,

      durationMs:
        scene.durationMs,

      narrationContext:
        scene.narrationContext,
    };

    console.log(
      `\n[DIRECTOR ${sceneIndex + 1}/${scenes.length}] ${scene.ruleId}`,
    );

    console.log(
      `Queries: ${queries.length}`,
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
        status:
          "unresolved",
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
      (
        creatorUsage.get(
          asset.creator,
        ) ?? 0
      ) + 1,
    );

    console.log(
      `SELECTED: ${asset.providerId} | BASE ${selected.score.total} | HISTORY -${selected.historicalPenalty} | FINAL ${selected.finalScore}`,
    );

    console.log(
      `ALT: ${asset.altText ?? ""}`,
    );

    console.log(
      `SEMANTIC HITS: ${selected.score.semanticHits.join(
        ", ",
      )}`,
    );

    console.log(
      `LOCALIZATION: ${selected.score.localizationHits.join(
        ", ",
      )}`,
    );

    if (
      selected
        .historicalPenalty >
      0
    ) {
      console.log(
        `PREVIOUSLY USED: ${selected.previousProduction ?? "UNKNOWN"} | USE COUNT ${selected.historicalUseCount}`,
      );
    }

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

    registerHistoricalUse(
      visualMemory,
      asset,
    );

    resolved.push({
      ...base,

      status:
        "resolved",

      query:
        selected.query,

      directorSelection: {
        candidateCount:
          ranked.length,

        baseScore:
          selected.score.total,

        historicalPenalty:
          selected.historicalPenalty,

        finalScore:
          selected.finalScore,

        previousUseCount:
          selected.historicalUseCount,

        previousProduction:
          selected.previousProduction,

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
                  candidate
                    .asset
                    .providerId,

                baseScore:
                  candidate
                    .score
                    .total,

                historicalPenalty:
                  candidate
                    .historicalPenalty,

                finalScore:
                  candidate
                    .finalScore,

                alt:
                  candidate
                    .asset
                    .altText ??
                  "",

                query:
                  candidate.query,

                semanticHits:
                  candidate
                    .score
                    .semanticHits,

                localizationHits:
                  candidate
                    .score
                    .localizationHits,
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
            item.asset
              .providerId,
        ),
    ).size;

  const manifest = {
    productionCode,

    version:
      "V3.15-B2-VISUAL-MEMORY",

    generatedAt:
      new Date().toISOString(),

    totalScenes:
      scenes.length,

    resolvedCount,

    uniqueCount,

    duplicateAssets:
      resolvedCount -
      uniqueCount,

    historicalMemory: {
      loadedAssets:
        visualMemory.assets
          .length,

      memoryPath:
        "data/visual-memory.json",
    },

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

  /*
   * Guardamos la memoria después de
   * completar satisfactoriamente la
   * resolución de assets.
   */
  saveVisualMemory(
    visualMemory,
  );

  console.log(
    "\n=== V3.15-B2 VISUAL MEMORY DIRECTOR ===",
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

  console.log(
    `Historical memory assets: ${visualMemory.assets.length}`,
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
    console.error(
      error,
    );

    process.exit(1);
  },
);
