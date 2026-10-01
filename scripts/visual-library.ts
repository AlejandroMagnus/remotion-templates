import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  CatalogSchema,
  CatalogEntrySchema,
  loadCatalog,
  catalogFile,
  validateGlb,
} from "../src/assets/localCatalog";
import { inspectMedia } from "../src/assets/mediaInspection";
import { packGlb } from "../src/assets/packGlb";

const args = process.argv.slice(2),
  command = args[0] ?? "status";
const catalogPath = path.resolve("content/visual-library/catalog.json");
function save(assets: ReturnType<typeof loadCatalog>) {
  fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
  fs.writeFileSync(
    catalogPath,
    JSON.stringify(CatalogSchema.parse({ version: "2.0", assets }), null, 2) +
      "\n",
  );
}
async function main() {
  const assets = loadCatalog();
  if (command === "status" || command === "check") {
    for (const a of assets) {
      catalogFile(a);
      if (a.mediaType === "model") validateGlb(fs.readFileSync(catalogFile(a)));
    }
    console.log(
      `Biblioteca: ${assets.length} recursos; ${assets.filter((a) => a.review.status === "approved").length} revisados.`,
    );
    console.log(
      `Pexels: ${process.env.PEXELS_API_KEY ? "configurado" : "sin clave en esta terminal"}; Pixabay: ${process.env.PIXABAY_API_KEY ? "configurado" : "sin clave en esta terminal"}`,
    );
    console.table(
      assets.map((a) => ({
        id: a.id,
        provider: a.provider,
        type: a.mediaType,
        review: a.review.status,
      })),
    );
    return;
  }
  if (command === "approve") {
    const entry = assets.find((a) => a.id === args[1]);
    if (!entry || !args[2])
      throw new Error(
        'Uso: assets:library -- approve ID "Revisor" (después de revisar archivo y licencia).',
      );
    catalogFile(entry);
    entry.review = {
      status: "approved",
      reviewer: args[2],
      date: new Date().toISOString(),
    };
    save(assets);
    return;
  }
  if (command === "import") {
    if (!args[1] || !args[2])
      throw new Error("Uso: assets:library -- import METADATA.json ARCHIVO");
    const metadata = JSON.parse(fs.readFileSync(args[1], "utf8"));
    const bytes = fs.readFileSync(args[2]);
    if (bytes.length > 80 * 1024 * 1024)
      throw new Error("Asset exceeds 80 MiB.");
    if (metadata.mediaType === "model") validateGlb(bytes);
    const ext = path.extname(args[2]).toLowerCase();
    if (![".glb", ".jpg", ".jpeg", ".png", ".mp4", ".webp"].includes(ext))
      throw new Error("Formato no admitido.");
    if (metadata.mediaType === "model" && ext !== ".glb")
      throw new Error("Los modelos deben ser GLB.");
    const info =
      metadata.mediaType === "model"
        ? {}
        : await inspectMedia(
            args[2],
            metadata.mediaType === "video" ? "video" : "image",
          );
    const hash = createHash("sha256").update(bytes).digest("hex");
    const entry = CatalogEntrySchema.parse({
      ...metadata,
      ...(metadata.mediaType === "model"
        ? {}
        : {
            width: (info as any).width,
            height: (info as any).height,
            ...(metadata.mediaType === "video"
              ? { durationMs: (info as any).durationMs }
              : {}),
          }),
      file: `library/${hash}${ext}`,
      sha256: hash,
      review: { status: "pending", reviewer: "", date: "" },
    });
    if (assets.some((a) => a.id === entry.id))
      throw new Error("Ese ID ya existe; no se sobrescribió.");
    fs.mkdirSync(path.resolve("public/library"), { recursive: true });
    fs.writeFileSync(path.resolve("public", entry.file), bytes);
    assets.push(entry);
    save(assets);
    console.log(
      `Importado ${entry.id}; revisión visual y de licencia pendiente.`,
    );
    return;
  }
  if (command === "polyhaven") {
    const id = args[1],
      tags = args[2]?.split(",");
    if (!id || !/^[a-z0-9_]+$/.test(id) || !tags?.length)
      throw new Error(
        'Uso: assets:library -- polyhaven MODEL_ID "etiqueta,etiqueta"',
      );
    const get = async (url: string) => {
      const u = new URL(url);
      if (
        u.protocol !== "https:" ||
        !["api.polyhaven.com", "dl.polyhaven.org", "dl.polyhaven.com"].includes(
          u.hostname,
        )
      )
        throw new Error("Unexpected Poly Haven URL.");
      const res = await fetch(url, {
        headers: { "User-Agent": "RiverosAudiovisual/VisualLibrary-2" },
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) throw new Error(`Poly Haven HTTP ${res.status}`);
      const chunks: Uint8Array[] = [];
      let n = 0;
      for await (const chunk of res.body as any) {
        n += chunk.length;
        if (n > 25 * 1024 * 1024)
          throw new Error("3D dependency exceeds 25 MiB.");
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    };
    if (assets.some((a) => a.id === `ph-${id}`))
      throw new Error("Este modelo ya está importado.");
    const files = JSON.parse(
      (await get(`https://api.polyhaven.com/files/${id}`)).toString(),
    );
    const descriptor = files.gltf?.["1k"]?.gltf;
    if (!descriptor?.url)
      throw new Error(
        "Modelo sin glTF 1K compatible; elija otro o importe un GLB preparado.",
      );
    const document = JSON.parse((await get(descriptor.url)).toString());
    const dependencies = new Map<string, Buffer>();
    for (const item of [
      ...(document.buffers ?? []),
      ...(document.images ?? []),
    ])
      if (item.uri) {
        const resource = descriptor.include?.[item.uri];
        if (!resource?.url)
          throw new Error(`Dependencia no declarada: ${item.uri}`);
        const data = await get(resource.url);
        if (
          resource.md5 &&
          createHash("md5").update(data).digest("hex") !== resource.md5
        )
          throw new Error("Poly Haven dependency checksum mismatch.");
        dependencies.set(item.uri, data);
      }
    const bytes = packGlb(document, dependencies),
      hash = createHash("sha256").update(bytes).digest("hex");
    const file = `library/${hash}.glb`;
    fs.mkdirSync("public/library", { recursive: true });
    fs.writeFileSync(path.join("public", file), bytes);
    assets.push(
      CatalogEntrySchema.parse({
        id: `ph-${id}`,
        provider: "polyhaven",
        mediaType: "model",
        file,
        sha256: hash,
        title: id.replaceAll("_", " "),
        tags,
        sourceUrl: `https://polyhaven.com/a/${id}`,
        creator: "Poly Haven",
        license: "CC0-1.0",
        licenseUrl: "https://polyhaven.com/license",
        review: { status: "pending", reviewer: "", date: "" },
      }),
    );
    save(assets);
    console.log(
      `Modelo importado desde Poly Haven: ph-${id}. Revisión visual pendiente.`,
    );
    return;
  }
  throw new Error("Comando: status | check | import | polyhaven | approve");
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
