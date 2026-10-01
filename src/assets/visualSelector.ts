import fs from "node:fs";
import path from "node:path";
import { assetKey, cropHeight, type VisualAsset } from "./assetTypes";
import {
  rankVisualCandidate,
  type DirectorScene,
} from "./semanticVisualRanker";
import {
  MultiSourceProvider,
  searchPages,
} from "./providers/multiSourceProvider";
import { loadCatalog, searchCatalog, type CatalogEntry } from "./localCatalog";
import { VisualMemory } from "./visualMemory";
import { inspectMedia } from "./mediaInspection";

type Scene = DirectorScene & { durationMs: number };
export class VisualSelector {
  public events: string[] = [];
  public creators = new Map<string, number>();
  public providers = new Map<string, number>();
  public catalog: CatalogEntry[];
  constructor(
    public memory: VisualMemory,
    public source = new MultiSourceProvider(),
    private root = process.cwd(),
  ) {
    this.catalog = loadCatalog(root);
  }
  async candidates(
    scene: Scene,
    queries: string[],
    kind: "image" | "video",
    page: number,
  ) {
    const context = JSON.stringify(scene);
    const map = new Map<
      string,
      {
        asset: VisualAsset;
        query: string;
        score: ReturnType<typeof rankVisualCandidate>;
        finalScore: number;
      }
    >();
    const add = (asset: VisualAsset, query: string, index: number) => {
      if (cropHeight(asset) < 960 || this.memory.rejection(asset)) return;
      const score = rankVisualCandidate(
        scene,
        asset,
        query,
        index,
        this.creators.get(asset.creator) ?? 0,
      );
      if (score.foreignContextPenalty >= 40 || score.englishTextPenalty >= 35)
        return;
      const finalScore =
        score.total - (this.providers.get(asset.provider) ?? 0) * 3;
      const key = assetKey(asset);
      if (!map.has(key) || map.get(key)!.finalScore < finalScore)
        map.set(key, { asset, query, score, finalScore });
    };
    searchCatalog(
      this.catalog,
      kind,
      context,
      scene.durationMs,
      this.root,
    ).forEach((a, i) => add(a, a.altText ?? "", i));
    for (const query of queries.slice(0, 5)) {
      const assets = await this.source.search(
        query,
        kind,
        scene.durationMs,
        page,
      );
      assets.forEach((a, i) => add(a, query, i));
    }
    return [...map.values()].sort(
      (a, b) =>
        b.finalScore - a.finalScore ||
        assetKey(a.asset).localeCompare(assetKey(b.asset)),
    );
  }
  async select(
    scene: Scene,
    queries: string[],
    kind: "image" | "video",
    targetDirectory: string,
  ) {
    const seen = new Set<string>();
    for (const page of searchPages(this.memory.code)) {
      let inspected = 0;
      const ranked = await this.candidates(scene, queries, kind, page);
      for (const candidate of ranked) {
        const key = assetKey(candidate.asset);
        if (seen.has(key)) continue;
        seen.add(key);
        if (++inspected > 6) {
          this.events.push(`${kind}:page-${page}-inspection-budget-reached`);
          break;
        }
        const file = path.join(
          targetDirectory,
          `.candidate-${kind}.${kind === "video" ? "mp4" : "jpg"}`,
        );
        try {
          if (candidate.asset.localPath)
            fs.copyFileSync(candidate.asset.localPath, file);
          else await downloadMedia(candidate.asset.remoteUrl, file);
          const actual = await inspectMedia(file, kind);
          if (
            cropHeight(actual) < 960 ||
            (kind === "video" && actual.durationMs < scene.durationMs)
          ) {
            this.events.push(`${key}:insufficient-real-resolution-or-duration`);
            continue;
          }
          const asset = { ...candidate.asset, ...actual };
          const reason = this.memory.rejection(asset, true);
          if (reason) {
            this.events.push(`${key}:${reason}`);
            continue;
          }
          const filename = `${asset.provider}-${kind}-${String(asset.providerId).replace(/[^a-zA-Z0-9_-]/g, "_")}-${actual.sha256.slice(0, 12)}.${actual.extension}`;
          fs.renameSync(file, path.join(targetDirectory, filename));
          const history = this.memory.historical(asset);
          const previous = history ? { ...history } : undefined;
          this.memory.register(asset);
          this.creators.set(
            asset.creator,
            (this.creators.get(asset.creator) ?? 0) + 1,
          );
          this.providers.set(
            asset.provider,
            (this.providers.get(asset.provider) ?? 0) + 1,
          );
          return {
            ...candidate,
            asset,
            filename,
            candidateCount: ranked.length,
            previousProduction: previous?.lastProductionCode ?? null,
            previousUseCount: previous?.useCount ?? 0,
            topCandidates: ranked.slice(0, 5).map((c) => ({
              provider: c.asset.provider,
              providerId: c.asset.providerId,
              finalScore: c.finalScore,
            })),
          };
        } catch {
          this.events.push(`${key}:download-or-inspection-failed`);
        } finally {
          fs.rmSync(file, { force: true });
        }
      }
    }
    return null;
  }
}

export async function downloadMedia(
  url: string,
  file: string,
  request: typeof fetch = fetch,
) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:")
    throw new Error("HTTPS asset URL required.");
  const response = await request(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok || !response.body)
    throw new Error(`Asset download HTTP ${response.status}`);
  const limit = 80 * 1024 * 1024;
  if (Number(response.headers.get("content-length")) > limit)
    throw new Error("Asset exceeds 80 MiB.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for await (const chunk of response.body as any) {
    bytes += chunk.length;
    if (bytes > limit) throw new Error("Asset exceeds 80 MiB.");
    chunks.push(chunk);
  }
  fs.writeFileSync(file, Buffer.concat(chunks));
}
