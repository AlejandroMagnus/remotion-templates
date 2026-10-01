import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { assetKey, type VisualAsset } from "../src/assets/assetTypes";
import { SearchCache } from "../src/assets/providers/searchCache";
import {
  MultiSourceProvider,
  pexelsVideos,
  pixabayAssets,
  searchPages,
} from "../src/assets/providers/multiSourceProvider";
import { VisualMemory } from "../src/assets/visualMemory";
import {
  fingerprint,
  looksSimilar,
  inspectMedia,
} from "../src/assets/mediaInspection";
import {
  CatalogEntrySchema,
  loadCatalog,
  searchCatalog,
  validateGlb,
} from "../src/assets/localCatalog";
import { packGlb } from "../src/assets/packGlb";
import { EvidenceSceneSchema } from "../src/threeD/schema";
import { planNativeThreeD } from "../src/threeD/planner";
import { VisualSelector } from "../src/assets/visualSelector";
import pilot from "../examples/native-3d-pilot.video.json";

const dirs: string[] = [];
const root = process.cwd();
function temporary() {
  const d = mkdtempSync(path.join(tmpdir(), "visual-library-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
  vi.unstubAllEnvs();
});
const asset = (id: string, extra: Partial<VisualAsset> = {}): VisualAsset => ({
  provider: "pexels",
  providerId: id,
  mediaType: "image",
  remoteUrl: "https://example.org/a.jpg",
  sourceUrl: `https://example.org/${id}`,
  creator: "A",
  width: 1080,
  height: 1920,
  ...extra,
});
const noRemote = () => {
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SECRET_KEY", "");
};

describe("multiple providers and video candidates", () => {
  it("returns multiple independent clips and chooses a sharp usable rendition", () => {
    const videos = [1, 2].map((id) => ({
      id,
      duration: 8,
      url: `https://pexels.com/video/documents-${id}`,
      video_files: [
        { file_type: "video/mp4", width: 360, height: 640, link: "small" },
        { file_type: "video/mp4", width: 1080, height: 1920, link: "large" },
      ],
    }));
    expect(
      pexelsVideos({ videos }, 5000).map((a) => [a.providerId, a.remoteUrl]),
    ).toEqual([
      [1, "large"],
      [2, "large"],
    ]);
    expect(pexelsVideos({ videos }, 9000)).toEqual([]);
  });
  it("measures the actual Pixabay photo rendition rather than original dimensions", () => {
    const [image] = pixabayAssets(
      {
        hits: [
          {
            id: 1,
            pageURL: "https://pixabay.com/1",
            imageWidth: 3000,
            imageHeight: 4000,
            largeImageURL: "https://cdn.test/a.jpg",
          },
        ],
      },
      "image",
      0,
    );
    expect([image.width, image.height]).toEqual([960, 1280]);
  });
  it("isolates identical IDs across providers and media types", () => {
    expect(
      new Set([
        assetKey(asset("1")),
        assetKey(asset("1", { provider: "pixabay" })),
        assetKey(asset("1", { mediaType: "video" })),
      ]).size,
    ).toBe(3);
    expect(searchPages("video-juridico-045")[0]).toBe(1);
    expect(
      new Set(
        Array.from({ length: 12 }, (_, i) => searchPages(`video-${i}`).join()),
      ).size,
    ).toBeGreaterThan(1);
  });
  it("uses another source when one is throttled and never caches the API key", async () => {
    const dir = temporary();
    const mock = vi.fn(async (url: any) =>
      String(url).includes("pexels")
        ? new Response("", { status: 429 })
        : Response.json({
            hits: [
              {
                id: 8,
                pageURL: "https://pixabay.com/8",
                largeImageURL: "https://cdn.test/8",
                imageWidth: 960,
                imageHeight: 1280,
              },
            ],
          }),
    );
    const cache = new SearchCache(dir, mock as typeof fetch),
      provider = new MultiSourceProvider(cache, {
        pexels: "px-secret",
        pixabay: "pb-secret",
      });
    expect(
      (await provider.search("documents", "image", 0, 1))[0].provider,
    ).toBe("pixabay");
    await provider.search("documents", "image", 0, 1);
    expect(mock).toHaveBeenCalledTimes(2);
    expect(cache.events).toEqual(["pexels:unavailable-http-429"]);
    expect(JSON.stringify(cache.events)).not.toContain("secret");
  });
});

describe("shared history and perceptual repetition", () => {
  it("round-trips model identifiers through the existing Supabase metadata", async () => {
    vi.stubEnv("SUPABASE_URL", "https://test.invalid");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-key");
    const request = vi.fn(async (_url: any, init?: RequestInit) =>
      init?.method
        ? new Response(null, { status: 204 })
        : Response.json([
            {
              provider: "polyhaven",
              provider_asset_id: "model:book",
              source_url: "https://polyhaven.com/a/book",
              creator: "Artist",
              production_code: "video-001",
              last_used_at: "2026-10-01T00:00:00Z",
              use_count: 1,
              metadata: { mediaType: "model", sha256: "abc" },
            },
          ]),
    );
    const model = asset("book", {
      provider: "polyhaven",
      mediaType: "model",
      sha256: "abc",
      sourceUrl: "https://polyhaven.com/a/book",
    });
    const memory = await new VisualMemory(
      "video-002",
      temporary(),
      request as typeof fetch,
    ).load();
    expect(memory.historical(model)?.providerId).toBe("book");
    expect(memory.rejection(model, true)).toBe("recent-visual-repeat");
    const resume = await new VisualMemory(
      "video-001",
      temporary(),
      request as typeof fetch,
    ).load();
    resume.register(model);
    await resume.save();
    const write = request.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    )!;
    expect(String(write[0])).toContain("provider_asset_id=eq.model%3Abook");
    expect(JSON.parse(String(write[1]?.body)).use_count).toBe(1);
  });
  it("blocks recent assets across runs but allows resuming the same production", async () => {
    noRemote();
    const dir = temporary();
    const first = await new VisualMemory("video-001", dir).load();
    first.register(asset("1"));
    first.register(asset("2"));
    await first.save();
    const next = await new VisualMemory("video-002", dir).load();
    expect(next.rejection(asset("1"))).toBe("recent-visual-repeat");
    expect(
      next.rejection(asset("3", { provider: "pixabay", sha256: "a" }), true),
    ).toBeNull();
    const resume = await new VisualMemory("video-001", dir).load();
    expect(resume.rejection(asset("1"))).toBeNull();
    resume.register(asset("1"));
    expect(resume.rejection(asset("1"))).toBe("repeated-in-production");
    expect(resume.historical(asset("1"))!.useCount).toBe(1);
  });
  it("allows older material after twelve distinct productions", async () => {
    noRemote();
    const memory = new VisualMemory("video-020", temporary());
    memory.assets = Array.from({ length: 14 }, (_, i) => ({
      provider: "pexels",
      providerId: String(i),
      mediaType: "image",
      sourceUrl: `https://example.org/${i}`,
      creator: "A",
      lastProductionCode: `video-${i}`,
      lastUsedAt: new Date(2026, 0, i + 1).toISOString(),
      useCount: 1,
    }));
    expect(memory.rejection(asset("0"))).toBeNull();
    expect(memory.rejection(asset("13"))).toBe("recent-visual-repeat");
  });
  it("detects copied resources across providers and avoids uniform-background false matches", async () => {
    noRemote();
    const memory = new VisualMemory("next", temporary());
    memory.register(asset("1", { sha256: "same" }));
    expect(
      memory.rejection(
        asset("999", { provider: "pixabay", sha256: "same" }),
        true,
      ),
    ).toBe("repeated-in-production");
    const pixels = Uint8Array.from({ length: 216 }, (_, i) => (i * 53) % 256);
    const same = fingerprint(pixels);
    expect(looksSimilar([same], [same])).toBe(true);
    expect(
      looksSimilar(
        [fingerprint(new Uint8Array(216))],
        [fingerprint(new Uint8Array(216))],
      ),
    ).toBe(false);
  });
  it("does not discard a corrupted historical file", async () => {
    noRemote();
    const dir = temporary();
    mkdirSync(path.join(dir, ".cache"));
    writeFileSync(path.join(dir, ".cache/visual-memory-v2.json"), "broken");
    await expect(new VisualMemory("next", dir).load()).rejects.toThrow();
  });
});

describe("reviewed local library and self-contained 3D", () => {
  it("packs buffers and images without runtime external dependencies", () => {
    const glb = packGlb(
      {
        asset: { version: "2.0" },
        buffers: [{ uri: "mesh.bin", byteLength: 12 }],
        bufferViews: [{ buffer: 0, byteLength: 12 }],
        meshes: [{ primitives: [] }],
        images: [{ uri: "color.jpg" }],
      },
      new Map([
        ["mesh.bin", Buffer.alloc(12)],
        ["color.jpg", Buffer.from([1, 2, 3])],
      ]),
    );
    const document = validateGlb(glb);
    expect(document.images[0].uri).toBeUndefined();
    expect(document.images[0].bufferView).toBe(1);
    expect(() => validateGlb(Buffer.from("not glb"))).toThrow();
    expect(() =>
      packGlb(
        {
          asset: { version: "2.0" },
          extensionsRequired: ["KHR_draco_mesh_compression"],
          meshes: [{}],
        },
        new Map(),
      ),
    ).toThrow(/decoder/);
  });
  it("keeps pending assets out of selection and binds review to the file bytes", () => {
    const dir = temporary();
    mkdirSync(path.join(dir, "public/library"), { recursive: true });
    const bytes = Buffer.from("image");
    writeFileSync(path.join(dir, "public/library/a.jpg"), bytes);
    const entry = CatalogEntrySchema.parse({
      id: "test-a",
      provider: "mixkit",
      mediaType: "image",
      file: "library/a.jpg",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      title: "Documentos",
      tags: ["documentos"],
      sourceUrl: "https://mixkit.co/example",
      creator: "Artist",
      license: "License",
      licenseUrl: "https://mixkit.co/license",
      review: { status: "pending", reviewer: "", date: "" },
      width: 1080,
      height: 1920,
    });
    expect(searchCatalog([entry], "image", "documentos", 0, dir)).toEqual([]);
    entry.review = {
      status: "approved",
      reviewer: "Reviewer",
      date: "2026-10-01",
    };
    expect(searchCatalog([entry], "image", "documentos", 0, dir)).toHaveLength(
      1,
    );
    writeFileSync(path.join(dir, "public/library/a.jpg"), "changed");
    expect(() => searchCatalog([entry], "image", "documentos", 0, dir)).toThrow(
      /changed/,
    );
  });
  it("requires a reviewed model reference and retains the existing 3D timing budget", () => {
    const base = {
      kind: "library-model",
      assetSceneId: "a",
      startMs: 5000,
      endMs: 10000,
      cueMs: 5500,
      title: "Libro",
      labels: ["A", "B", "C"],
    };
    expect(EvidenceSceneSchema.safeParse(base).success).toBe(false);
    const model = {
      id: "book",
      provider: "polyhaven",
      src: "library/book.glb",
      sha256: "a".repeat(64),
      sourceUrl: "https://polyhaven.com/a/book",
      creator: "Artist",
      license: "CC0",
    };
    const result = planNativeThreeD({
      enabled: true,
      durationMs: 40000,
      scenes: [{ id: "a", ruleId: "doctrina", startMs: 5000, endMs: 10000 }],
      words: [{ text: "doctrina", startMs: 5500, endMs: 6000 }],
      models: { '["a",5000,10000]': { model, title: "Estudiar" } },
    });
    expect(result.plan.scenes[0]).toMatchObject({
      kind: "library-model",
      startMs: 5000,
      endMs: 10000,
      cueMs: 5500,
      model,
    });
  });
});

describe("real media and resolver pipeline", () => {
  it("advances to another page when top candidates are copies of recent material", async () => {
    noRemote();
    const dir = temporary();
    const repeated = path.join(dir, "repeated.jpg"),
      fresh = path.join(dir, "fresh.jpg");
    for (const [file, source] of [
      [repeated, "testsrc2"],
      [fresh, "smptebars"],
    ]) {
      execFileSync("ffmpeg", [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        `${source}=size=720x1280:rate=1`,
        "-frames:v",
        "1",
        file,
      ]);
    }
    const history = await inspectMedia(repeated, "image");
    const memory = new VisualMemory("next", dir);
    memory.assets = [
      {
        provider: "pixabay",
        providerId: "old",
        mediaType: "image",
        sourceUrl: "https://example.org/old",
        creator: "Other",
        lastProductionCode: "previous",
        lastUsedAt: "2026-09-30T00:00:00Z",
        useCount: 1,
        ...history,
      },
    ];
    const source = new MultiSourceProvider(
      new SearchCache(path.join(dir, "cache")),
      { pexels: undefined, pixabay: undefined },
    );
    const search = vi
      .spyOn(source, "search")
      .mockImplementation(async (_query, _kind, _duration, page) =>
        (page === 1
          ? Array.from({ length: 7 }, (_, i) => String(i))
          : ["new"]
        ).map((id) =>
          asset(id, {
            localPath: id === "new" ? fresh : repeated,
            altText: "documents",
            width: 720,
            height: 1280,
          }),
        ),
      );
    const selector = new VisualSelector(memory, source, dir);
    const selected = await selector.select(
      {
        ruleId: "expediente",
        concept: "documents",
        narrationContext: "documents",
        durationMs: 1000,
      },
      ["documents"],
      "image",
      dir,
    );
    expect(selected?.asset.providerId).toBe("new");
    expect(search.mock.calls.map((call) => call[3])).toEqual([1, 2]);
    expect(
      selector.events.some((e) =>
        e.includes("page-1-inspection-budget-reached"),
      ),
    ).toBe(true);
  });
  it("probes duration and fingerprints actual video frames", async () => {
    const dir = temporary(),
      file = path.join(dir, "clip.mp4");
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=540x960:rate=10",
      "-t",
      "1",
      "-pix_fmt",
      "yuv420p",
      file,
    ]);
    const actual = await inspectMedia(file, "video");
    expect(actual.durationMs).toBeGreaterThanOrEqual(1000);
    expect(actual.fingerprints).toHaveLength(3);
    expect(actual.width).toBe(540);
  });
  it("renders the asset manifest offline from the local library and stops a recent duplicate", () => {
    noRemote();
    const dir = temporary();
    mkdirSync(path.join(dir, "public/library"), { recursive: true });
    mkdirSync(path.join(dir, "public/generated"), { recursive: true });
    mkdirSync(path.join(dir, "content/visual-library"), { recursive: true });
    mkdirSync(path.join(dir, "examples"));
    const file = path.join(dir, "public/library/document.jpg");
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=720x1280:rate=1",
      "-frames:v",
      "1",
      file,
    ]);
    const entry = {
      id: "own-documents",
      provider: "own",
      mediaType: "image",
      file: "library/document.jpg",
      sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
      title: "documentos expediente",
      tags: ["documentos", "expediente"],
      sourceUrl: "https://example.org/own",
      creator: "Test",
      license: "Owned",
      licenseUrl: "https://example.org/license",
      review: { status: "approved", reviewer: "Test", date: "2026-10-01" },
      width: 720,
      height: 1280,
    };
    writeFileSync(
      path.join(dir, "content/visual-library/catalog.json"),
      JSON.stringify({ version: "2.0", assets: [entry] }),
    );
    const run = (code: string) => {
      writeFileSync(
        path.join(dir, `examples/${code}.video.json`),
        JSON.stringify({ ...pilot, id: code, threeD: undefined }),
      );
      writeFileSync(
        path.join(dir, `public/generated/${code}-asset-scene-plan.json`),
        JSON.stringify({
          productionCode: code,
          scenes: [
            {
              id: "proof",
              ruleId: "expediente",
              startMs: 0,
              endMs: 4000,
              durationMs: 4000,
              route: "DOCUMENT_OBJECT",
              concept: "expediente",
              narrationContext: "Examinar documentos",
              mediaIntent: "photo",
            },
          ],
        }),
      );
      return execFileSync(
        process.execPath,
        [
          "--import",
          path.join(root, "node_modules/tsx/dist/loader.mjs"),
          path.join(root, "scripts/build-resolved-assets.ts"),
        ],
        {
          cwd: dir,
          encoding: "utf8",
          timeout: 30000,
          env: {
            ...process.env,
            PRODUCTION_CODE: code,
            PEXELS_API_KEY: "",
            PIXABAY_API_KEY: "",
            SUPABASE_URL: "",
            SUPABASE_SECRET_KEY: "",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    };
    expect(run("video-test-001")).toContain("LOCAL-FALLBACK");
    const manifest = JSON.parse(
      readFileSync(
        path.join(dir, "public/generated/video-test-001-resolved-assets.json"),
        "utf8",
      ),
    );
    expect(manifest.mediaSummary.images).toBe(1);
    expect(manifest.assets[0]).toMatchObject({
      startMs: 0,
      endMs: 4000,
      asset: { provider: "own" },
    });
    expect(() => run("video-test-002")).toThrow();
    expect(run("video-test-001")).toContain("VISUAL LIBRARY V2");
  }, 30000);
});
