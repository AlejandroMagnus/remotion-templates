import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { VisualAsset } from "./assetTypes";

export const CatalogEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9_-]{1,100}$/),
    provider: z.enum([
      "own",
      "mixkit",
      "polyhaven",
      "ambientcg",
      "pexels",
      "pixabay",
    ]),
    mediaType: z.enum(["image", "video", "model"]),
    file: z
      .string()
      .regex(/^library\/[a-zA-Z0-9_./-]+$/)
      .refine((s) => !s.split("/").includes("..")),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    title: z.string().min(1).max(180),
    tags: z.array(z.string().min(2).max(80)).min(1).max(40),
    sourceUrl: z.string().url(),
    creator: z.string().min(1),
    license: z.string().min(1),
    licenseUrl: z.string().url(),
    review: z.object({
      status: z.enum(["pending", "approved"]),
      reviewer: z.string(),
      date: z.string(),
    }),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    durationMs: z.number().positive().optional(),
  })
  .strict();
export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;
export const CatalogSchema = z
  .object({ version: z.literal("2.0"), assets: z.array(CatalogEntrySchema) })
  .strict()
  .refine(
    (c) => new Set(c.assets.map((a) => a.id)).size === c.assets.length,
    "Duplicate library IDs.",
  );

export function catalogFile(entry: CatalogEntry, root = process.cwd()) {
  const base = fs.realpathSync(path.join(root, "public"));
  const file = fs.realpathSync(path.join(base, entry.file));
  if (!file.startsWith(base + path.sep))
    throw new Error(`Asset outside public: ${entry.id}`);
  const hash = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (hash !== entry.sha256)
    throw new Error(`Library file changed: ${entry.id}. Review the new file.`);
  return file;
}
export function loadCatalog(root = process.cwd()) {
  const file = path.join(root, "content/visual-library/catalog.json");
  if (!fs.existsSync(file)) return [];
  return CatalogSchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))).assets;
}
const words = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);
export function catalogMatch(entry: CatalogEntry, text: string) {
  const context = new Set(words(text));
  return words(entry.tags.join(" ")).filter((w) => context.has(w)).length;
}
export function searchCatalog(
  entries: CatalogEntry[],
  kind: "image" | "video",
  text: string,
  durationMs: number,
  root = process.cwd(),
): VisualAsset[] {
  return entries
    .filter(
      (e) =>
        e.review.status === "approved" &&
        Boolean(e.review.reviewer) &&
        Boolean(e.review.date) &&
        e.mediaType === kind &&
        catalogMatch(e, text) > 0 &&
        (kind !== "video" || (e.durationMs ?? 0) >= durationMs),
    )
    .map((e) => ({
      provider: e.provider,
      providerId: e.id,
      mediaType: kind,
      remoteUrl: "",
      localPath: catalogFile(e, root),
      sourceUrl: e.sourceUrl,
      creator: e.creator,
      width: e.width ?? 0,
      height: e.height ?? 0,
      durationMs: e.durationMs,
      altText: e.title + " " + e.tags.join(" "),
      license: e.license,
      licenseUrl: e.licenseUrl,
      sha256: e.sha256,
    }));
}

/** Self-contained GLB only: rendering never fetches undeclared model dependencies. */
export function validateGlb(bytes: Buffer) {
  if (
    bytes.length > 25 * 1024 * 1024 ||
    bytes.length < 20 ||
    bytes.toString("ascii", 0, 4) !== "glTF" ||
    bytes.readUInt32LE(4) !== 2 ||
    bytes.readUInt32LE(8) !== bytes.length
  )
    throw new Error("Expected a self-contained GLB v2, at most 25 MiB.");
  const length = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a || 20 + length > bytes.length)
    throw new Error("Invalid GLB JSON chunk.");
  const document = JSON.parse(bytes.toString("utf8", 20, 20 + length).trim());
  if (
    (document.extensionsRequired ?? []).some(
      (x: string) =>
        !["KHR_materials_unlit", "KHR_texture_transform"].includes(x),
    )
  )
    throw new Error(
      "Model requires an unsupported decoder or extension; export an uncompressed GLB.",
    );
  if (
    [...(document.buffers ?? []), ...(document.images ?? [])].some(
      (x: any) => x.uri,
    )
  )
    throw new Error("Embed every GLB buffer and texture before import.");
  if (!document.meshes?.length) throw new Error("GLB contains no mesh.");
  return document;
}
