import fs from "node:fs";
import path from "node:path";
import {
  loadEditorialMemoryRows,
  normalizeSupabaseRestUrl,
} from "../src/strategy/EditorialMemoryStore";

const VERSION = "NARRATIVE-NOVELTY-GATE-V2";
const HARD_LIMIT = 0.5;
const OPENING_LIMIT = 0.72;

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const normalize = (value: string) =>
  clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñáéíóúü¿? ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set([
  "a",
  "al",
  "algo",
  "ante",
  "como",
  "con",
  "de",
  "del",
  "desde",
  "el",
  "ella",
  "en",
  "es",
  "esta",
  "este",
  "esto",
  "la",
  "las",
  "lo",
  "los",
  "para",
  "pero",
  "por",
  "que",
  "se",
  "sin",
  "su",
  "sus",
  "un",
  "una",
  "y",
  "ya",
]);

function tokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP.has(token));
}

function ngrams(items: string[], size: number): Set<string> {
  const result = new Set<string>();
  for (let index = 0; index <= items.length - size; index += 1) {
    result.add(items.slice(index, index + size).join(" "));
  }
  return result;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function sentenceLeads(value: string): Set<string> {
  const sentences = clean(value)
    .split(/(?<=[.!?])\s+/)
    .slice(0, 6);
  return new Set(
    sentences
      .map((sentence) => normalize(sentence).split(" ").slice(0, 4).join(" "))
      .filter(Boolean),
  );
}

function similarity(current: string, prior: string) {
  const a = tokens(current);
  const b = tokens(prior);
  const tokenScore = jaccard(new Set(a), new Set(b));
  const bigramScore = jaccard(ngrams(a, 2), ngrams(b, 2));
  const trigramScore = jaccard(ngrams(a, 3), ngrams(b, 3));
  const leadScore = jaccard(sentenceLeads(current), sentenceLeads(prior));
  const openingA = a.slice(0, 24);
  const openingB = b.slice(0, 24);
  const openingScore = jaccard(ngrams(openingA, 2), ngrams(openingB, 2));
  const score =
    tokenScore * 0.15 +
    bigramScore * 0.3 +
    trigramScore * 0.3 +
    leadScore * 0.15 +
    openingScore * 0.1;
  return {
    score,
    openingScore,
    tokenScore,
    bigramScore,
    trigramScore,
    leadScore,
  };
}

async function main() {
  const productionCode =
    process.argv[2]?.trim() || process.env.PRODUCTION_CODE?.trim();
  if (!productionCode) throw new Error("Production code no definido.");

  const specPath = path.resolve("examples", `${productionCode}.video.json`);
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8")) as {
    audio?: { narrationText?: string };
  };
  const narration = clean(spec.audio?.narrationText ?? "");
  if (!narration) throw new Error("VideoSpec sin audio.narrationText.");

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!supabaseUrl || !secret)
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY.");

  const restUrl = normalizeSupabaseRestUrl(supabaseUrl);
  const request = (url: string) =>
    fetch(url, {
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
      },
    });

  const memory = await loadEditorialMemoryRows(restUrl, request);
  const excludedStatuses = new Set([
    "planned",
    "draft",
    "failed",
    "cancelled",
    "canceled",
    "rejected",
    "queued",
    "rendering",
  ]);
  const recent = memory
    .filter((item) => item.contentCode !== productionCode)
    .filter(
      (item) => !excludedStatuses.has(item.status?.trim().toLowerCase() ?? ""),
    )
    .filter((item) => Boolean(item.narrationText?.trim()))
    .slice(-20);

  const comparisons = recent
    .map((item) => ({
      contentCode: item.contentCode,
      ...similarity(narration, item.narrationText ?? ""),
    }))
    .sort((a, b) => b.score - a.score);

  const closest = comparisons[0] ?? null;
  const approved =
    !closest ||
    (closest.score < HARD_LIMIT && closest.openingScore < OPENING_LIMIT);

  const artifact = {
    version: VERSION,
    productionCode,
    approved,
    limits: { overall: HARD_LIMIT, opening: OPENING_LIMIT },
    comparedAgainst: comparisons.length,
    closest,
    top: comparisons.slice(0, 5),
  };

  const output = path.resolve(
    "public",
    "generated",
    `${productionCode}-narrative-novelty.json`,
  );
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(artifact, null, 2) + "\n");

  console.log(`${VERSION}: ${approved ? "PASS" : "RETRY"}`);
  if (closest) {
    console.log(
      `Más parecido: ${closest.contentCode} | score=${closest.score.toFixed(3)} | opening=${closest.openingScore.toFixed(3)}`,
    );
  }

  if (!approved) process.exit(42);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
  process.exit(1);
});
