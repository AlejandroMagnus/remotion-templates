export type PexelsResolvedAsset = {
  provider: "pexels";
  providerId: number;
  mediaType: "video" | "image";
  remoteUrl: string;
  sourceUrl: string;
  creator: string;
  creatorUrl?: string;
  width: number;
  height: number;
  durationMs?: number;
  altText?: string;
};

const PHOTO_API = "https://api.pexels.com/v1";
const VIDEO_API = "https://api.pexels.com/videos";

const headers = () => {
  const key = process.env.PEXELS_API_KEY;

  if (!key) {
    throw new Error("PEXELS_API_KEY missing");
  }

  return {
    Authorization: key,
  };
};

export async function searchPexelsPhotos(
  query: string,
  perPage = 30,
): Promise<PexelsResolvedAsset[]> {
  const url =
    `${PHOTO_API}/search?query=${encodeURIComponent(query)}` +
    `&size=large&per_page=${perPage}`;

  const res = await fetch(url, {
    headers: headers(),
  });

  if (!res.ok) {
    throw new Error(
      `Pexels photo search failed: ${res.status}`,
    );
  }

  const data: any = await res.json();

  return (data.photos ?? [])
    .map((photo: any) => ({
      provider: "pexels" as const,
      providerId: Number(photo.id),
      mediaType: "image" as const,
      remoteUrl:
        photo.src?.large2x ??
        photo.src?.large ??
        photo.src?.original,
      sourceUrl: photo.url,
      creator: photo.photographer ?? "Pexels",
      creatorUrl: photo.photographer_url,
      altText: String(photo.alt ?? ""),
      width: Number(photo.width ?? 0),
      height: Number(photo.height ?? 0),
    }))
    .filter(
      (asset: PexelsResolvedAsset) =>
        asset.remoteUrl &&
        asset.width > 0 &&
        asset.height > 0,
    );
}

export async function searchPexelsPhoto(
  query: string,
): Promise<PexelsResolvedAsset | null> {
  const results = await searchPexelsPhotos(query, 12);
  return results[0] ?? null;
}

export async function searchPexelsVideo(
  query: string,
  requiredDurationMs: number,
): Promise<PexelsResolvedAsset | null> {
  const url =
    `${VIDEO_API}/search?query=${encodeURIComponent(query)}` +
    `&per_page=20`;

  const res = await fetch(url, {
    headers: headers(),
  });

  if (!res.ok) {
    throw new Error(
      `Pexels video search failed: ${res.status}`,
    );
  }

  const data: any = await res.json();
  const requiredSeconds = requiredDurationMs / 1000;

  const candidates = (data.videos ?? [])
    .filter(
      (video: any) =>
        Number(video.duration ?? 0) >= requiredSeconds,
    )
    .flatMap((video: any) =>
      (video.video_files ?? [])
        .filter(
          (file: any) =>
            file.file_type === "video/mp4" &&
            file.link &&
            file.width &&
            file.height,
        )
        .map((file: any) => ({
          video,
          file,
          score:
            Math.abs(
              file.width / file.height - 9 / 16,
            ) * 1000,
        })),
    )
    .sort(
      (a: any, b: any) =>
        a.score - b.score,
    );

  const best = candidates[0];

  if (!best) {
    return null;
  }

  return {
    provider: "pexels",
    providerId: Number(best.video.id),
    mediaType: "video",
    remoteUrl: best.file.link,
    sourceUrl: best.video.url,
    creator:
      best.video.user?.name ?? "Pexels",
    creatorUrl: best.video.user?.url,
    width: Number(best.file.width),
    height: Number(best.file.height),
    durationMs:
      Number(best.video.duration ?? 0) * 1000,
  };
}
