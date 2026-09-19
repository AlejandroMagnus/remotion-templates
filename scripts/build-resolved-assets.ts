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

/* =========================================================
   CONFIGURATION
   ========================================================= */

const ROOT = process.cwd();

const productionCode =
  process.env.PRODUCTION_CODE ??
  "video-juridico-001";

/**
 * V3.14.2 — RESOLVER RHYTHM SAFETY
 *
 * Este NO es el ritmo artístico del Director.
 *
 * Es la última barrera de seguridad antes de seleccionar
 * físicamente los assets.
 *
 * Si por cualquier razón una escena upstream llega con
 * 20, 30 o más segundos, el resolver la subdivide para
 * obligar a producir varios recursos visuales.
 */
const MAX_RESOLVED_STATIC_SCENE_MS = 6000;

/* =========================================================
   PATHS
   ========================================================= */

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

/* =========================================================
   DIVERSITY MEMORY
   ========================================================= */

/**
 * Impiden reutilizar el mismo recurso durante una producción.
 */
const usedProviderIds =
  new Set<number>();

const usedSourceUrls =
  new Set<string>();

const creatorUsage =
  new Map<string, number>();

/**
 * Evita repetir llamadas innecesarias a Pexels cuando
 * diferentes escenas generan la misma consulta.
 */
const searchCache =
  new Map<
    string,
    PexelsResolvedAsset[]
  >();

/* =========================================================
   SEARCH CACHE
   ========================================================= */

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

/* =========================================================
   DOWNLOAD
   ========================================================= */

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

/* =========================================================
   RHYTHM NORMALIZATION
   ========================================================= */

/**
 * Divide únicamente escenas anormalmente largas.
 *
 * Una escena correcta del Director permanece intacta.
 *
 * Una escena de 30 segundos, por ejemplo, se convierte
 * aproximadamente en cinco escenas de 6 segundos.
 *
 * Cada fragmento obtiene ID independiente y posteriormente
 * vuelve a atravesar:
 *
 * búsqueda semántica
 * → candidatos
 * → ranking
 * → diversidad
 * → selección
 * → descarga
 *
 * Por tanto, no estamos simplemente cortando una misma
 * fotografía: estamos solicitando nuevos assets.
 */
function normalizeVisualRhythm(
  sourceScenes: any[],
) {
  return sourceScenes.flatMap(
    (scene: any) => {
      const startMs =
        Number(scene.startMs) || 0;

      const endMs =
        Number(scene.endMs) ||
        startMs;

      const durationMs =
        Math.max(
          0,
          endMs - startMs,
        );

      /**
       * Escena normal:
       * respetamos íntegramente la decisión upstream.
       */
      if (
        durationMs <=
        MAX_RESOLVED_STATIC_SCENE_MS
      ) {
        return [
          {
            ...scene,

            startMs,
            endMs,
            durationMs,
          },
        ];
      }

      /**
       * Escena anormalmente larga:
       * determinamos cuántos planos físicos necesitamos.
       */
      const fragmentCount =
        Math.max(
          2,
          Math.ceil(
            durationMs /
              MAX_RESOLVED_STATIC_SCENE_MS,
          ),
        );

      const fragmentDuration =
        durationMs /
        fragmentCount;

      return Array.from(
        {
          length:
            fragmentCount,
        },

        (_, fragmentIndex) => {
          const fragmentStartMs =
            Math.round(
              startMs +
                fragmentDuration *
                  fragmentIndex,
            );

          const fragmentEndMs =
            fragmentIndex ===
            fragmentCount - 1
              ? endMs
              : Math.round(
                  startMs +
                    fragmentDuration *
                      (fragmentIndex +
                        1),
                );

          return {
            ...scene,

            /**
             * ID físicamente independiente.
             */
            id:
              `${scene.id}-visual-${
                fragmentIndex + 1
              }`,

            startMs:
              fragmentStartMs,

            endMs:
              fragmentEndMs,

            durationMs:
              fragmentEndMs -
              fragmentStartMs,

            /**
             * Conservamos el contexto narrativo.
             *
             * Así cada nuevo plano continúa representando
             * la misma unidad semántica general, pero debe
             * obtener un asset diferente.
             */
            narrationContext:
              scene.narrationContext,

            rhythmFragment: {
              sourceSceneId:
                scene.id,

              fragment:
                fragmentIndex + 1,

              fragments:
                fragmentCount,

              forcedVisualChange:
                true,
            },
          };
        },
      );
    },
  );
}

/* =========================================================
   MAIN
   ========================================================= */

async function main() {
  /* -------------------------------------------------------
     INPUT GUARD
     ------------------------------------------------------- */

  if (!fs.existsSync(planPath)) {
    throw new Error(
      `Missing asset scene plan: ${planPath}`,
    );
  }

  /* -------------------------------------------------------
     CLEAN OUTPUT
     ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     LOAD SCENE PLAN
     ------------------------------------------------------- */

  const source =
    JSON.parse(
      fs.readFileSync(
        planPath,
        "utf8",
      ),
    );

  const sourceScenes =
    Array.isArray(
      source?.scenes,
    )
      ? source.scenes
      : [];

  if (
    sourceScenes.length === 0
  ) {
    throw new Error(
      `Asset scene plan contains no scenes: ${planPath}`,
    );
  }

  /* -------------------------------------------------------
     DIRECTOR RHYTHM SAFETY
     ------------------------------------------------------- */

  const scenes =
    normalizeVisualRhythm(
      sourceScenes,
    );

  console.log("");
  console.log(
    "==========================================",
  );

  console.log(
    "🎬 V3.14.2 RESOLVER RHYTHM DIRECTOR",
  );

  console.log(
    "==========================================",
  );

  console.log(
    `Production: ${productionCode}`,
  );

  console.log(
    `Source scenes: ${sourceScenes.length}`,
  );

  console.log(
    `Resolver scenes: ${scenes.length}`,
  );

  console.log(
    `Maximum static scene: ${MAX_RESOLVED_STATIC_SCENE_MS} ms`,
  );

  /* -------------------------------------------------------
     HARD RHYTHM QA
     ------------------------------------------------------- */

  const invalidScene =
    scenes.find(
      (scene: any) =>
        Number(scene.endMs) -
          Number(scene.startMs) >
        MAX_RESOLVED_STATIC_SCENE_MS +
          10,
    );

  if (invalidScene) {
    throw new Error(
      `Rhythm normalization failed for scene: ${
        invalidScene.id ??
        "unknown"
      }`,
    );
  }

  /* -------------------------------------------------------
     RESOLUTION
     ------------------------------------------------------- */

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

        ruleId: string;

        concept?: string;

        narrationContext?: string;
      };

    /* -----------------------------------------------------
       SEMANTIC QUERIES
       ----------------------------------------------------- */

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
    };

    const candidateMap =
      new Map<
        number,
        RankedCandidate
      >();

    /* -----------------------------------------------------
       SEARCH + RANKING
       ----------------------------------------------------- */

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
          /**
           * Diversidad obligatoria:
           * no reutilizamos el mismo asset.
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
      [
        ...candidateMap.values(),
      ].sort(
        (a, b) =>
          b.score.total -
          a.score.total,
      );

    const selected =
      ranked[0];

    /* -----------------------------------------------------
       MANIFEST BASE
       ----------------------------------------------------- */

    const base = {
      id: scene.id,

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

      rhythmFragment:
        (scene as any)
          .rhythmFragment,
    };

    console.log("");

    console.log(
      `[DIRECTOR ${
        sceneIndex + 1
      }/${scenes.length}] ${
        scene.ruleId
      }`,
    );

    console.log(
      `Timing: ${scene.startMs} → ${scene.endMs} ms`,
    );

    console.log(
      `Candidates: ${ranked.length}`,
    );

    /* -----------------------------------------------------
       UNRESOLVED
       ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       SELECT
       ----------------------------------------------------- */

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
      `ALT: ${
        asset.altText ?? ""
      }`,
    );

    console.log(
      `SEMANTIC HITS: ${selected.score.semanticHits.join(
        ", ",
      )}`,
    );

    /* -----------------------------------------------------
       UNIQUE FILE
       ----------------------------------------------------- */

    const safeRuleId =
      String(
        scene.ruleId ??
          "scene",
      ).replace(
        /[^a-zA-Z0-9_-]/g,
        "-",
      );

    const filename =
      `${String(
        sceneIndex + 1,
      ).padStart(
        2,
        "0",
      )}-${safeRuleId}-${asset.providerId}.jpg`;

    const target =
      path.join(
        outputDir,
        filename,
      );

    /* -----------------------------------------------------
       DOWNLOAD
       ----------------------------------------------------- */

    await download(
      asset.remoteUrl,
      target,
    );

    /* -----------------------------------------------------
       RESOLVED MANIFEST ITEM
       ----------------------------------------------------- */

    resolved.push({
      ...base,

      status:
        "resolved",

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
          asset.altText ??
          "",

        topCandidates:
          ranked
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

                score:
                  candidate
                    .score
                    .total,

                alt:
                  candidate
                    .asset
                    .altText ??
                  "",

                query:
                  candidate
                    .query,

                semanticHits:
                  candidate
                    .score
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

  /* =======================================================
     FINAL QA
     ======================================================= */

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

  const unresolvedCount =
    resolved.length -
    resolvedCount;

  const duplicateAssets =
    resolvedCount -
    uniqueCount;

  /* -------------------------------------------------------
     MANIFEST
     ------------------------------------------------------- */

  const manifest = {
    productionCode,

    version:
      "V3.14.2-RESOLVER-RHYTHM-DIRECTOR",

    generatedAt:
      new Date().toISOString(),

    sourceScenes:
      sourceScenes.length,

    totalScenes:
      scenes.length,

    resolvedCount,

    unresolvedCount,

    uniqueCount,

    duplicateAssets,

    rhythm: {
      maxResolvedStaticSceneMs:
        MAX_RESOLVED_STATIC_SCENE_MS,

      subdivisionApplied:
        scenes.length >
        sourceScenes.length,
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

  /* =======================================================
     REPORT
     ======================================================= */

  console.log("");
  console.log(
    "==========================================",
  );

  console.log(
    "✅ V3.14.2 RESOLVED ASSET REPORT",
  );

  console.log(
    "==========================================",
  );

  console.log(
    `Source scenes: ${sourceScenes.length}`,
  );

  console.log(
    `Final scenes: ${scenes.length}`,
  );

  console.log(
    `Resolved: ${resolvedCount}`,
  );

  console.log(
    `Unresolved: ${unresolvedCount}`,
  );

  console.log(
    `Unique: ${uniqueCount}`,
  );

  console.log(
    `Duplicates: ${duplicateAssets}`,
  );

  /* =======================================================
     HARD QA
     ======================================================= */

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

  /**
   * No exigimos 100% de resolución porque una búsqueda
   * individual puede legítimamente no producir candidato.
   *
   * Pero dejamos registrado el dato para QA posterior.
   */
  console.log("");
  console.log(
    `✅ Manifest: ${manifestPath}`,
  );

  console.log(
    "✅ V3.14.2 RESOLVER COMPLETED",
  );
}

/* =========================================================
   EXECUTION
   ========================================================= */

main().catch(
  (error) => {
    console.error(
      error,
    );

    process.exit(1);
  },
);
