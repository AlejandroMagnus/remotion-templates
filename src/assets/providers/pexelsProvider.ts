export type PexelsResolvedAsset = {
  provider: "pexels";
  mediaType: "video" | "image";
  remoteUrl: string;
  sourceUrl: string;
  creator: string;
  creatorUrl?: string;
  width: number;
  height: number;
  durationMs?: number;
};

const API = "https://api.pexels.com/v1";

const headers = () => {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY missing");
  return { Authorization: key };
};

export async function searchPexelsVideo(
  query: string,
  requiredDurationMs: number,
): Promise<PexelsResolvedAsset | null> {
  const url =
    `${API}/videos/search?query=${encodeURIComponent(query)}` +
    `&orientation=portrait&size=medium&per_page=12`;

  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Pexels video search failed: ${res.status}`);

  const data: any = await res.json();
  const requiredSeconds = requiredDurationMs / 1000;

  const candidates = (data.videos ?? [])
    .filter((v: any) => Number(v.duration ?? 0) >= requiredSeconds)
    .flatMap((v: any) =>
      (v.video_files ?? [])
        .filter(
          (f: any) =>
            f.file_type === "video/mp4" &&
            f.link &&
            f.width &&
            f.height,
        )
        .map((f: any) => ({
          video: v,
          file: f,
          score:
            Math.abs((f.width / f.height) - (9 / 16)) * 1000 +
            Math.abs(f.width - 1080) / 10,
        })),
    )
    .sort((a: any, b: any) => a.score - b.score);

  const best = candidates[0];
  if (!best) return null;

  return {
    provider: "pexels",
    mediaType: "video",
    remoteUrl: best.file.link,
    sourceUrl: best.video.url,
    creator: best.video.user?.name ?? "Pexels",
    creatorUrl: best.video.user?.url,
    width: best.file.width,
    height: best.file.height,
    durationMs: Number(best.video.duration ?? 0) * 1000,
  };
}

export async function searchPexelsPhoto(
  query: string,
): Promise<PexelsResolvedAsset | null> {
  const url =
    `${API}/search?query=${encodeURIComponent(query)}` +
    `&orientation=portrait&size=large&per_page=12`;

  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Pexels photo search failed: ${res.status}`);

  const data: any = await res.json();
  const photo = data.photos?.[0];
  if (!photo) return null;

  return {
    provider: "pexels",
    mediaType: "image",
    remoteUrl: photo.src?.large2x ?? photo.src?.large ?? photo.src?.portrait,
    sourceUrl: photo.url,
    creator: photo.photographer ?? "Pexels",
    creatorUrl: photo.photographer_url,
    width: photo.width,
    height: photo.height,
  };
}
