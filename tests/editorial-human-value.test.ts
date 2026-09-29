import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildHumanValuePlan,
  reviewHumanValue,
} from "../src/content/HumanValueDirector";
import {
  buildSilecStrategicPacket,
  type SilecKnowledgeInput,
} from "../src/content/SilecContentAdapter";
import { CREATIVE_PROFILE_CATALOG } from "../src/strategy/CreativeDiversityDirector";
import {
  legalReviewIssue,
  reviewedContentHash,
} from "../src/strategy/EditorialCatalog";
import { buildEditorialAutoRefill } from "../src/strategy/EditorialAutoRefill";
import { buildVideoContent } from "../scripts/build-autonomous-video-spec";
import { runHumanValueReview } from "../scripts/review-human-value";
import { VideoSpecSchema } from "../src/schema";
import { fixture, resignFixture } from "./editorial-fixtures";

function source(category: "FI" | "DT" | "HT" = "FI"): SilecKnowledgeInput {
  const card = fixture(1, category);
  card.reasoningChain = [
    "Primer paso de la explicación",
    "Segundo paso con un ejemplo",
    "Tercer paso de comprobación",
    "Cuarto paso de contraste",
    "Quinto paso de síntesis",
    "Sexto paso aplicable",
  ];
  return { ...resignFixture(card), productionCode: "human-value-fixture" };
}
function build(input = source(), profile = CREATIVE_PROFILE_CATALOG[0]) {
  const content = buildVideoContent(input, profile);
  return {
    ...content,
    video: {
      id: input.productionCode,
      audio: { narrationText: content.narration },
      scenes: content.scenes,
    },
  };
}
const temporary: string[] = [];
afterEach(() => {
  for (const root of temporary.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

describe("human value in the production pipeline", () => {
  it.each(CREATIVE_PROFILE_CATALOG)(
    "keeps meaningful source content through $narrativeArchitecture",
    (profile) => {
      const input = source();
      const original = JSON.stringify(input);
      const { video, plan } = build(input, profile);
      expect(reviewHumanValue(input, plan, video).blockers).toEqual([]);
      expect(video.audio.narrationText).toContain(input.conclusion);
      expect(video.audio.narrationText).not.toContain(input.cta);
      expect(JSON.stringify(video.scenes)).not.toContain(
        input.capabilityDemonstrated[0],
      );
      expect(video.scenes.every((scene) => scene.timing.durationMs > 0)).toBe(
        true,
      );
      expect(JSON.stringify(input)).toBe(original);
      expect(legalReviewIssue(input)).toBeNull();
    },
  );

  it("retains the exact source claims and legal review hash in the strategic packet", () => {
    const input = source();
    const packet = buildSilecStrategicPacket(input);
    expect(packet.humanValue?.takeaway).toBe(input.conclusion);
    expect(packet.audiovisual.narrativePromise).toBe(input.conclusion);
    expect(
      reviewedContentHash({
        ...packet.knowledge,
        ...packet.strategicObjective,
        ...packet.audiovisual,
        editorial: packet.editorial,
      }),
    ).toBe(input.editorial?.legalReview?.contentHash);
    expect(packet.source.legalVerificationRequired).toBe(false);
  });

  it("makes commercial endings conditional and honors specific direction", () => {
    for (const category of ["FI", "DT", "HT"] as const) {
      const input = source(category);
      expect(build(input).narration.includes(input.cta)).toBe(
        category === "HT",
      );
      input.humanValue = { benefit: "enseñar", ctaMode: "source" };
      expect(build(input).plan.benefit).toBe("enseñar");
      expect(build(input).narration).toContain(input.cta);
      input.humanValue.ctaMode = "none";
      expect(build(input).narration).not.toContain(input.cta);
    }
  });

  it("blocks stale plans, mismatched production and missing substantive development", () => {
    const input = source();
    const { plan, video } = build(input);
    expect(
      reviewHumanValue(
        { ...input, problem: "Cambio de necesidad" },
        plan,
        video,
      ).blockers.length,
    ).toBeGreaterThan(0);
    expect(
      reviewHumanValue(input, plan, { ...video, id: "another-video" }).blockers
        .length,
    ).toBeGreaterThan(0);
    expect(
      reviewHumanValue(input, plan, {
        ...video,
        audio: { narrationText: input.hook },
      }).blockers.length,
    ).toBeGreaterThan(0);
    const repeated = { ...input, reasoningChain: ["Lo mismo", "Lo mismo"] };
    expect(
      reviewHumanValue(
        repeated,
        buildHumanValuePlan(repeated),
        build(repeated).video,
      ).blockers.length,
    ).toBeGreaterThan(0);
    expect(() =>
      buildHumanValuePlan({
        ...input,
        humanValue: { benefit: "fake" as "ayudar" },
      }),
    ).toThrow();
  });

  it("does not certify generic drafts, rights or contextual claims", () => {
    const input = source();
    delete input.editorial!.legalReview;
    input.editorial!.productionGate = "draft-render-ok";
    input.reasoningChain.push("No existen garantías de viralidad.");
    const { plan, video } = build(input);
    const review = reviewHumanValue(input, plan, video);
    expect(review.blockers).toEqual([]);
    expect(review.signals.length).toBeGreaterThan(0);
    expect(review.specialistReview.status).toBe("pending");
    expect(review.publicationApproval).toBe("not-granted-by-this-check");
    expect(
      buildSilecStrategicPacket(input).source.legalVerificationRequired,
    ).toBe(true);
  });

  it("accepts current automatically generated source structure without approving its law", () => {
    const opportunities = buildEditorialAutoRefill().slice(0, 12);
    for (const opportunity of opportunities) {
      const input = { ...opportunity, productionCode: "human-value-fixture" };
      const { plan, video } = build(input);
      const review = reviewHumanValue(input, plan, video);
      expect(review.blockers).toEqual([]);
      expect(review.specialistReview.status).toBe("pending");
    }
  });

  it("runs the actual builder and both reviews without changing timing or 3D assets", () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "human-value-pipeline-"),
    );
    temporary.push(root);
    const input = source();
    const code = input.productionCode;
    const generated = path.join(root, "public/generated");
    fs.mkdirSync(generated, { recursive: true });
    fs.mkdirSync(path.join(root, "content"));
    fs.writeFileSync(
      path.join(root, `content/${code}.silec.json`),
      JSON.stringify(input),
    );
    fs.writeFileSync(
      path.join(generated, `${code}-creative-decision.json`),
      JSON.stringify({
        productionCode: code,
        selected: CREATIVE_PROFILE_CATALOG[0],
      }),
    );
    execFileSync(
      process.execPath,
      [
        "--import",
        createRequire(import.meta.url).resolve("tsx"),
        path.resolve("scripts/build-autonomous-video-spec.ts"),
        code,
      ],
      { cwd: root },
    );
    const specFile = path.join(root, `examples/${code}.video.json`);
    const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
    expect(VideoSpecSchema.safeParse(spec).success).toBe(true);
    expect(runHumanValueReview(root, code, "script").automatedStatus).toBe(
      "structural-checks-passed",
    );
    expect(runHumanValueReview(root, code, "final").automatedStatus).toBe(
      "blocked",
    );

    const resources = {
      [`${code}-timeline.json`]: JSON.stringify({
        words: [{ text: "palabra", startMs: 100, endMs: 600 }],
      }),
      [`${code}.srt`]: "1\n00:00:00,100 --> 00:00:00,600\npalabra\n",
      [`${code}-narration.mp3`]:
        "TEST ONLY: resource-presence fixture, not an MP3",
      [`${code}-three-d-plan.json`]: JSON.stringify({
        enabled: true,
        scenes: [],
      }),
      [`${code}-resolved-assets.json`]: JSON.stringify({
        productionCode: code,
        assets: [
          {
            sceneId: spec.scenes[0].id,
            asset: { provider: "native-three", sourceUrl: "local-scene" },
          },
        ],
      }),
    };
    for (const [name, text] of Object.entries(resources))
      fs.writeFileSync(path.join(generated, name), text);
    const report = runHumanValueReview(root, code, "final");
    expect(report.automatedStatus).toBe("structural-checks-passed");
    expect(report.resources[0].rightsStatus).toBe("pending-contextual-review");
    for (const [name, text] of Object.entries(resources))
      expect(fs.readFileSync(path.join(generated, name), "utf8")).toBe(text);
    expect(JSON.parse(fs.readFileSync(specFile, "utf8"))).toEqual(spec);
  });

  it("enforces checks before voice and rendering and preserves the audit artifacts in CI", () => {
    const workflow = fs.readFileSync(".github/workflows/main.yml", "utf8");
    expect(
      workflow.indexOf(
        'scripts/review-human-value.ts "${PRODUCTION_CODE}" script',
      ),
    ).toBeLessThan(
      workflow.indexOf("python3 scripts/human_voice_performance_director.py"),
    );
    expect(
      workflow.indexOf(
        'scripts/review-human-value.ts "${PRODUCTION_CODE}" final',
      ),
    ).toBeLessThan(workflow.indexOf("npm run video:render"));
    expect(workflow).toContain("public/generated/*-human-value-*.json");
    expect(workflow).toContain("public/generated/*-human-value-*.md");
  });
});
