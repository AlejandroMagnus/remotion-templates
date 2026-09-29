import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  reviewHumanValue,
  type HumanValuePlan,
  type HumanValueVideo,
} from "../src/content/HumanValueDirector";
import type { SilecKnowledgeInput } from "../src/content/SilecContentAdapter";

type AssetManifest = {
  productionCode: string;
  assets: Array<{
    sceneId?: string;
    asset?: {
      provider?: string;
      providerId?: string;
      sourceUrl?: string;
      creator?: string;
    } | null;
  }>;
};

export function runHumanValueReview(
  root: string,
  code: string,
  phase: "script" | "final",
) {
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(code))
    throw new Error("Código de producción inválido.");
  const generated = path.join(root, "public", "generated");
  const read = <T>(name: string): T =>
    JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
  const input = read<SilecKnowledgeInput>(`content/${code}.silec.json`);
  const plan = read<HumanValuePlan>(
    `public/generated/${code}-human-value-plan.json`,
  );
  const video = read<HumanValueVideo>(`examples/${code}.video.json`);
  const review = reviewHumanValue(input, plan, video);
  const resources: Array<Record<string, unknown>> = [];
  const nonempty = (name: string) => {
    const file = path.join(generated, name);
    return fs.existsSync(file) && fs.statSync(file).size > 0;
  };
  if (phase === "final") {
    for (const suffix of [
      "-narration.mp3",
      "-timeline.json",
      ".srt",
      "-resolved-assets.json",
    ]) {
      if (!nonempty(`${code}${suffix}`))
        review.blockers.push(
          `Falta el recurso de coordinación: ${code}${suffix}`,
        );
    }
    if (nonempty(`${code}-resolved-assets.json`)) {
      const manifest = read<AssetManifest>(
        `public/generated/${code}-resolved-assets.json`,
      );
      if (manifest.productionCode !== code || !Array.isArray(manifest.assets)) {
        review.blockers.push(
          "El manifiesto de imágenes no corresponde a esta producción o es inválido.",
        );
      } else {
        for (const item of manifest.assets) {
          resources.push({
            sceneId: item.sceneId ?? null,
            provider: item.asset?.provider ?? null,
            sourceUrl: item.asset?.sourceUrl ?? null,
            creator: item.asset?.creator ?? null,
            rightsStatus: "pending-contextual-review",
          });
        }
      }
    }
  }
  const report = {
    ...review,
    phase,
    automatedStatus: review.blockers.length
      ? "blocked"
      : "structural-checks-passed",
    viewerBenefit: plan.attentionReturn,
    resources,
    audiovisualReview:
      phase === "final"
        ? "resources-checked-visual-review-pending"
        : "not-yet-generated",
    rightsReview: "pending-for-images-voice-music-fonts-and-other-materials",
    originalityAudit: nonempty(`${code}-editorial-memory.json`)
      ? `public/generated/${code}-editorial-memory.json`
      : "pending",
  };
  fs.mkdirSync(generated, { recursive: true });
  const prefix = path.join(generated, `${code}-human-value-${phase}-review`);
  fs.writeFileSync(`${prefix}.json`, JSON.stringify(report, null, 2) + "\n");
  const escaped = (text: string) =>
    text.replace(/[<>|]/g, " ").replace(/\s+/g, " ");
  const markdown = [
    `## Valor humano — ${code} (${phase === "script" ? "guion" : "antes del render"})`,
    "",
    `**Qué obtiene el espectador:** ${escaped(plan.takeaway)}`,
    "",
    `Beneficio: ${plan.benefit}. Necesidad: ${escaped(plan.need)}`,
    "",
    `Controles estructurales: **${review.blockers.length ? "bloqueado" : "superados"}**.`,
    `Revisión jurídica de la fuente: **${review.specialistReview.status}**.`,
    "Revisión de derechos y evaluación editorial de la pieza: pendientes; este informe no autoriza su publicación.",
    "",
    ...review.blockers.map((item) => `- Error: ${escaped(item)}`),
    ...review.signals.map((item) => `- Revisar: ${escaped(item)}`),
    "",
    "### Revisar antes de entregar al público",
    "",
    ...review.reviewBeforePublication.map((item) => `- [ ] ${item}`),
    "",
  ].join("\n");
  fs.writeFileSync(`${prefix}.md`, markdown);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + "\n");
  return report;
}

function main() {
  const code = process.argv[2] ?? process.env.PRODUCTION_CODE ?? "";
  const phase = process.argv[3] ?? "script";
  if (phase !== "script" && phase !== "final")
    throw new Error("Fase inválida: script | final.");
  const report = runHumanValueReview(process.cwd(), code, phase);
  console.log(
    `VALOR HUMANO: ${report.automatedStatus}. Informe: ${code}-human-value-${phase}-review.json`,
  );
  if (report.blockers.length) {
    console.error(report.blockers.join("\n"));
    process.exitCode = 1;
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
