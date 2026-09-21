import fs from "node:fs";
import path from "node:path";

import {
  type PexelsResolvedAsset,
  searchPexelsPhotos,
  searchPexelsVideo,
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

/*
 * V3.15-D
 * MULTIMODAL VISUAL DIRECTOR
 *
 * Conserva:
 * - ranking semántico fotográfico
 * - localización
 * - diversidad
 * - memoria histórica
 * - Supabase
 * - fallback local
 *
 * Añade:
 * - decisión IMAGE / VIDEO
 * - búsqueda de video Pexels
 * - fallback automático VIDEO -> IMAGE
 * - manifest multimodal
 */

function normalizeSupabaseRestUrl(
  rawUrl: string | undefined,
): string | null {
  if (!rawUrl) {
    return null;
  }

  const url =
    rawUrl
      .trim()
      .replace(/\/+$/, "");

  if (
    url.endsWith(
      "/rest/v1",
    )
  ) {
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

const planPath =
  path.join(
    ROOT,
    `public/generated/${productionCode}-asset-scene-plan.json`,
  );

const outputDir =
  path.join(
    ROOT,
    "public/generated/assets",
  );

const manifestPath =
  path.join(
    ROOT,
    `public/generated/${productionCode}-resolved-assets.json`,
  );

const visualMemoryPath =
  path.join(
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

type DirectorMediaDecision = {
  preferredMediaType:
    | "image"
    | "video";

  reason: string;

  motionScore: number;
  stillScore: number;
};

type SceneWithTiming =
  DirectorScene & {
    id: string;
    startMs: number;
    endMs: number;
    durationMs: number;
    route: string;
    ruleId: string;
    concept?: string;
    narrationContext?: string;
  };

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

const EMPTY_MEMORY:
  VisualMemory = {
    version:
      "V3.15-D-MULTIMODAL",
    assets: [],
  };

const usedProviderKeys =
  new Set<string>();

const usedSourceUrls =
  new Set<string>();

const creatorUsage =
  new Map<
    string,
    number
  >();

const photoSearchCache =
  new Map<
    string,
    PexelsResolvedAsset[]
  >();

const videoSearchCache =
  new Map<
    string,
    PexelsResolvedAsset | null
  >();

function providerKey(
  asset: PexelsResolvedAsset,
): string {
  /*
   * Una foto y un video de Pexels
   * pueden compartir espacio numérico
   * de IDs. El mediaType forma parte
   * de la clave de ejecución.
   */
  return [
    asset.provider,
    asset.mediaType,
    asset.providerId,
  ].join(":");
}

function loadLocalMemory():
  VisualMemory {
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
        EMPTY_MEMORY.version,

      assets:
        Array.isArray(
          parsed.assets,
        )
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

function supabaseConfigured():
  boolean {
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
    pathname.replace(
      /^\/+/,
      "",
    );

  const response =
    await fetch(
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

  return JSON.parse(
    text,
  ) as T;
}

async function loadSupabaseMemory():
  Promise<VisualMemory | null> {
  if (
    !supabaseConfigured()
  ) {
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
        "V3.15-D-MULTIMODAL",

      assets:
        rows.map(
          (row) => ({
            provider:
              row.provider,

            providerId:
              row.provider_asset_id,

            sourceUrl:
              row.source_url ??
              "",

            creator:
              row.creator ??
              "",

            lastProductionCode:
              row.production_code,

            lastUsedAt:
              row.last_used_at,

            useCount:
              row.use_count,
          }),
        ),
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
  primary:
    VisualMemory | null,
  fallback:
    VisualMemory,
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
    const item
    of fallback.assets
  ) {
    merged.set(
      `${item.provider}:${item.providerId}`,
      item,
    );
  }

  for (
    const item
    of primary.assets
  ) {
    merged.set(
      `${item.provider}:${item.providerId}`,
      item,
    );
  }

  return {
    version:
      "V3.15-D-MULTIMODAL",

    assets:
      [...merged.values()],
  };
}

async function cachedPhotoSearch(
  query: string,
): Promise<
  PexelsResolvedAsset[]
> {
  const cached =
    photoSearchCache.get(
      query,
    );

  if (cached) {
    return cached;
  }

  const result =
    await searchPexelsPhotos(
      query,
      30,
    );

  photoSearchCache.set(
    query,
    result,
  );

  return result;
}

async function cachedVideoSearch(
  query: string,
  requiredDurationMs: number,
): Promise<
  PexelsResolvedAsset | null
> {
  /*
   * La duración forma parte
   * de la clave porque una escena
   * más larga puede invalidar un
   * clip que sí servía para otra.
   */
  const cacheKey =
    `${query}::${requiredDurationMs}`;

  if (
    videoSearchCache.has(
      cacheKey,
    )
  ) {
    return (
      videoSearchCache.get(
        cacheKey,
      ) ?? null
    );
  }

  const result =
    await searchPexelsVideo(
      query,
      requiredDurationMs,
    );

  videoSearchCache.set(
    cacheKey,
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
  asset:
    PexelsResolvedAsset,
  memory:
    VisualMemory,
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
  asset:
    PexelsResolvedAsset,
  memory:
    VisualMemory,
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
  memory:
    VisualMemory,
  asset:
    PexelsResolvedAsset,
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
    provider:
      "pexels",

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

    useCount:
      1,
  });
}

async function registerSupabaseHistoricalUse(
  asset:
    PexelsResolvedAsset,
) {
  if (
    !supabaseConfigured()
  ) {
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
        method:
          "PATCH",

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
                .use_count +
              1,

            metadata: {
              mediaType:
                asset.mediaType,
            },
          }),
      },
    );

    return;
  }

  await supabaseRequest<void>(
    "audiovisual_visual_memory",
    {
      method:
        "POST",

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

          use_count:
            1,

          metadata: {
            mediaType:
              asset.mediaType,
          },
        }),
    },
  );
}

function decideMediaType(
  scene:
    SceneWithTiming,
): DirectorMediaDecision {
  const semanticText =
    [
      scene.ruleId,
      scene.concept ?? "",
      scene.narrationContext ??
        "",
    ]
      .join(" ")
      .toLowerCase();

  /*
   * Señales donde movimiento humano,
   * empresarial o contextual suele
   * comunicar mejor que una imagen fija.
   */
  const motionSignals = [
    "decision",
    "decisión",
    "decidir",
    "negotiation",
    "negociación",
    "negociar",
    "meeting",
    "reunion",
    "reunión",
    "business",
    "empresa",
    "empresarial",
    "operation",
    "operación",
    "conflict",
    "conflicto",
    "discussion",
    "discusión",
    "action",
    "acción",
    "execution",
    "ejecución",
    "counterparty",
    "contraparte",
    "risk",
    "riesgo",
    "patrimonio",
    "assets",
    "activos",
    "communication",
    "comunicación",
    "conversation",
    "conversación",
  ];

  /*
   * Señales donde un plano fijo,
   * documento o composición 2.5D
   * suele resultar más preciso.
   */
  const stillSignals = [
    "document",
    "documento",
    "contract",
    "contrato",
    "evidence",
    "prueba",
    "legal text",
    "texto legal",
    "norma",
    "law",
    "ley",
    "signature",
    "firma",
    "authority",
    "autoridad",
    "jurisprudencia",
    "expediente",
    "cta",
    "closing",
    "cierre",
  ];

  const motionScore =
    motionSignals.filter(
      (signal) =>
        semanticText.includes(
          signal,
        ),
    ).length;

  const stillScore =
    stillSignals.filter(
      (signal) =>
        semanticText.includes(
          signal,
        ),
    ).length;

  if (
    scene.durationMs >=
      2500 &&
    motionScore >
      stillScore
  ) {
    return {
      preferredMediaType:
        "video",

      reason:
        `semantic-motion advantage: ${motionScore} vs ${stillScore}`,

      motionScore,
      stillScore,
    };
  }

  return {
    preferredMediaType:
      "image",

    reason:
      `semantic-still/default: ${motionScore} vs ${stillScore}`,

    motionScore,
    stillScore,
  };
}

async function findVideoCandidate(
  scene:
    SceneWithTiming,
  queries:
    string[],
  memory:
    VisualMemory,
): Promise<{
  asset:
    PexelsResolvedAsset;
  query:
    string;
  historicalPenalty:
    number;
  historicalUseCount:
    number;
  previousProduction:
    string | null;
} | null> {
  for (
    const query
    of queries
  ) {
    try {
      const candidate =
        await cachedVideoSearch(
          query,
          scene.durationMs,
        );

      if (!candidate) {
        continue;
      }

      if (
        usedProviderKeys.has(
          providerKey(
            candidate,
          ),
        ) ||
        usedSourceUrls.has(
          candidate.sourceUrl,
        )
      ) {
        continue;
      }

      const history =
        historicalPenalty(
          candidate,
          memory,
        );

      /*
       * En V3.15-D evitamos
       * preferentemente clips
       * históricamente muy usados.
       * Si la penalización es alta,
       * probamos la siguiente query.
       */
      if (
        history.penalty >= 56
      ) {
        continue;
      }

      return {
        asset:
          candidate,

        query,

        historicalPenalty:
          history.penalty,

        historicalUseCount:
          history.previousUseCount,

        previousProduction:
          history.previousProduction,
      };
    } catch (error) {
      console.warn(
        `VIDEO SEARCH FAILED: ${query}`,
        error,
      );
    }
  }

  return null;
}

async function main() {
  if (
    !fs.existsSync(
      planPath,
    )
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
    "\n=== VISUAL MEMORY V3.15-D / MULTIMODAL ===",
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
    source.scenes ??
    [];

  const resolved:
    any[] = [];

  for (
    let sceneIndex = 0;
    sceneIndex <
      scenes.length;
    sceneIndex++
  ) {
    const scene =
      scenes[
        sceneIndex
      ] as SceneWithTiming;

    const queries =
      semanticQueries(
        scene,
        sceneIndex,
      );

    const mediaDecision =
      decideMediaType(
        scene,
      );

    console.log(
      `\n[DIRECTOR ${
        sceneIndex + 1
      }/${scenes.length}] ${
        scene.ruleId
      }`,
    );

    console.log(
      `MEDIA DIRECTOR: ${mediaDecision.preferredMediaType.toUpperCase()}`,
    );

    console.log(
      `MEDIA REASON: ${mediaDecision.reason}`,
    );

    console.log(
      `Queries: ${queries.length}`,
    );

    /*
     * El ranking fotográfico se conserva
     * completo aunque la preferencia sea
     * video. Así siempre existe un fallback
     * visual de alta calidad.
     */
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
        await cachedPhotoSearch(
          query,
        );

      candidates.forEach(
        (
          asset,
          searchPosition,
        ) => {
          if (
            usedProviderKeys.has(
              providerKey(
                asset,
              ),
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

    const rankedPhotos =
      [
        ...candidateMap.values(),
      ].sort(
        (a, b) =>
          b.finalScore -
          a.finalScore,
      );

    const selectedPhoto =
      rankedPhotos[0] ??
      null;

    console.log(
      `Photo candidates: ${rankedPhotos.length}`,
    );

    let selectedVideo:
      Awaited<
        ReturnType<
          typeof findVideoCandidate
        >
      > = null;

    if (
      mediaDecision
        .preferredMediaType ===
      "video"
    ) {
      selectedVideo =
        await findVideoCandidate(
          scene,
          queries,
          visualMemory,
        );
    }

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

    if (
      !selectedVideo &&
      !selectedPhoto
    ) {
      console.log(
        "UNRESOLVED",
      );

      resolved.push({
        ...base,

        status:
          "unresolved",

        mediaDecision: {
          ...mediaDecision,

          resolvedAs:
            null,

          fallbackToImage:
            false,
        },
      });

      continue;
    }

    const usingVideo =
      Boolean(
        selectedVideo,
      );

    const asset =
      selectedVideo
        ? selectedVideo.asset
        : selectedPhoto!.asset;

    const selectedQuery =
      selectedVideo
        ? selectedVideo.query
        : selectedPhoto!.query;

    const selectedHistoryPenalty =
      selectedVideo
        ? selectedVideo
            .historicalPenalty
        : selectedPhoto!
            .historicalPenalty;

    const selectedHistoryUseCount =
      selectedVideo
        ? selectedVideo
            .historicalUseCount
        : selectedPhoto!
            .historicalUseCount;

    const selectedPreviousProduction =
      selectedVideo
        ? selectedVideo
            .previousProduction
        : selectedPhoto!
            .previousProduction;

    usedProviderKeys.add(
      providerKey(
        asset,
      ),
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
      `RESOLVED AS: ${asset.mediaType.toUpperCase()}`,
    );

    console.log(
      `SELECTED: ${asset.providerId}`,
    );

    console.log(
      `QUERY: ${selectedQuery}`,
    );

    if (usingVideo) {
      console.log(
        `VIDEO DURATION: ${asset.durationMs ?? 0} ms`,
      );

      console.log(
        `HISTORY PENALTY: -${selectedHistoryPenalty}`,
      );
    } else {
      console.log(
        `BASE SCORE: ${selectedPhoto!.score.total}`,
      );

      console.log(
        `HISTORY: -${selectedPhoto!.historicalPenalty}`,
      );

      console.log(
        `FINAL: ${selectedPhoto!.finalScore}`,
      );

      console.log(
        `ALT: ${asset.altText ?? ""}`,
      );

      console.log(
        `SEMANTIC HITS: ${selectedPhoto!.score.semanticHits.join(
          ", ",
        )}`,
      );

      console.log(
        `LOCALIZATION: ${selectedPhoto!.score.localizationHits.join(
          ", ",
        )}`,
      );
    }

    if (
      selectedHistoryPenalty >
      0
    ) {
      console.log(
        `PREVIOUSLY USED: ${
          selectedPreviousProduction ??
          "UNKNOWN"
        } | USE COUNT ${
          selectedHistoryUseCount
        }`,
      );
    }

    const extension =
      asset.mediaType ===
      "video"
        ? "mp4"
        : "jpg";

    const filename =
      `${String(
        sceneIndex + 1,
      ).padStart(
        2,
        "0",
      )}` +
      `-${scene.ruleId}-${asset.providerId}.${extension}`;

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

    const photoDirectorSelection =
      selectedPhoto
        ? {
            candidateCount:
              rankedPhotos.length,

            baseScore:
              selectedPhoto
                .score
                .total,

            historicalPenalty:
              selectedPhoto
                .historicalPenalty,

            finalScore:
              selectedPhoto
                .finalScore,

            previousUseCount:
              selectedPhoto
                .historicalUseCount,

            previousProduction:
              selectedPhoto
                .previousProduction,

            scoreBreakdown:
              selectedPhoto
                .score,

            selectedAlt:
              selectedPhoto
                .asset
                .altText ??
              "",

            topCandidates:
              rankedPhotos
                .slice(
                  0,
                  5,
                )
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

                    mediaType:
                      candidate
                        .asset
                        .mediaType,

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
          }
        : null;

    const videoDirectorSelection =
      selectedVideo
        ? {
            providerId:
              selectedVideo
                .asset
                .providerId,

            mediaType:
              "video",

            query:
              selectedVideo
                .query,

            durationMs:
              selectedVideo
                .asset
                .durationMs ??
              0,

            historicalPenalty:
              selectedVideo
                .historicalPenalty,

            previousUseCount:
              selectedVideo
                .historicalUseCount,

            previousProduction:
              selectedVideo
                .previousProduction,
          }
        : null;

    resolved.push({
      ...base,

      status:
        "resolved",

      query:
        selectedQuery,

      mediaDecision: {
        preferred:
          mediaDecision
            .preferredMediaType,

        resolvedAs:
          asset.mediaType,

        reason:
          mediaDecision.reason,

        motionScore:
          mediaDecision.motionScore,

        stillScore:
          mediaDecision.stillScore,

        fallbackToImage:
          mediaDecision
            .preferredMediaType ===
            "video" &&
          asset.mediaType ===
            "image",
      },

      directorSelection: {
        mode:
          usingVideo
            ? "STOCK-VIDEO"
            : "PHOTO-2.5D",

        selectedMediaType:
          asset.mediaType,

        selectedQuery,

        historicalPenalty:
          selectedHistoryPenalty,

        previousUseCount:
          selectedHistoryUseCount,

        previousProduction:
          selectedPreviousProduction,

        photo:
          photoDirectorSelection,

        video:
          videoDirectorSelection,
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
          [
            item.asset
              .provider,
            item.asset
              .mediaType,
            item.asset
              .providerId,
          ].join(":"),
      ),
    ).size;

  const imageCount =
    resolvedAssets.filter(
      (item) =>
        item.asset
          .mediaType ===
        "image",
    ).length;

  const videoCount =
    resolvedAssets.filter(
      (item) =>
        item.asset
          .mediaType ===
        "video",
    ).length;

  const requestedVideoCount =
    resolvedAssets.filter(
      (item) =>
        item.mediaDecision
          ?.preferred ===
        "video",
    ).length;

  const videoFallbackCount =
    resolvedAssets.filter(
      (item) =>
        item.mediaDecision
          ?.fallbackToImage ===
        true,
    ).length;

  const manifest = {
    productionCode,

    version:
      "V3.15-D-MULTIMODAL-VISUAL-DIRECTOR",

    generatedAt:
      new Date().toISOString(),

    totalScenes:
      scenes.length,

    resolvedCount,

    uniqueCount,

    duplicateAssets:
      resolvedCount -
      uniqueCount,

    mediaSummary: {
      images:
        imageCount,

      videos:
        videoCount,

      videoPreferred:
        requestedVideoCount,

      videoFallbacks:
        videoFallbackCount,
    },

    historicalMemory: {
      backend:
        remoteMemory
          ? "SUPABASE+LOCAL"
          : "LOCAL-FALLBACK",

      loadedAssets:
        visualMemory
          .assets
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
   * La memoria remota se actualiza
   * únicamente cuando toda la resolución
   * multimodal terminó correctamente.
   */
  if (
    supabaseConfigured()
  ) {
    console.log(
      "\nPersisting visual memory to Supabase...",
    );

    for (
      const item
      of resolvedAssets
    ) {
      await registerSupabaseHistoricalUse(
        item.asset as
          PexelsResolvedAsset,
      );
    }

    console.log(
      `Supabase memory updated: ${resolvedCount} assets`,
    );
  }

  console.log(
    "\n=== V3.15-D MULTIMODAL VISUAL DIRECTOR ===",
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
    `Images 2.5D: ${imageCount}`,
  );

  console.log(
    `Stock videos: ${videoCount}`,
  );

  console.log(
    `Video preferred: ${requestedVideoCount}`,
  );

  console.log(
    `Video -> image fallbacks: ${videoFallbackCount}`,
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

  console.log(
    "==============================================",
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
