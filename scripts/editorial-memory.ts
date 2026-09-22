import fs from "node:fs";
import path from "node:path";

import {
  compareWithEditorialMemory,
  type EditorialMemoryItem,
} from "../src/strategy/EditorialMemory";

import type {
  QInfinityStrategicContentPacket,
} from "../src/strategy/QInfinityStrategicContentPacket";

/**
 * V3.16-B — EDITORIAL MEMORY / SUPABASE ADAPTER
 *
 * Funciones:
 * 1. PRECHECK:
 *    consulta memoria editorial histórica;
 *    detecta duplicidad o similitud excesiva;
 *    genera decisión editorial.
 *
 * 2. REGISTER:
 *    registra en Supabase el contenido producido.
 *
 * NO genera assets.
 * NO renderiza.
 * NO modifica el Director Audiovisual.
 */

type Mode =
  | "precheck"
  | "register";

type SupabaseContentItem = {
  id: number;
  content_code: string;
  channel_id: number;
  topic: string | null;
  format: string | null;
  objective: string | null;
  status: string | null;
  qa_score: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const LEGAL_CHANNEL_ID = 3;

function normalizeSupabaseRestUrl(
  value: string,
): string {
  const clean =
    value.trim().replace(/\/+$/, "");

  if (
    clean.endsWith("/rest/v1")
  ) {
    return clean;
  }

  return `${clean}/rest/v1`;
}

function getSupabaseConfig() {
  const rawUrl =
    process.env.SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!rawUrl) {
    throw new Error(
      "Missing SUPABASE_URL.",
    );
  }

  if (!secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY.",
    );
  }

  return {
    restUrl:
      normalizeSupabaseRestUrl(
        rawUrl,
      ),

    secretKey,
  };
}

async function supabaseRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const {
    restUrl,
    secretKey,
  } = getSupabaseConfig();

  const response =
    await fetch(
      `${restUrl}/${endpoint}`,
      {
        ...options,

        headers: {
          apikey:
            secretKey,

          Authorization:
            `Bearer ${secretKey}`,

          "Content-Type":
            "application/json",

          ...(options.headers ??
            {}),
        },
      },
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      [
        "Supabase editorial-memory request failed.",
        `HTTP ${response.status}`,
        body,
      ].join("\n"),
    );
  }

  const text =
    await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(
    text,
  ) as T;
}

function readJson<T>(
  filePath: string,
): T {
  if (
    !fs.existsSync(
      filePath,
    )
  ) {
    throw new Error(
      `File not found: ${filePath}`,
    );
  }

  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8",
    ),
  ) as T;
}

function strategicPacketPath(
  productionCode: string,
): string {
  return path.join(
    process.cwd(),
    "public",
    "generated",
    `${productionCode}-strategic-content.json`,
  );
}

function editorialDecisionPath(
  productionCode: string,
): string {
  return path.join(
    process.cwd(),
    "public",
    "generated",
    `${productionCode}-editorial-memory.json`,
  );
}

async function loadEditorialMemory(
  productionCode: string,
): Promise<
  EditorialMemoryItem[]
> {
  const rows =
    await supabaseRequest<
      SupabaseContentItem[]
    >(
      [
        "content_items",
        "?select=id,content_code,channel_id,topic,format,objective,status,qa_score,created_at,updated_at",
        `&channel_id=eq.${LEGAL_CHANNEL_ID}`,
        `&content_code=neq.${encodeURIComponent(
          productionCode,
        )}`,
        "&order=created_at.desc",
      ].join(""),
    );

  return rows.map(
    (
      row,
    ): EditorialMemoryItem => ({
      id: row.id,

      contentCode:
        row.content_code,

      topic:
        row.topic ??
        "",

      title:
        row.topic,

      thesis:
        row.objective,

      subthesis:
        null,

      narrationText:
        null,

      concepts: [
        row.topic ??
          "",
        row.objective ??
          "",
      ].filter(Boolean),

      semanticFingerprint:
        null,

      sourceSystem:
        "Supabase Editorial Memory",

      sourceReference:
        "content_items",

      status:
        row.status,

      publishedAt:
        row.created_at ??
        null,
    }),
  );
}

async function runPrecheck(
  productionCode: string,
) {
  const packetFile =
    strategicPacketPath(
      productionCode,
    );

  const packet =
    readJson<
      QInfinityStrategicContentPacket
    >(packetFile);

  if (
    packet.productionCode !==
    productionCode
  ) {
    throw new Error(
      [
        "Production code mismatch.",
        `CLI: ${productionCode}`,
        `Packet: ${packet.productionCode}`,
      ].join("\n"),
    );
  }

  const memory =
    await loadEditorialMemory(
      productionCode,
    );

  const decision =
    compareWithEditorialMemory(
      packet,
      memory,
    );

  const output =
    editorialDecisionPath(
      productionCode,
    );

  fs.mkdirSync(
    path.dirname(output),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    output,
    JSON.stringify(
      {
        version:
          "V3.16-B-EDITORIAL-MEMORY",

        productionCode,

        checkedAt:
          new Date().toISOString(),

        historicalItems:
          memory.length,

        ...decision,
      },
      null,
      2,
    ),
  );

  console.log(
    "=== V3.16-B EDITORIAL MEMORY PRECHECK ===",
  );

  console.log(
    `Production: ${productionCode}`,
  );

  console.log(
    `Historical items: ${memory.length}`,
  );

  console.log(
    `Novelty: ${decision.noveltyLevel}`,
  );

  console.log(
    `Novelty score: ${decision.noveltyScore}`,
  );

  console.log(
    `Highest similarity: ${decision.highestSimilarity}`,
  );

  console.log(
    `Closest production: ${
      decision.closestContentCode ??
      "none"
    }`,
  );

  console.log(
    `Recommendation: ${decision.recommendation}`,
  );

  console.log(
    `Decision file: ${output}`,
  );

  if (!decision.approved) {
    throw new Error(
      [
        "EDITORIAL PRECHECK BLOCKED PRODUCTION.",
        `Reason: ${decision.reasons.join(
          " ",
        )}`,
        `Recommendation: ${decision.recommendation}`,
      ].join("\n"),
    );
  }

  console.log(
    "✅ Editorial precheck approved.",
  );
}

async function findExistingItem(
  productionCode: string,
): Promise<
  SupabaseContentItem | null
> {
  const rows =
    await supabaseRequest<
      SupabaseContentItem[]
    >(
      [
        "content_items",
        "?select=id,content_code,channel_id,topic,format,objective,status,qa_score",
        `&content_code=eq.${encodeURIComponent(
          productionCode,
        )}`,
        "&limit=1",
      ].join(""),
    );

  return rows[0] ?? null;
}

async function runRegister(
  productionCode: string,
) {
  const packet =
    readJson<
      QInfinityStrategicContentPacket
    >(
      strategicPacketPath(
        productionCode,
      ),
    );

  const existing =
    await findExistingItem(
      productionCode,
    );

  const record = {
    content_code:
      productionCode,

    channel_id:
      LEGAL_CHANNEL_ID,

    topic:
      packet.knowledge.topic,

    format:
      "audiovisual-short",

    objective:
      packet.knowledge
        .centralThesis,

    status:
      "rendered",
  };

  if (existing) {
    await supabaseRequest<void>(
      [
        "content_items",
        `?id=eq.${existing.id}`,
      ].join(""),
      {
        method:
          "PATCH",

        headers: {
          Prefer:
            "return=minimal",
        },

        body:
          JSON.stringify(
            record,
          ),
      },
    );

    console.log(
      `Updated editorial record: ${productionCode}`,
    );
  } else {
    await supabaseRequest<void>(
      "content_items",
      {
        method:
          "POST",

        headers: {
          Prefer:
            "return=minimal",
        },

        body:
          JSON.stringify(
            record,
          ),
      },
    );

    console.log(
      `Created editorial record: ${productionCode}`,
    );
  }

  console.log(
    "✅ Editorial memory registered in Supabase.",
  );
}

async function main() {
  const mode =
    process.argv[2] as
      | Mode
      | undefined;

  const productionCode =
    process.argv[3];

  if (
    mode !== "precheck" &&
    mode !== "register"
  ) {
    throw new Error(
      [
        "Invalid mode.",
        "Usage:",
        "tsx scripts/editorial-memory.ts precheck <production-code>",
        "tsx scripts/editorial-memory.ts register <production-code>",
      ].join("\n"),
    );
  }

  if (!productionCode) {
    throw new Error(
      "Missing production code.",
    );
  }

  if (
    mode === "precheck"
  ) {
    await runPrecheck(
      productionCode,
    );

    return;
  }

  await runRegister(
    productionCode,
  );
}

main().catch(
  (error) => {
    console.error(
      "❌ EDITORIAL MEMORY ERROR",
    );

    console.error(
      error,
    );

    process.exit(1);
  },
);
