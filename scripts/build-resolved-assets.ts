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
  autoridad: "government official reviewing legal documents office",
  expediente: "legal case file documents desk",
  argumentos: "lawyer reviewing legal arguments documents",
  prueba: "legal evidence documents investigation desk",
  motivacion: "lawyer analyzing legal documents office",
  recurso: "lawyer legal appeal documents office",
  decision: "legal decision documents professional office",
  "debido-proceso": "court justice legal process",
  defensa: "defense lawyer meeting client office",
  plazos: "calendar deadline legal documents office",
  ignorar: "official documents desk bureaucracy",
  vulneracion: "lawyer concerned legal documents office",
  "accion-final": "lawyer taking legal action office",
};

async function download(url: string, target: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Download failed ${res.status}: ${url}`);
  }

  fs.writeFileSync(
    target,
    Buffer.from(await res.arrayBuffer()),
  );
}

async function main() {
  if (!fs.existsSync(planPath)) {
    throw new Error(`Missing asset scene plan: ${planPath}`);
  }

  fs.mkdirSync(outputDir, {recursive: true});

  const source = JSON.parse(
    fs.readFileSync(planPath, "utf8"),
  );

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

    // CONTINUIDAD:
    // reutiliza el último recurso válido para no dejar negro.
    if (scene.route === "CONTINUITY") {
      const previous = [...resolved]
        .reverse()
        .find(
          (item) =>
            item.status === "resolved" &&
            item.asset,
        );

      if (previous?.asset) {
        resolved.push({
          ...base,
          status: "resolved",
          query: "continuity-reuse",
          asset: {
            ...previous.asset,
            reusedForContinuity: true,
          },
        });
      } else {
        resolved.push({
          ...base,
          status: "unresolved",
        });
      }

      continue;
    }

    const query =
      queries[scene.ruleId] ??
      queries[scene.concept] ??
      String(scene.concept ?? scene.ruleId)
        .replaceAll("-", " ");

    console.log(
      `PHOTO-FIRST: ${scene.ruleId} | ${query}`,
    );

    // En esta baseline TODO concepto visual busca
    // fotografía primero.
    let asset = await searchPexelsPhoto(query);

    // Video únicamente como respaldo.
    if (!asset) {
      asset = await searchPexelsVideo(
        query,
        scene.durationMs,
      );
    }

    if (!asset) {
      console.log(`UNRESOLVED: ${scene.ruleId}`);

      resolved.push({
        ...base,
        status: "unresolved",
        query,
      });

      continue;
    }

    const extension =
      asset.mediaType === "video" ? "mp4" : "jpg";

    const filename =
      `${scene.id}-${scene.ruleId}.${extension}`;

    const target = path.join(
      outputDir,
      filename,
    );

    await download(asset.remoteUrl, target);

    console.log(
      `RESOLVED: ${scene.ruleId} -> ${filename}`,
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
    version: "V3.9.3-PHOTO-FIRST",
    generatedAt: new Date().toISOString(),
    resolvedCount: resolved.filter(
      (x) => x.status === "resolved",
    ).length,
    assets: resolved,
  };

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2),
  );

  console.log("=== V3.9.3 PHOTO-FIRST ===");
  console.log(`Resolved: ${manifest.resolvedCount}`);

  if (manifest.resolvedCount === 0) {
    throw new Error(
      "V3.9.3: no visual assets resolved",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
