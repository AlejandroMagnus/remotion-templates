import fs from "node:fs";
import path from "node:path";
import { type VisualAsset } from "./assetTypes";
import { looksSimilar } from "./mediaInspection";

export type MemoryItem = {
  provider: string;
  providerId: string;
  mediaType?: string;
  sourceUrl: string;
  creator: string;
  lastProductionCode: string;
  lastUsedAt: string;
  useCount: number;
  sha256?: string;
  fingerprints?: string[];
};
export class VisualMemory {
  assets: MemoryItem[] = [];
  events: string[] = [];
  private selected: VisualAsset[] = [];
  private pending: MemoryItem[] = [];
  private file: string;
  private remote: string;
  private key: string;
  constructor(
    public code: string,
    private root = process.cwd(),
    private request: typeof fetch = fetch,
  ) {
    this.file = path.join(root, ".cache/visual-memory-v2.json");
    this.remote = (process.env.SUPABASE_URL ?? "")
      .replace(/\/+$/, "")
      .replace(/\/rest\/v1$/, "");
    this.key = process.env.SUPABASE_SECRET_KEY ?? "";
  }
  get backend() {
    return this.remote &&
      this.key &&
      !this.events.includes("supabase-read-unavailable")
      ? "SUPABASE+LOCAL"
      : "LOCAL-FALLBACK";
  }
  private async api(suffix: string, init: RequestInit = {}) {
    const res = await this.request(
      this.remote + "/rest/v1/audiovisual_visual_memory" + suffix,
      {
        ...init,
        signal: AbortSignal.timeout(15000),
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
          ...init.headers,
        },
      },
    );
    if (!res.ok) throw new Error(`visual-memory-http-${res.status}`);
    const body = await res.text();
    return body ? JSON.parse(body) : null;
  }
  async load() {
    const all: MemoryItem[] = [];
    for (const name of [
      path.join(this.root, "data/visual-memory.json"),
      this.file,
    ]) {
      if (!fs.existsSync(name)) continue;
      const data = JSON.parse(fs.readFileSync(name, "utf8"));
      if (!Array.isArray(data.assets))
        throw new Error("Invalid visual memory; restore the last valid copy.");
      all.push(...data.assets);
    }
    if (this.remote && this.key)
      try {
        for (let offset = 0; offset < 100000; offset += 1000) {
          const rows = await this.api(
            `?select=provider,provider_asset_id,source_url,creator,production_code,last_used_at,use_count,metadata&order=last_used_at.desc&limit=1000&offset=${offset}`,
          );
          all.push(
            ...rows.map((r: any) => ({
              provider: r.provider,
              providerId: String(r.provider_asset_id).replace(
                /^(image|video|model):/,
                "",
              ),
              mediaType: r.metadata?.mediaType,
              sourceUrl: r.source_url ?? "",
              creator: r.creator ?? "",
              lastProductionCode: r.production_code,
              lastUsedAt: r.last_used_at,
              useCount: r.use_count,
              sha256: r.metadata?.sha256,
              fingerprints: r.metadata?.fingerprints,
            })),
          );
          if (rows.length < 1000) break;
        }
      } catch {
        this.events.push("supabase-read-unavailable");
      }
    const entries = new Map<string, MemoryItem>();
    for (const item of all.sort(
      (a, b) => Date.parse(a.lastUsedAt) - Date.parse(b.lastUsedAt),
    )) {
      entries.set(
        `${item.provider}:${item.mediaType ?? "legacy"}:${item.providerId}`,
        item,
      );
    }
    this.assets = [...entries.values()];
    return this;
  }
  recent() {
    const codes = [
      ...new Set(
        [...this.assets]
          .sort((a, b) => Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt))
          .map((a) => a.lastProductionCode)
          .filter((c) => c !== this.code),
      ),
    ].slice(0, 12);
    return this.assets.filter((a) => codes.includes(a.lastProductionCode));
  }
  rejection(asset: VisualAsset, fingerprints = false): string | null {
    const match = (a: MemoryItem | VisualAsset) =>
      (a.provider === asset.provider &&
        String(a.providerId) === String(asset.providerId) &&
        (!a.mediaType || a.mediaType === asset.mediaType)) ||
      Boolean(a.sourceUrl && a.sourceUrl === asset.sourceUrl) ||
      Boolean(fingerprints && a.sha256 && a.sha256 === asset.sha256) ||
      Boolean(
        fingerprints &&
        looksSimilar(a.fingerprints ?? [], asset.fingerprints ?? []),
      );
    if (this.selected.some(match)) return "repeated-in-production";
    if (this.recent().some(match)) return "recent-visual-repeat";
    return null;
  }
  historical(asset: VisualAsset) {
    return this.assets.find(
      (a) =>
        a.provider === asset.provider &&
        String(a.providerId) === String(asset.providerId) &&
        (!a.mediaType || a.mediaType === asset.mediaType),
    );
  }
  register(asset: VisualAsset) {
    const previous = this.historical(asset);
    const item: MemoryItem = {
      provider: asset.provider,
      providerId: String(asset.providerId),
      mediaType: asset.mediaType,
      sourceUrl: asset.sourceUrl,
      creator: asset.creator,
      lastProductionCode: this.code,
      lastUsedAt: new Date().toISOString(),
      useCount:
        (previous?.useCount ?? 0) +
        (previous?.lastProductionCode === this.code ? 0 : 1),
      sha256: asset.sha256,
      fingerprints: asset.fingerprints,
    };
    this.selected.push(asset);
    this.pending.push(item);
    if (previous) Object.assign(previous, item);
    else this.assets.push(item);
  }
  async save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(
      this.file + ".tmp",
      JSON.stringify(
        { version: "visual-library-2", assets: this.assets },
        null,
        2,
      ) + "\n",
    );
    fs.renameSync(this.file + ".tmp", this.file);
    if (this.remote && this.key)
      for (const item of this.pending)
        try {
          const id = `${item.mediaType}:${item.providerId}`;
          const filter = `?provider=eq.${encodeURIComponent(item.provider)}&provider_asset_id=eq.${encodeURIComponent(id)}`;
          const existing = await this.api(filter + "&select=use_count");
          const body = {
            source_url: item.sourceUrl,
            creator: item.creator,
            production_code: this.code,
            last_used_at: item.lastUsedAt,
            use_count: item.useCount,
            metadata: {
              mediaType: item.mediaType,
              sha256: item.sha256,
              fingerprints: item.fingerprints,
            },
          };
          if (existing.length)
            await this.api(filter, {
              method: "PATCH",
              body: JSON.stringify(body),
            });
          else
            await this.api("", {
              method: "POST",
              body: JSON.stringify({
                ...body,
                provider: item.provider,
                provider_asset_id: id,
                first_used_at: item.lastUsedAt,
              }),
            });
        } catch {
          if (!this.events.includes("supabase-write-unavailable"))
            this.events.push("supabase-write-unavailable");
          break;
        }
  }
}
