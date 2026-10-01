import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const run = promisify(execFile);

export function fingerprint(rgb: Uint8Array): string {
  if (rgb.length !== 9 * 8 * 3) throw new Error("Invalid fingerprint pixels.");
  const luminance = Array.from(
    { length: 72 },
    (_, i) =>
      0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2],
  );
  let bits = 0n;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      bits =
        (bits << 1n) | BigInt(luminance[y * 9 + x] > luminance[y * 9 + x + 1]);
  const mean = luminance.reduce((a, b) => a + b, 0) / 72;
  const deviation = Math.sqrt(
    luminance.reduce((s, n) => s + (n - mean) ** 2, 0) / 72,
  );
  const colors = [0, 1, 2].map((c) =>
    Math.round(
      Array.from({ length: 72 }, (_, i) => rgb[i * 3 + c]).reduce(
        (a, b) => a + b,
        0,
      ) / 72,
    ),
  );
  return [
    bits.toString(16).padStart(16, "0"),
    ...colors,
    Math.round(deviation),
  ].join(":");
}

export function looksSimilar(a: string[], b: string[]) {
  return a.some((left) =>
    b.some((right) => {
      if (
        !/^[0-9a-f]{16}(?::\d+){4}$/.test(left) ||
        !/^[0-9a-f]{16}(?::\d+){4}$/.test(right)
      )
        return false;
      const l = left.split(":"),
        r = right.split(":");
      // Avoid classifying two low-detail backgrounds as the same photograph.
      if (Number(l[4]) < 12 || Number(r[4]) < 12) return false;
      if ([1, 2, 3].some((i) => Math.abs(Number(l[i]) - Number(r[i])) > 18))
        return false;
      let xor = BigInt("0x" + l[0]) ^ BigInt("0x" + r[0]),
        distance = 0;
      while (xor) {
        distance += Number(xor & 1n);
        xor >>= 1n;
      }
      return distance <= 3;
    }),
  );
}

export async function inspectMedia(file: string, kind: "image" | "video") {
  const { stdout } = await run(
    "ffprobe",
    ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
    { timeout: 20000, maxBuffer: 1024 * 1024 },
  );
  const data = JSON.parse(stdout),
    stream = data.streams?.find((s: any) => s.codec_type === "video");
  if (!stream?.width || !stream?.height)
    throw new Error("Media has no visual stream.");
  const durationMs =
    Number(data.format?.duration ?? stream.duration ?? 0) * 1000;
  if (kind === "video" && !(durationMs > 0))
    throw new Error("Video duration unavailable.");
  const points =
    kind === "video"
      ? [0.15, 0.5, 0.8].map((p) => (durationMs / 1000) * p)
      : [0];
  const fingerprints: string[] = [];
  for (const seconds of points) {
    const { stdout: rgb } = await run(
      "ffmpeg",
      [
        "-v",
        "error",
        ...(seconds ? ["-ss", String(seconds)] : []),
        "-i",
        file,
        "-frames:v",
        "1",
        "-vf",
        "scale=9:8:flags=area",
        "-pix_fmt",
        "rgb24",
        "-f",
        "rawvideo",
        "pipe:1",
      ],
      { encoding: "buffer", timeout: 20000, maxBuffer: 1024 * 1024 },
    );
    fingerprints.push(fingerprint(rgb));
  }
  return {
    extension:
      kind === "video"
        ? "mp4"
        : ({ mjpeg: "jpg", png: "png", webp: "webp", av1: "avif" }[
            String(stream.codec_name)
          ] ?? "jpg"),
    width: Number(stream.width),
    height: Number(stream.height),
    durationMs,
    sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
    fingerprints,
  };
}
