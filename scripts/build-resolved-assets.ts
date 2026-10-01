import fs from "node:fs";
import path from "node:path";
import { VideoSpecSchema } from "../src/schema";
import {
  assertThreeDPlanMatches,
  matchThreeDScene,
} from "../src/threeD/schema";
import { resolveNativeScene } from "../src/threeD/resolver";
import {
  semanticQueries,
  type DirectorScene,
} from "../src/assets/semanticVisualRanker";
import { VisualMemory } from "../src/assets/visualMemory";
import { VisualSelector } from "../src/assets/visualSelector";
import { catalogFile, validateGlb } from "../src/assets/localCatalog";

type CreativeMediaIntent = "photo" | "video" | "graphic" | "threeD-intent";
type SceneWithTiming = DirectorScene & {
  id: string;
  ruleId: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  route: string;
  concept?: string;
  narrationContext?: string;
  mediaIntent?: CreativeMediaIntent;
  mediaMix?: unknown;
  creativeDirection?: {
    visualLanguage?: string | null;
    cameraProfile?: string | null;
    transitionProfile?: string | null;
  };
};
type DirectorMediaDecision = {
  preferredMediaType: "image" | "video";
  reason: string;
  motionScore: number;
  stillScore: number;
  creativeIntent: CreativeMediaIntent | null;
  executionFallback: "none" | "graphic-to-image" | "threeD-to-video" | "legacy";
};
function decideMediaType(scene: SceneWithTiming): DirectorMediaDecision {
  if (scene.mediaIntent === "video") {
    return {
      preferredMediaType: "video",

      reason: "V3.18-F.2 creative-director mediaIntent=video",

      motionScore: 100,

      stillScore: 0,

      creativeIntent: "video",

      executionFallback: "none",
    };
  }

  if (scene.mediaIntent === "photo") {
    return {
      preferredMediaType: "image",

      reason: "V3.18-F.2 creative-director mediaIntent=photo",

      motionScore: 0,

      stillScore: 100,

      creativeIntent: "photo",

      executionFallback: "none",
    };
  }

  /*
   * No existe todavía un ejecutor gráfico
   * independiente en este resolvedor.
   * Conservamos la orden del Director y
   * usamos imagen como fallback explícito.
   */
  if (scene.mediaIntent === "graphic") {
    return {
      preferredMediaType: "image",

      reason:
        "V3.18-F.2 graphic-intent -> image fallback until graphic executor",

      motionScore: 20,

      stillScore: 100,

      creativeIntent: "graphic",

      executionFallback: "graphic-to-image",
    };
  }

  /*
   * Las escenas 3D compatibles se resuelven antes de llegar aquí.
   * Si esta intención no tiene una escena nativa planificada,
   * se conserva el fallback explícito a clip o fotografía.
   */
  if (scene.mediaIntent === "threeD-intent") {
    return {
      preferredMediaType: "video",

      reason:
        "threeD-intent -> video fallback for a scene without a native 3D plan",

      motionScore: 100,

      stillScore: 10,

      creativeIntent: "threeD-intent",

      executionFallback: "threeD-to-video",
    };
  }

  const semanticText = [
    scene.ruleId,
    scene.concept ?? "",
    scene.narrationContext ?? "",
  ]
    .join(" ")
    .toLowerCase();

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

  const motionScore = motionSignals.filter((signal) =>
    semanticText.includes(signal),
  ).length;

  const stillScore = stillSignals.filter((signal) =>
    semanticText.includes(signal),
  ).length;

  if (scene.durationMs >= 2500 && motionScore > stillScore) {
    return {
      preferredMediaType: "video",

      reason: `legacy semantic-motion advantage: ${motionScore} vs ${stillScore}`,

      motionScore,
      stillScore,

      creativeIntent: null,

      executionFallback: "legacy",
    };
  }

  return {
    preferredMediaType: "image",

    reason: `legacy semantic-still/default: ${motionScore} vs ${stillScore}`,

    motionScore,
    stillScore,

    creativeIntent: null,

    executionFallback: "legacy",
  };
}

async function main() {
  const code = process.env.PRODUCTION_CODE ?? "video-juridico-001";
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(code))
    throw new Error("Invalid production code.");
  const root = process.cwd(),
    generated = path.join(root, "public/generated");
  const source = JSON.parse(
    fs.readFileSync(
      path.join(generated, `${code}-asset-scene-plan.json`),
      "utf8",
    ),
  );
  if (
    source.productionCode !== code ||
    !Array.isArray(source.scenes) ||
    !source.scenes.length
  )
    throw new Error(
      "Asset scene plan is missing or belongs to another production.",
    );
  const scenes = source.scenes as SceneWithTiming[];
  const specFile = path.join(root, `examples/${code}.video.json`);
  const spec = fs.existsSync(specFile)
    ? VideoSpecSchema.parse(JSON.parse(fs.readFileSync(specFile, "utf8")))
    : undefined;
  if (spec && spec.id !== code)
    throw new Error("VideoSpec production code mismatch.");
  assertThreeDPlanMatches(spec?.threeD, scenes);
  const outputDir = path.join(generated, code, "assets");
  fs.mkdirSync(outputDir, { recursive: true });
  const memory = await new VisualMemory(code).load();
  const selector = new VisualSelector(memory);
  const resolved: any[] = [];
  console.log(
    "VISUAL LIBRARY V2 | Sources:",
    selector.source.available.join(", ") || "local only",
  );
  for (const [index, scene] of scenes.entries()) {
    if (
      !Number.isFinite(scene.startMs) ||
      !Number.isFinite(scene.endMs) ||
      scene.endMs <= scene.startMs
    )
      throw new Error("Invalid visual scene interval.");
    scene.durationMs = scene.endMs - scene.startMs;
    const native = matchThreeDScene(spec?.threeD, scene);
    if (native) {
      if (native.model) {
        const reference = native.model;
        const entry = selector.catalog.find(
          (a) =>
            a.id === reference.id &&
            a.file === reference.src &&
            a.sha256 === reference.sha256 &&
            a.provider === reference.provider &&
            a.mediaType === "model" &&
            a.review.status === "approved" &&
            a.review.reviewer &&
            a.review.date,
        );
        if (!entry)
          throw new Error(
            "The 3D model is absent or not reviewed in the library.",
          );
        validateGlb(fs.readFileSync(catalogFile(entry)));
        if (
          memory.rejection(
            {
              provider: reference.provider,
              providerId: reference.id,
              mediaType: "model",
              sourceUrl: reference.sourceUrl,
              creator: reference.creator,
              remoteUrl: "",
              width: 0,
              height: 0,
              sha256: reference.sha256,
            },
            true,
          )
        )
          throw new Error("Rebuild the 3D plan: the model was recently used.");
      }
      const item = resolveNativeScene(scene, native, code, index);
      item.asset.localSrc = `generated/${code}/assets/native-three-${index}.json`;
      fs.writeFileSync(
        path.join(root, "public", item.asset.localSrc),
        JSON.stringify(native, null, 2),
      );
      if (native.model)
        memory.register({
          provider: native.model.provider,
          providerId: native.model.id,
          mediaType: "model",
          sourceUrl: native.model.sourceUrl,
          creator: native.model.creator,
          remoteUrl: "",
          width: 0,
          height: 0,
          sha256: native.model.sha256,
        });
      resolved.push(item);
      console.log(`NATIVE 3D: ${scene.id}`);
      continue;
    }
    const decision = decideMediaType(scene);
    const queries = semanticQueries(scene, index);
    let selected = await selector.select(
      scene,
      queries,
      decision.preferredMediaType,
      outputDir,
    );
    if (!selected && decision.preferredMediaType === "video")
      selected = await selector.select(scene, queries, "image", outputDir);
    if (!selected) {
      resolved.push({
        ...scene,
        status: "unresolved",
        reason: "VISUAL_LIBRARY_NEEDS_FRESH_ASSETS",
      });
      continue;
    }
    const { asset, filename, ...selection } = selected;
    const { localPath: _local, remoteUrl: _remote, ...publicAsset } = asset;
    resolved.push({
      ...scene,
      status: "resolved",
      query: selected.query,
      mediaDecision: {
        preferred: decision.preferredMediaType,
        resolvedAs: asset.mediaType,
        creativeIntent: decision.creativeIntent,
        executionFallback: decision.executionFallback,
        fallbackToImage:
          decision.preferredMediaType === "video" &&
          asset.mediaType === "image",
        reason: decision.reason,
        motionScore: decision.motionScore,
        stillScore: decision.stillScore,
      },
      directorSelection: {
        version: "visual-library-2",
        mode: asset.mediaType === "video" ? "STOCK-VIDEO" : "PHOTO-2.5D",
        selectedMediaType: asset.mediaType,
        selectedQuery: selected.query,
        visualLanguage: scene.creativeDirection?.visualLanguage ?? null,
        cameraProfile: scene.creativeDirection?.cameraProfile ?? null,
        transitionProfile: scene.creativeDirection?.transitionProfile ?? null,
        previousUseCount: selection.previousUseCount,
        previousProduction: selection.previousProduction,
        historicalPenalty: 0,
        [asset.mediaType === "video" ? "video" : "photo"]: {
          ...selection,
          scoreBreakdown: selection.score,
          baseScore: selection.score.total,
          selectedAlt: asset.altText,
        },
      },
      asset: {
        ...publicAsset,
        localSrc: `generated/${code}/assets/${filename}`,
      },
    });
    console.log(
      `SELECTED ${scene.id}: ${asset.provider}/${asset.mediaType}/${asset.providerId}`,
    );
  }
  const good = resolved.filter((a) => a.status === "resolved");
  const count = (kind: string) =>
    good.filter((a) => a.asset.mediaType === kind).length;
  const uniqueCount = new Set(
    good.map(
      (a) => `${a.asset.provider}:${a.asset.mediaType}:${a.asset.providerId}`,
    ),
  ).size;
  const manifest = {
    productionCode: code,
    version: "visual-library-2",
    generatedAt: new Date().toISOString(),
    totalScenes: scenes.length,
    resolvedCount: good.length,
    uniqueCount,
    duplicateAssets: good.length - uniqueCount,
    creativeExecution: {
      directorPriority: true,
      legacyFallbackEnabled: true,
      graphicExecutorConnected: false,
      threeDExecutorConnected: true,
      nativeThreeDSceneCount: count("threeD"),
      requestedIntents: Object.fromEntries(
        ["photo", "video", "graphic", "threeD-intent"].map((k) => [
          k === "threeD-intent" ? "threeD" : k,
          scenes.filter((s) => s.mediaIntent === k).length,
        ]),
      ),
    },
    mediaSummary: {
      threeD: count("threeD"),
      images: count("image"),
      videos: count("video"),
      videoPreferred: good.filter((a) => a.mediaDecision.preferred === "video")
        .length,
      videoFallbacks: good.filter((a) => a.mediaDecision.fallbackToImage)
        .length,
    },
    historicalMemory: {
      backend: memory.backend,
      loadedAssets: memory.assets.length,
      table: "audiovisual_visual_memory",
      cooldownProductions: 12,
    },
    library: {
      enabledOnlineSources: selector.source.available,
      approvedLocalAssets: selector.catalog.filter(
        (a) => a.review.status === "approved",
      ).length,
      events: [
        ...memory.events,
        ...selector.source.cache.events,
        ...selector.events,
      ],
      perceptualCheck: "dHash + color, heuristic; review final visuals",
    },
    assets: resolved,
  };
  const manifestFile = path.join(generated, `${code}-resolved-assets.json`);
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  if (good.length !== scenes.length || uniqueCount !== good.length)
    throw new Error(
      "VISUAL_LIBRARY_NEEDS_FRESH_ASSETS: no hay suficientes recursos distintos y válidos. Revise el manifiesto, las fuentes activas y la biblioteca local.",
    );
  await memory.save();
  manifest.library.events = [
    ...memory.events,
    ...selector.source.cache.events,
    ...selector.events,
  ];
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n### Biblioteca visual V2\nFuentes activas: ${selector.source.available.join(", ") || "biblioteca local"}.\n\nFotos: ${count("image")}; clips: ${count("video")}; 3D: ${count("threeD")}. Memoria: ${memory.backend}.\n\n${manifest.library.events.map((e) => "- " + e).join("\n")}\n`,
    );
  console.log(
    `VISUAL LIBRARY V2: ${good.length} escenas; ${count("video")} clips; ${count("threeD")} 3D. ${memory.backend}`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
