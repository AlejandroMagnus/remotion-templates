import fs from "node:fs";
import path from "node:path";
import {
  AUTHORSHIP_AUDIT_VERSION,
  auditAuthorshipSingularity,
  type AuditStage,
  type CurrentPiece,
  type MemoryRecord,
} from "../src/audit/AuthorshipSingularityAudit";

type SupabaseRow = {
  content_code?: string | null;
  topic?: string | null;
  objective?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function optionalJson(file: string): unknown {
  return fs.existsSync(file) ? readJson<unknown>(file) : undefined;
}

function productionCode(): string {
  const value = process.argv[2]?.trim() || process.env.PRODUCTION_CODE?.trim();
  if (!value) {
    throw new Error(
      "Production code no definido. Uso: npx tsx scripts/audit-authorship-singularity.ts <codigo> [script|final]",
    );
  }
  return value;
}

function stage(): AuditStage {
  const value = (process.argv[3] ?? "script").trim();
  if (value !== "script" && value !== "final") {
    throw new Error(`Stage inválido: ${value}`);
  }
  return value;
}

function normalizeRestUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "")
    .concat("/rest/v1");
}

function decodeMemory(row: SupabaseRow): MemoryRecord {
  const objective = row.objective?.trim() ?? "";

  if (objective.startsWith("{")) {
    const parsed = JSON.parse(objective) as {
      version?: string;
      record?: {
        thesis?: string | null;
        narrationText?: string | null;
      };
    };

    if (parsed.version === "QINFINITY-EDITORIAL-MEMORY-2" && parsed.record) {
      return {
        contentCode: row.content_code ?? "",
        topic: row.topic ?? "",
        thesis: parsed.record.thesis ?? "",
        narrationText: parsed.record.narrationText ?? "",
        status: row.status,
        publishedAt: row.updated_at,
      };
    }
  }

  const [thesis = "", _subthesis = "", ...narration] = objective.split(" | ");

  return {
    contentCode: row.content_code ?? "",
    topic: row.topic ?? "",
    thesis,
    narrationText: narration.join(" | "),
    status: row.status,
    publishedAt: row.updated_at,
  };
}

async function loadMemory(code: string): Promise<MemoryRecord[]> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!supabaseUrl || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SECRET_KEY no definidos. La auditoría no puede certificar originalidad sin memoria.",
    );
  }

  const rest = normalizeRestUrl(supabaseUrl);
  const url =
    `${rest}/content_items` +
    "?select=content_code,topic,objective,status,updated_at" +
    "&channel_id=eq.3" +
    "&order=updated_at.desc,id.desc" +
    "&limit=120";

  const response = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo leer memoria editorial: HTTP ${response.status}`,
    );
  }

  const rows = (await response.json()) as SupabaseRow[];

  return rows
    .map(decodeMemory)
    .filter((item) => item.contentCode && item.contentCode !== code)
    .filter((item) =>
      /render|publish|complete|done|approved/i.test(item.status ?? ""),
    )
    .filter((item) => item.thesis || item.narrationText)
    .slice(0, 20);
}

function stringifySceneContent(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function buildPiece(root: string, code: string): CurrentPiece {
  const source = readJson<Record<string, unknown>>(
    path.join(root, "content", `${code}.silec.json`),
  );

  const spec = readJson<Record<string, unknown>>(
    path.join(root, "examples", `${code}.video.json`),
  );

  const audio = (spec.audio as Record<string, unknown> | undefined) ?? {};

  const rawScenes = Array.isArray(spec.scenes)
    ? (spec.scenes as Array<Record<string, unknown>>)
    : [];

  const reasoningChain = Array.isArray(source.reasoningChain)
    ? source.reasoningChain.map(String)
    : [];

  return {
    productionCode: code,
    topic: String(source.topic ?? ""),
    thesis: String(source.centralThesis ?? ""),
    problem: String(source.problem ?? ""),
    conclusion: String(source.conclusion ?? ""),
    hook: String(source.hook ?? ""),
    closingIdea: String(source.closingIdea ?? ""),
    reasoningChain,
    narration: String(audio.narrationText ?? ""),
    scenes: rawScenes.map((scene) => ({
      id: typeof scene.id === "string" ? scene.id : undefined,
      type: typeof scene.type === "string" ? scene.type : undefined,
      title:
        typeof scene.title === "string"
          ? scene.title
          : typeof scene.name === "string"
            ? scene.name
            : undefined,
      content:
        "content" in scene ? stringifySceneContent(scene.content) : undefined,
    })),
    creativeDecision: optionalJson(
      path.join(root, "public/generated", `${code}-creative-decision.json`),
    ),
    prosodyPlan: optionalJson(
      path.join(root, "public/generated", `${code}-prosody-plan.json`),
    ),
    resolvedAssets: optionalJson(
      path.join(root, "public/generated", `${code}-resolved-assets.json`),
    ),
  };
}

function markdown(
  result: ReturnType<typeof auditAuthorshipSingularity>,
): string {
  const d = result.dimensions;
  const line = (name: string, value: number) => `| ${name} | ${value}/100 |`;

  return [
    `# Auditoría de Autoría y Singularidad — ${result.productionCode}`,
    "",
    `**Versión:** ${result.version}`,
    `**Etapa:** ${result.stage}`,
    `**Estado:** ${result.status.toUpperCase()}`,
    `**Puntuación total:** ${result.score}/100`,
    "",
    "## Dimensiones",
    "",
    "| Dimensión | Resultado |",
    "|---|---:|",
    line("Diferenciación conceptual", d.conceptualDistinctiveness),
    line("Especificidad", d.specificity),
    line("Originalidad de apertura", d.openingOriginality),
    line("Originalidad estructural", d.structuralOriginality),
    line("Originalidad de cierre", d.closingOriginality),
    line("Valor práctico", d.practicalValue),
    line("Identidad visual", d.visualIdentity),
    line("Voz autoral", d.authorialVoice),
    "",
    "## Bloqueadores",
    ...(result.blockers.length
      ? result.blockers.map((item) => `- ${item}`)
      : ["- Ninguno."]),
    "",
    "## Advertencias",
    ...(result.warnings.length
      ? result.warnings.map((item) => `- ${item}`)
      : ["- Ninguna."]),
    "",
    "## Máximas similitudes",
    `- Tesis: ${result.maxima.thesisSimilarity?.contentCode ?? "sin referencia"} — ${Math.round((result.maxima.thesisSimilarity?.score ?? 0) * 100)}%`,
    `- Narración: ${result.maxima.narrationSimilarity?.contentCode ?? "sin referencia"} — ${Math.round((result.maxima.narrationSimilarity?.score ?? 0) * 100)}%`,
    `- Apertura: ${result.maxima.openingSimilarity?.contentCode ?? "sin referencia"} — ${Math.round((result.maxima.openingSimilarity?.score ?? 0) * 100)}%`,
    `- Cierre: ${result.maxima.closingSimilarity?.contentCode ?? "sin referencia"} — ${Math.round((result.maxima.closingSimilarity?.score ?? 0) * 100)}%`,
    `- Estructura: ${result.maxima.structuralSimilarity?.contentCode ?? "sin referencia"} — ${Math.round((result.maxima.structuralSimilarity?.score ?? 0) * 100)}%`,
    "",
    "## Regla de aprobación",
    "",
    "La pieza solo avanza si demuestra distancia conceptual, especificidad temática, apertura y estructura propias y una gramática visual no genérica.",
    "",
  ].join("\n");
}

async function main() {
  const root = process.cwd();
  const code = productionCode();
  const currentStage = stage();

  const piece = buildPiece(root, code);
  // AUTHORIAL-AUDIT-AWARE-V1
  const authorialPath = path.join(
    root,
    "public/generated",
    `${code}-authorial-plan.json`,
  );

  if (fs.existsSync(authorialPath)) {
    const authorial = readJson<{
      sourceBound?: boolean;
      authorialThesis?: string;
      reasoningChain?: string[];
    }>(authorialPath);

    if (
      authorial.sourceBound === true &&
      typeof authorial.authorialThesis === "string" &&
      authorial.authorialThesis.trim()
    ) {
      piece.thesis = authorial.authorialThesis.trim();
    }

    if (Array.isArray(authorial.reasoningChain)) {
      piece.reasoningChain = authorial.reasoningChain
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  const memory = await loadMemory(code);

  const result = auditAuthorshipSingularity(piece, memory, currentStage);

  const generated = path.join(root, "public/generated");
  fs.mkdirSync(generated, { recursive: true });

  const jsonPath = path.join(generated, `${code}-authorship-audit.json`);
  const mdPath = path.join(generated, `${code}-authorship-audit.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  fs.writeFileSync(mdPath, markdown(result), "utf8");

  console.log("============================================================");
  console.log(`AUDITORÍA ${AUTHORSHIP_AUDIT_VERSION}`);
  console.log(`Production: ${code}`);
  console.log(`Stage: ${currentStage}`);
  console.log(`Score: ${result.score}/100`);
  console.log(`Status: ${result.status.toUpperCase()}`);
  console.log(`Memory compared: ${result.diagnostics.memoryCount}`);
  console.log("============================================================");

  if (result.blockers.length) {
    for (const blocker of result.blockers) {
      console.error(`BLOCKER: ${blocker}`);
    }
    process.exitCode = 1;
  } else {
    console.log("✅ AUTORÍA Y SINGULARIDAD: APROBADO");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
