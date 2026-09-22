import fs from "node:fs";
import path from "node:path";

import {
  buildEditorialMemoryRecord,
  compareWithEditorialMemory,
  type EditorialMemoryItem,
} from "../src/strategy/EditorialMemory";

import type {
  QInfinityStrategicContentPacket,
} from "../src/strategy/QInfinityStrategicContentPacket";

type Mode =
  | "precheck"
  | "register";

type SupabaseContentItem = {
  id?: number;
  content_code: string;
  topic: string | null;
  objective: string | null;
  status: string | null;
};

const mode =
  process.argv[2] as
    | Mode
    | undefined;

const productionCode =
  process.argv[3] ??
  process.env.PRODUCTION_CODE;

if (
  mode !== "precheck" &&
  mode !== "register"
) {
  throw new Error(
    "Uso: editorial-memory.ts <precheck|register> <production-code>",
  );
}

if (!productionCode) {
  throw new Error(
    "Production code no definido.",
  );
}

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL no definido.",
  );
}

if (!supabaseKey) {
  throw new Error(
    "SUPABASE_SECRET_KEY no definido.",
  );
}

function normalizeSupabaseRestUrl(
  value: string,
): string {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "")
    .concat("/rest/v1");
}

const restUrl =
  normalizeSupabaseRestUrl(
    supabaseUrl,
  );

const headers = {
  apikey: supabaseKey,
  Authorization:
    `Bearer ${supabaseKey}`,
  "Content-Type":
    "application/json",
};

function readJson<T>(
  filePath: string,
): T {
  if (
    !fs.existsSync(filePath)
  ) {
    throw new Error(
      `Archivo requerido no existe: ${filePath}`,
    );
  }

  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8",
    ),
  ) as T;
}

function strategicPacketPath():
  string {
  return path.join(
    process.cwd(),
    "public",
    "generated",
    `${productionCode}-strategic-content.json`,
  );
}

function videoSpecPath():
  string {
  return path.join(
    process.cwd(),
    "examples",
    `${productionCode}.video.json`,
  );
}

async function request(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const response =
    await fetch(
      url,
      {
        ...options,
        headers: {
          ...headers,
          ...(options.headers ?? {}),
        },
      },
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Supabase ${response.status}: ${body}`,
    );
  }

  return response;
}

async function loadMemory():
  Promise<EditorialMemoryItem[]> {
  const url =
    `${restUrl}/content_items` +
    "?select=id,content_code,topic,objective,status" +
    "&order=id.asc";

  const response =
    await request(url);

  const rows =
    await response.json() as
      SupabaseContentItem[];

  return rows
    .filter(
      (row) =>
        Boolean(
          row.content_code,
        ),
    )
    .map(
      (
        row,
      ): EditorialMemoryItem => ({
        id: row.id,

        contentCode:
          row.content_code,

        topic:
          row.topic ?? "",

        title:
          row.topic,

        thesis:
          row.objective,

        subthesis: null,

        narrationText: null,

        concepts: [
          row.topic ?? "",
          row.objective ?? "",
        ].filter(Boolean),

        semanticFingerprint:
          null,

        sourceSystem:
          null,

        sourceReference:
          null,

        status:
          row.status,

        publishedAt:
          null,
      }),
    );
}

async function findExisting():
  Promise<
    SupabaseContentItem | null
  > {
  const encoded =
    encodeURIComponent(
      productionCode,
    );

  const url =
    `${restUrl}/content_items` +
    "?select=id,content_code,topic,objective,status" +
    `&content_code=eq.${encoded}` +
    "&limit=1";

  const response =
    await request(url);

  const rows =
    await response.json() as
      SupabaseContentItem[];

  return rows[0] ?? null;
}

function loadPacket():
  QInfinityStrategicContentPacket {
  return readJson<
    QInfinityStrategicContentPacket
  >(
    strategicPacketPath(),
  );
}

function loadNarration():
  string {
  const spec =
    readJson<any>(
      videoSpecPath(),
    );

  return String(
    spec?.audio
      ?.narrationText ?? "",
  ).trim();
}

async function precheck():
  Promise<void> {
  const packet =
    loadPacket();

  if (
    packet.productionCode !==
    productionCode
  ) {
    throw new Error(
      "El paquete estratégico no corresponde al production code solicitado.",
    );
  }

  const memory =
    await loadMemory();

  const decision =
    compareWithEditorialMemory(
      packet,
      memory,
    );

  const outputPath =
    path.join(
      process.cwd(),
      "public",
      "generated",
      `${productionCode}-editorial-memory.json`,
    );

  fs.mkdirSync(
    path.dirname(
      outputPath,
    ),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        version:
          "V3.16-B-EDITORIAL-MEMORY",

        productionCode,

        checkedAt:
          new Date()
            .toISOString(),

        memorySize:
          memory.length,

        decision,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("");
  console.log(
    "======================================",
  );
  console.log(
    "V3.16-B — MEMORIA EDITORIAL",
  );
  console.log(
    "======================================",
  );

  console.log(
    `Production: ${productionCode}`,
  );

  console.log(
    `Memory items: ${memory.length}`,
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
    `Closest content: ${
      decision.closestContentCode ??
      "none"
    }`,
  );

  console.log(
    `Recommendation: ${decision.recommendation}`,
  );

  console.log(
    `Approved: ${decision.approved}`,
  );

  console.log(
    "======================================",
  );

  if (
    !decision.approved
  ) {
    throw new Error(
      `MEMORIA EDITORIAL: producción bloqueada (${decision.recommendation}).`,
    );
  }
}

async function register():
  Promise<void> {
  const packet =
    loadPacket();

  if (
    packet.productionCode !==
    productionCode
  ) {
    throw new Error(
      "El paquete estratégico no corresponde al production code solicitado.",
    );
  }

  const existing =
    await findExisting();

  const memoryRecord =
    buildEditorialMemoryRecord(
      packet,
    );

  const narration =
    loadNarration();

  const topic =
    memoryRecord.topic;

  /*
   * content_items actualmente dispone
   * de topic + objective como memoria
   * editorial persistente.
   *
   * Guardamos en objective una síntesis
   * suficientemente rica para futuras
   * comparaciones sin alterar el esquema
   * actual de Supabase.
   */
  const objectiveParts = [
    memoryRecord.thesis,
    memoryRecord.subthesis,
    narration
      ? narration.slice(
          0,
          700,
        )
      : null,
  ].filter(Boolean);

  const objective =
    objectiveParts
      .join(" | ")
      .slice(
        0,
        1800,
      );

  const payload = {
    topic,
    format:
      "short-video",

    objective,

    status:
      "rendered",

    updated_at:
      new Date()
        .toISOString(),
  };

  if (existing?.id) {
    await request(
      `${restUrl}/content_items?id=eq.${existing.id}`,
      {
        method: "PATCH",
        headers: {
          Prefer:
            "return=minimal",
        },
        body:
          JSON.stringify(
            payload,
          ),
      },
    );

    console.log(
      `MEMORIA EDITORIAL ACTUALIZADA: ${productionCode}`,
    );

    return;
  }

  /*
   * Canal jurídico ya existente
   * en META001-DEV.
   */
  const insertPayload = {
    content_code:
      productionCode,

    channel_id: 3,

    ...payload,

    created_at:
      new Date()
        .toISOString(),
  };

  await request(
    `${restUrl}/content_items`,
    {
      method: "POST",
      headers: {
        Prefer:
          "return=minimal",
      },
      body:
        JSON.stringify(
          insertPayload,
        ),
    },
  );

  console.log(
    `MEMORIA EDITORIAL REGISTRADA: ${productionCode}`,
  );
}

async function main():
  Promise<void> {
  if (
    mode === "precheck"
  ) {
    await precheck();
    return;
  }

  await register();
}

main().catch(
  (error) => {
    console.error(
      "",
    );

    console.error(
      "EDITORIAL MEMORY ERROR",
    );

    console.error(
      error,
    );

    process.exit(1);
  },
);
