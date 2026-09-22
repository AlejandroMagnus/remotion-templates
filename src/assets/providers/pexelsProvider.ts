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

/**
 * Pexels resilience policy.
 *
 * El resolver audiovisual puede ejecutar muchas búsquedas
 * semánticas durante una sola producción.
 *
 * Un HTTP 429 no debe destruir inmediatamente el render:
 * respetamos Retry-After cuando Pexels lo proporciona y,
 * en caso contrario, aplicamos backoff progresivo.
 */
const MAX_RETRIES = 5;

const BASE_RETRY_DELAY_MS = 5_000;

const MAX_RETRY_DELAY_MS = 60_000;

const headers = () => {
  const key = process.env.PEXELS_API_KEY;

  if (!key) {
    throw new Error("PEXELS_API_KEY missing");
  }

  return {
    Authorization: key,
  };
};

function sleep(
  milliseconds: number,
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function parseRetryAfterMs(
  value: string | null,
): number | null {
  if (!value) {
    return null;
  }

  /*
   * Retry-After puede expresarse como:
   * 1) número de segundos
   * 2) fecha HTTP
   */
  const seconds = Number(value);

  if (
    Number.isFinite(seconds) &&
    seconds >= 0
  ) {
    return Math.min(
      Math.max(
        Math.ceil(seconds * 1000),
        1000,
      ),
      MAX_RETRY_DELAY_MS,
    );
  }

  const retryDate =
    Date.parse(value);

  if (
    Number.isFinite(retryDate)
  ) {
    const delay =
      retryDate - Date.now();

    if (delay > 0) {
      return Math.min(
        delay,
        MAX_RETRY_DELAY_MS,
      );
    }
  }

  return null;
}

function calculateBackoffMs(
  attempt: number,
): number {
  const exponential =
    BASE_RETRY_DELAY_MS *
    Math.pow(
      2,
      attempt,
    );

  /*
   * Pequeño jitter para evitar repetir
   * exactamente el mismo patrón temporal.
   */
  const jitter =
    Math.floor(
      Math.random() * 1000,
    );

  return Math.min(
    exponential + jitter,
    MAX_RETRY_DELAY_MS,
  );
}

async function pexelsFetch(
  url: string,
  label: string,
): Promise<Response> {
  for (
    let attempt = 0;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    const res =
      await fetch(
        url,
        {
          headers: headers(),
        },
      );

    if (res.ok) {
      if (attempt > 0) {
        console.log(
          `[PEXELS] ${label} recovered after ${attempt} retry/retries.`,
        );
      }

      return res;
    }

    /*
     * Solo reintentamos condiciones
     * potencialmente transitorias.
     */
    const retryable =
      res.status === 429 ||
      res.status === 500 ||
      res.status === 502 ||
      res.status === 503 ||
      res.status === 504;

    if (
      !retryable ||
      attempt >= MAX_RETRIES
    ) {
      let detail = "";

      try {
        detail =
          (
            await res.text()
          )
            .slice(
              0,
              300,
            )
            .trim();
      } catch {
        // El detalle es auxiliar.
      }

      throw new Error(
        [
          `${label} failed: ${res.status}`,
          detail
            ? `Response: ${detail}`
            : "",
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }

    const retryAfterMs =
      parseRetryAfterMs(
        res.headers.get(
          "retry-after",
        ),
      );

    const waitMs =
      retryAfterMs ??
      calculateBackoffMs(
        attempt,
      );

    console.warn(
      [
        `[PEXELS] ${label}`,
        `HTTP ${res.status}.`,
        `Retry ${attempt + 1}/${MAX_RETRIES}`,
        `in ${Math.ceil(waitMs / 1000)}s.`,
      ].join(" "),
    );

    await sleep(waitMs);
  }

  /*
   * TypeScript necesita un cierre explícito,
   * aunque el bucle anterior siempre retorna
   * o lanza una excepción.
   */
  throw new Error(
    `${label} failed unexpectedly.`,
  );
}

export async function searchPexelsPhotos(
  query: string,
  perPage = 30,
): Promise<PexelsResolvedAsset[]> {
  const url =
    `${PHOTO_API}/search?query=${encodeURIComponent(query)}` +
    `&size=large&per_page=${perPage}`;

  const res =
    await pexelsFetch(
      url,
      "Pexels photo search",
    );

  const data: any =
    await res.json();

  return (data.photos ?? [])
    .map((photo: any) => ({
      provider:
        "pexels" as const,

      providerId:
        Number(photo.id),

      mediaType:
        "image" as const,

      remoteUrl:
        photo.src?.large2x ??
        photo.src?.large ??
        photo.src?.original,

      sourceUrl:
        photo.url,

      creator:
        photo.photographer ??
        "Pexels",

      creatorUrl:
        photo.photographer_url,

      altText:
        String(
          photo.alt ?? "",
        ),

      width:
        Number(
          photo.width ?? 0,
        ),

      height:
        Number(
          photo.height ?? 0,
        ),
    }))
    .filter(
      (
        asset:
          PexelsResolvedAsset,
      ) =>
        Boolean(
          asset.remoteUrl,
        ) &&
        asset.width > 0 &&
        asset.height > 0,
    );
}

export async function searchPexelsPhoto(
  query: string,
): Promise<
  PexelsResolvedAsset | null
> {
  const results =
    await searchPexelsPhotos(
      query,
      12,
    );

  return results[0] ?? null;
}

export async function searchPexelsVideo(
  query: string,
  requiredDurationMs: number,
): Promise<
  PexelsResolvedAsset | null
> {
  const url =
    `${VIDEO_API}/search?query=${encodeURIComponent(query)}` +
    "&per_page=20";

  const res =
    await pexelsFetch(
      url,
      "Pexels video search",
    );

  const data: any =
    await res.json();

  const requiredSeconds =
    requiredDurationMs / 1000;

  const candidates =
    (data.videos ?? [])
      .filter(
        (video: any) =>
          Number(
            video.duration ?? 0,
          ) >=
          requiredSeconds,
      )
      .flatMap(
        (video: any) =>
          (
            video.video_files ??
            []
          )
            .filter(
              (file: any) =>
                file.file_type ===
                  "video/mp4" &&
                file.link &&
                file.width &&
                file.height,
            )
            .map(
              (file: any) => ({
                video,
                file,

                score:
                  Math.abs(
                    file.width /
                      file.height -
                      9 / 16,
                  ) * 1000,
              }),
            ),
      )
      .sort(
        (
          a: any,
          b: any,
        ) =>
          a.score -
          b.score,
      );

  const best =
    candidates[0];

  if (!best) {
    return null;
  }

  return {
    provider: "pexels",

    providerId:
      Number(
        best.video.id,
      ),

    mediaType:
      "video",

    remoteUrl:
      best.file.link,

    sourceUrl:
      best.video.url,

    creator:
      best.video.user?.name ??
      "Pexels",

    creatorUrl:
      best.video.user?.url,

    width:
      Number(
        best.file.width,
      ),

    height:
      Number(
        best.file.height,
      ),

    durationMs:
      Number(
        best.video.duration ??
        0,
      ) * 1000,
  };
}
