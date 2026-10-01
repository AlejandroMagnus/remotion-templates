import { createHash } from "node:crypto";
import { SearchCache } from "./searchCache";
import { assetKey, cropHeight, type VisualAsset } from "../assetTypes";

export function searchPages(code: string) {
  const seed = createHash("sha256").update(code).digest().readUInt32BE(0);
  return [1, 2, 3 + (seed % 3)];
}

export function pexelsPhotos(data: any): VisualAsset[] {
  return (data?.photos ?? [])
    .map((p: any) => ({
      provider: "pexels",
      providerId: p.id,
      mediaType: "image",
      remoteUrl: p.src?.original,
      sourceUrl: p.url,
      creator: p.photographer ?? "Pexels",
      creatorUrl: p.photographer_url,
      width: Number(p.width),
      height: Number(p.height),
      altText: p.alt ?? "",
      license: "Pexels",
      licenseUrl: "https://www.pexels.com/license/",
    }))
    .filter(validAsset);
}

export function pexelsVideos(data: any, durationMs: number): VisualAsset[] {
  return (data?.videos ?? [])
    .flatMap((v: any) => {
      if (Number(v.duration) * 1000 < durationMs) return [];
      const files = (v.video_files ?? [])
        .filter(
          (f: any) =>
            f.file_type === "video/mp4" && f.link && f.width && f.height,
        )
        .sort(
          (a: any, b: any) =>
            Math.min(1920, cropHeight(b)) - Math.min(1920, cropHeight(a)) ||
            a.width * a.height - b.width * b.height,
        );
      const f = files[0];
      if (!f) return [];
      return [
        {
          provider: "pexels",
          providerId: v.id,
          mediaType: "video",
          remoteUrl: f.link,
          sourceUrl: v.url,
          creator: v.user?.name ?? "Pexels",
          creatorUrl: v.user?.url,
          width: Number(f.width),
          height: Number(f.height),
          durationMs: Number(v.duration) * 1000,
          altText: [
            v.url
              ?.split("/")
              .filter(Boolean)
              .at(-1)
              ?.replace(/-\d+$/, "")
              .replaceAll("-", " "),
            ...(v.tags ?? []),
          ].join(" "),
          license: "Pexels",
          licenseUrl: "https://www.pexels.com/license/",
        },
      ];
    })
    .filter(validAsset);
}

export function pixabayAssets(
  data: any,
  kind: "image" | "video",
  durationMs: number,
): VisualAsset[] {
  return (data?.hits ?? [])
    .flatMap((p: any) => {
      let remoteUrl: string;
      let width: number;
      let height: number;
      if (kind === "video") {
        if (Number(p.duration) * 1000 < durationMs) return [];
        const files = Object.values(p.videos ?? {}).filter(
          (f: any) => f.url && f.width && f.height,
        ) as any[];
        files.sort(
          (a, b) =>
            Math.min(1920, cropHeight(b)) - Math.min(1920, cropHeight(a)) ||
            a.width * a.height - b.width * b.height,
        );
        if (!files.length) return [];
        ({ url: remoteUrl, width, height } = files[0]);
      } else {
        remoteUrl = p.imageURL ?? p.fullHDURL ?? p.largeImageURL;
        const scale = p.imageURL
          ? 1
          : Math.min(
              1,
              (p.fullHDURL ? 1920 : 1280) /
                Math.max(p.imageWidth, p.imageHeight),
            );
        width = Math.round(p.imageWidth * scale);
        height = Math.round(p.imageHeight * scale);
      }
      return [
        {
          provider: "pixabay",
          providerId: p.id,
          mediaType: kind,
          remoteUrl,
          sourceUrl: p.pageURL,
          creator: p.user ?? "Pixabay",
          width,
          height,
          altText: p.tags ?? "",
          ...(kind === "video"
            ? { durationMs: Number(p.duration) * 1000 }
            : {}),
          license: "Pixabay Content License",
          licenseUrl: "https://pixabay.com/service/license-summary/",
        },
      ];
    })
    .filter(validAsset);
}

function validAsset(asset: any): asset is VisualAsset {
  return Boolean(
    asset.remoteUrl &&
    asset.sourceUrl &&
    asset.providerId != null &&
    Number.isFinite(asset.width) &&
    Number.isFinite(asset.height) &&
    asset.width > 0 &&
    asset.height > 0,
  );
}

export class MultiSourceProvider {
  constructor(
    public cache = new SearchCache(),
    private keys = {
      pexels: process.env.PEXELS_API_KEY,
      pixabay: process.env.PIXABAY_API_KEY,
    },
  ) {}
  get available() {
    return Object.entries(this.keys)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
  }
  async search(
    query: string,
    kind: "image" | "video",
    durationMs: number,
    page: number,
  ): Promise<VisualAsset[]> {
    // Sequential per provider: bounded, cached requests; one unavailable provider does not fail others.
    const found: VisualAsset[] = [];
    if (this.keys.pexels) {
      const endpoint = kind === "image" ? "v1/search" : "videos/search";
      const params = new URLSearchParams({
        query,
        per_page: "30",
        page: String(page),
      });
      const data = await this.cache.json(
        "pexels",
        endpoint + "?" + params,
        `https://api.pexels.com/${endpoint}?${params}`,
        { Authorization: this.keys.pexels },
      );
      found.push(
        ...(kind === "image"
          ? pexelsPhotos(data)
          : pexelsVideos(data, durationMs)),
      );
    }
    if (this.keys.pixabay) {
      const endpoint = kind === "image" ? "" : "videos/";
      const params = new URLSearchParams({
        q: query.slice(0, 100),
        safesearch: "true",
        per_page: "30",
        page: String(page),
      });
      const key = endpoint + "?" + params;
      params.set("key", this.keys.pixabay);
      const data = await this.cache.json(
        "pixabay",
        key,
        `https://pixabay.com/api/${endpoint}?${params}`,
      );
      found.push(...pixabayAssets(data, kind, durationMs));
    }
    return [...new Map(found.map((a) => [assetKey(a), a])).values()];
  }
}
