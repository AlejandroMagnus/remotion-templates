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
  process.env.PRODUCTION_CODE ?? "video-juridico-001";

/*
 * V3.15-B3.1
 *
 * SUPABASE_URL puede recibirse en cualquiera de estas formas:
 *
 * https://xxxxx.supabase.co
 * https://xxxxx.supabase.co/
 * https://xxxxx.supabase.co/rest/v1
 * https://xxxxx.supabase.co/rest/v1/
 *
 * normalizeSupabaseRestUrl() garantiza que internamente
 * siempre tengamos exactamente UNA ruta /rest/v1.
 */
function normalizeSupabaseRestUrl(
  rawUrl: string | undefined,
): string | null {
  if (!rawUrl) {
    return null;
  }

  let url = rawUrl.trim().replace(/\/+$/, "");

  if (url.endsWith("/rest/v1")) {
    return url;
  }

  return `${url}/rest/v1`;
}

const SUPABASE_REST_URL =
  normalizeSupabaseRestUrl(
    process.env.SUPABASE_URL,
  );

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY;

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

const visualMemoryPath = path.join(
  ROOT,
  "data/visual-memory.json",
);

type VisualMemoryAsset = {
  provider: string;
  providerId: string;
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

type SupabaseMemoryRow = {
  provider: string;
  provider_asset_id: string;
  source_url: string | null;
  creator: string | null;
  production_code: string;
  last_used_at: string;
  use_count: number;
};

const EMPTY_MEMORY: VisualMemory = {
  version: "V3.15-B3.1-SUPABASE",
  assets: [],
};

const usedProviderIds =
  new Set<number>();

const usedSourceUrls =
  new Set<string>();

const creatorUsage =
  new Map<string, number>();

const searchCache =
  new Map<
    string,
    PexelsResolvedAsset[]
  >();

function loadLocalMemory(): VisualMemory {
  if (!fs.existsSync(visualMemoryPath)) {
    return {
      ...EMPTY_MEMORY,
      assets: [],
    };
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(
        visualMemoryPath,
        "utf8",
      ),
    ) as Partial<VisualMemory>;

    return {
      version:
        parsed.version ??
        EMPTY_MEMORY.version,

      assets:
        Array.isArray(parsed.assets)
          ? parsed.assets
          : [],
    };
  } catch (error) {
    console.warn(
      "Local visual memory could not be parsed. Starting empty.",
      error,
    );

    return {
      ...EMPTY_MEMORY,
      assets: [],
    };
  }
}

function saveLocalMemory(
  memory: VisualMemory,
) {
  fs.mkdirSync(
    path.dirname(visualMemoryPath),
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

function supabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_REST_URL &&
      SUPABASE_SECRET_KEY,
  );
}

async function supabaseRequest<T>(
  pathname: string,
  init: RequestInit = {},
): Promise<T> {
  if (
    !SUPABASE_REST_URL ||
    !SUPABASE_SECRET_KEY
  ) {
    throw new Error(
      "Supabase credentials are not configured.",
    );
  }

  const cleanPath =
    pathname.replace(/^\/+/, "");

  const response = await fetch(
    `${SUPABASE_REST_URL}/${cleanPath}`,
    {
      ...init,

      headers: {
        apikey:
          SUPABASE_SECRET_KEY,

        Authorization:
          `Bearer ${SUPABASE_SECRET_KEY}`,

        "Content-Type":
          "application/json",

        ...(init.headers ?? {}),
      },
    },
  );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Supabase ${response.status}: ${body}`,
    );
  }

  if (
    response.status === 204
  ) {
    return undefined as T;
  }

  const text =
    await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

async function loadSupabaseMemory():
  Promise<VisualMemory | null> {
  if (!supabaseConfigured()) {
    console.warn(
      "SUPABASE_URL / SUPABASE_SECRET_KEY unavailable. Using local fallback.",
    );

    return null;
  }

  try {
    const rows =
      await supabaseRequest<
        SupabaseMemoryRow[]
      >(
        "audiovisual_visual_memory" +
          "?select=provider,provider_asset_id,source_url,creator,production_code,last_used_at,use_count",
      );

    return {
      version:
        "V3.15-B3.1-SUPABASE",

      assets:
        rows.map((row) => ({
          provider:
            row.provider,

          providerId:
            row.provider_asset_id,

          sourceUrl:
            row.source_url ?? "",

          creator:
            row.creator ?? "",

          lastProductionCode:
            row.production_code,

          lastUsedAt:
            row.last_used_at,

          useCount:
            row.use_count,
        })),
    };
  } catch (error) {
    console.warn(
      "Supabase memory unavailable. Using local fallback.",
      error,
    );

    return null;
  }
}

function mergeMemories(
  primary: VisualMemory | null,
  fallback: VisualMemory,
): VisualMemory {
  if (!primary) {
    return fallback;
  }

  const merged =
    new Map<
      string,
      VisualMemoryAsset
    >();

  for (
    const item of fallback.assets
  ) {
    merged.set(
      `${item.provider}:${item.providerId}`,
      item,
    );
  }

  for (
    const item of primary.assets
  ) {
    merged.set(
      `${item.provider}:${item.providerId}`,
      item,
    );
  }

  return {
    version:
      "V3.15-B3.1-SUPABASE",

    assets:
      [...merged.values()],
  };
}

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

function findHistoricalAsset(
  asset: PexelsResolvedAsset,
  memory: VisualMemory,
):
  | VisualMemoryAsset
  | undefined {
  return memory.assets.find(
    (item) =>
      (
        item.provider ===
          "pexels" &&
        item.providerId ===
          String(
            asset.providerId,
          )
      ) ||
      (
        Boolean(
          item.sourceUrl,
        ) &&
        item.sourceUrl ===
          asset.sourceUrl
      ),
  );
}

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
    findHistoricalAsset(
      asset,
      memory,
    );

  if (!previous) {
    return {
      penalty: 0,
      previousUseCount: 0,
      previousProduction:
        null,
    };
  }

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

function registerLocalHistoricalUse(
  memory: VisualMemory,
  asset: PexelsResolvedAsset,
) {
  const now =
    new Date().toISOString();

  const existing =
    findHistoricalAsset(
      asset,
      memory,
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
      String(
        asset.providerId,
      ),

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

async function registerSupabaseHistoricalUse(
  asset: PexelsResolvedAsset,
) {
  if (!supabaseConfigured()) {
    return;
  }

  const providerId =
    String(
      asset.providerId,
    );

  const query =
    "audiovisual_visual_memory" +
    "?provider=eq.pexels" +
    `&provider_asset_id=eq.${encodeURIComponent(
      providerId,
    )}` +
    "&select=use_count";

  const existing =
    await supabaseRequest<
      Array<{
        use_count: number;
      }>
    >(query);

  const now =
    new Date().toISOString();

  if (
    existing.length > 0
  ) {
    await supabaseRequest<void>(
      "audiovisual_visual_memory" +
        "?provider=eq.pexels" +
        `&provider_asset_id=eq.${encodeURIComponent(
          providerId,
        )}`,
      {
        method: "PATCH",

        headers: {
          Prefer:
            "return=minimal",
        },

        body:
          JSON.stringify({
            source_url:
              asset.sourceUrl,

            creator:
              asset.creator,

            production_code:
              productionCode,

            last_used_at:
              now,

            use_count:
              existing[0]
                .use_count + 1,
          }),
      },
    );

    return;
  }

  await supabaseRequest<void>(
    "audiovisual_visual_memory",
    {
      method: "POST",

      headers: {
        Prefer:
          "return=minimal",
      },

      body:
        JSON.stringify({
          provider:
            "pexels",

          provider_asset_id:
            providerId,

          source_url:
            asset.sourceUrl,

          creator:
            asset.creator,

          production_code:
            productionCode,

          first_used_at:
            now,

          last_used_at:
            now,

          use_count: 1,

          metadata: {},
        }),
    },
  );
}

async function main() {
  if (
    !fs.existsSync(planPath)
  ) {
    throw new Error(
      `Missing asset scene plan: ${planPath}`,
    );
  }

  const localMemory =
    loadLocalMemory();

  const remoteMemory =
    await loadSupabaseMemory();

  const visualMemory =
    mergeMemories(
      remoteMemory,
      localMemory,
    );

  console.log(
    "\n=== VISUAL MEMORY V3.15-B3.1 / SUPABASE ===",
  );

  console.log(
    `Supabase configured: ${
      supabaseConfigured()
        ? "YES"
        : "NO"
    }`,
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

  const resolved: any[] =
    [];

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

      score:
        ReturnType<
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
      `\n[DIRECTOR ${
        sceneIndex + 1
      }/${scenes.length}] ${
        scene.ruleId
      }`,
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
      `SELECTED: ${
        asset.providerId
      } | BASE ${
        selected.score.total
      } | HISTORY -${
        selected.historicalPenalty
      } | FINAL ${
        selected.finalScore
      }`,
    );

    console.log(
      `ALT: ${
        asset.altText ?? ""
      }`,
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
        `PREVIOUSLY USED: ${
          selected.previousProduction ??
          "UNKNOWN"
        } | USE COUNT ${
          selected.historicalUseCount
        }`,
      );
    }

    const filename =
      `${String(
        sceneIndex + 1,
      ).padStart(
        2,
        "0",
      )}` +
      `-${scene.ruleId}-${asset.providerId}.jpg`;

    const target =
      path.join(
        outputDir,
        filename,
      );

    await download(
      asset.remoteUrl,
      target,
    );

    registerLocalHistoricalUse(
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

  const resolvedAssets =
    resolved.filter(
      (item) =>
        item.status ===
        "resolved",
    );

  const resolvedCount =
    resolvedAssets.length;

  const uniqueCount =
    new Set(
      resolvedAssets.map(
        (item) =>
          item.asset
            .providerId,
      ),
    ).size;

  const manifest = {
    productionCode,

    version:
      "V3.15-B3.1-SUPABASE-VISUAL-MEMORY",

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
      backend:
        remoteMemory
          ? "SUPABASE+LOCAL"
          : "LOCAL-FALLBACK",

      loadedAssets:
        visualMemory.assets
          .length,

      table:
        "audiovisual_visual_memory",
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

  saveLocalMemory(
    visualMemory,
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

  /*
   * Persistimos solo después de resolver
   * y validar completamente los assets.
   */
  if (
    supabaseConfigured()
  ) {
    console.log(
      "\nPersisting visual memory to Supabase...",
    );

    for (
      const item of
        resolvedAssets
    ) {
      await registerSupabaseHistoricalUse(
        item.asset as PexelsResolvedAsset,
      );
    }

    console.log(
      `Supabase memory updated: ${resolvedCount} assets`,
    );
  }
    console.log(
    "\n=== V3.15-B3.1 VISUAL MEMORY DIRECTOR ===",
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
    `Memory backend: ${
      remoteMemory
        ? "SUPABASE + LOCAL FALLBACK"
        : "LOCAL FALLBACK"
    }`,
  );
}

main().catch(
  (error) => {
    console.error(
      error,
    );

    process.exit(1);
  },
);
