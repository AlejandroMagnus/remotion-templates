import fs from "node:fs";
import path from "node:path";

import {
  selectAutonomousHighTicketContent,
  type HighTicketContentIntent,
} from "../src/strategy/AutonomousHighTicketContentDirector";

import type {
  EditorialMemoryItem,
} from "../src/strategy/EditorialMemory";

/**
 * V3.17-B — AUTONOMOUS CONTENT DIRECTOR EXECUTOR
 *
 * Flujo:
 * Supabase Editorial Memory
 * → V3.17-A High-Ticket Director
 * → ranking estratégico
 * → selección autónoma
 * → SilecKnowledgeInput
 * → content/<production-code>.silec.json
 *
 * NO modifica la memoria.
 * NO registra contenido.
 * NO genera VideoSpec.
 * NO renderiza.
 */

type SupabaseContentItem = {
  id?: number;
  content_code: string;
  topic: string | null;
  objective: string | null;
  status: string | null;
};

function getProductionCode(): string {
  const value =
    process.argv[2]?.trim() ||
    process.env.PRODUCTION_CODE?.trim();

  if (!value) {
    throw new Error(
      [
        "Production code no definido.",
        "",
        "Uso:",
        "npx tsx scripts/autonomous-content-director.ts video-juridico-009",
      ].join("\n"),
    );
  }

  return value;
}

function optionalArgument(
  index: number,
): string | null {
  const value =
    process.argv[index]?.trim();

  return value || null;
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

function ensureEnvironment(): {
  restUrl: string;
  key: string;
} {
  const supabaseUrl =
    process.env.SUPABASE_URL;

  const key =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "SUPABASE_URL no definido.",
    );
  }

  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY no definido.",
    );
  }

  return {
    restUrl:
      normalizeSupabaseRestUrl(
        supabaseUrl,
      ),
    key,
  };
}

async function request(
  url: string,
  key: string,
): Promise<Response> {
  const response =
    await fetch(
      url,
      {
        headers: {
          apikey: key,
          Authorization:
            `Bearer ${key}`,
          "Content-Type":
            "application/json",
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

async function loadEditorialMemory(
  restUrl: string,
  key: string,
): Promise<EditorialMemoryItem[]> {
  const url =
    `${restUrl}/content_items` +
    "?select=id,content_code,topic,objective,status" +
    "&order=id.asc";

  const response =
    await request(
      url,
      key,
    );

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
        id:
          row.id,

        contentCode:
          row.content_code,

        topic:
          row.topic ?? "",

        title:
          row.topic,

        thesis:
          row.objective,

        subthesis:
          null,

        narrationText:
          null,

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

function writeJson(
  filePath: string,
  value: unknown,
): void {
  fs.mkdirSync(
    path.dirname(
      filePath,
    ),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      value,
      null,
      2,
    ),
    "utf8",
  );
}

async function main():
  Promise<void> {
  const productionCode =
    getProductionCode();

  /*
   * Argumentos opcionales:
   *
   * argv[3] = tema solicitado
   * argv[4] = ángulo solicitado
   *
   * Sin ellos, funciona
   * autónomamente.
   */
  const requestedTopic =
    optionalArgument(3);

  const requestedAngle =
    optionalArgument(4);

  const {
    restUrl,
    key,
  } =
    ensureEnvironment();

  const memory =
    await loadEditorialMemory(
      restUrl,
      key,
    );

  const intent:
    HighTicketContentIntent = {
      productionCode,

      mode:
        requestedTopic
          ? "directed"
          : "autonomous",

      objective:
        "Captar clientes jurídicos high ticket demostrando capacidad de diagnóstico, prevención, estrategia y resolución de problemas jurídicos de alto valor.",

      requestedTopic,

      requestedAngle,
    };

  const selection =
    selectAutonomousHighTicketContent(
      intent,
      memory,
    );

  const silecPath =
    path.join(
      process.cwd(),
      "content",
      `${productionCode}.silec.json`,
    );

  const decisionPath =
    path.join(
      process.cwd(),
      "public",
      "generated",
      `${productionCode}-autonomous-director.json`,
    );

  /*
   * El SilecKnowledgeInput generado
   * utiliza exactamente el contrato
   * que V3.16-C ya consume.
   */
  writeJson(
    silecPath,
    selection.silecInput,
  );

  /*
   * Conservamos también la decisión
   * completa para auditoría Q∞.
   */
  writeJson(
    decisionPath,
    {
      version:
        selection.version,

      productionCode:
        selection.productionCode,

      mode:
        selection.mode,

      objective:
        selection.objective,

      memorySize:
        memory.length,

      selectedOpportunity: {
        id:
          selection
            .selectedOpportunity
            .id,

        domain:
          selection
            .selectedOpportunity
            .domain,

        topic:
          selection
            .selectedOpportunity
            .topic,
      },

      score:
        selection.score,

      alternatives:
        selection.alternatives,
    },
  );

  console.log("");
  console.log(
    "==============================================",
  );

  console.log(
    "V3.17-B — AUTONOMOUS HIGH-TICKET DIRECTOR",
  );

  console.log(
    "==============================================",
  );

  console.log(
    `Production: ${productionCode}`,
  );

  console.log(
    `Mode: ${selection.mode}`,
  );

  console.log(
    `Editorial memory: ${memory.length} items`,
  );

  console.log("");
  console.log(
    "SELECCION AUTONOMA",
  );

  console.log(
    `Opportunity: ${selection.selectedOpportunity.id}`,
  );

  console.log(
    `Domain: ${selection.selectedOpportunity.domain}`,
  );

  console.log(
    `Topic: ${selection.selectedOpportunity.topic}`,
  );

  console.log(
    `Total score: ${selection.score.totalScore}/100`,
  );

  console.log(
    `Strategic score: ${selection.score.strategicScore}/100`,
  );

  console.log(
    `Novelty score: ${selection.score.editorialNoveltyScore}/100`,
  );

  console.log(
    `Editorial recommendation: ${selection.score.editorialDecision.recommendation}`,
  );

  console.log("");
  console.log(
    "RANKING",
  );

  selection.alternatives
    .slice(
      0,
      10,
    )
    .forEach(
      (
        candidate,
        index,
      ) => {
        console.log(
          `${index + 1}. ` +
          `${candidate.opportunityId} | ` +
          `${candidate.totalScore}/100 | ` +
          `approved=${candidate.approved} | ` +
          `${candidate.editorialDecision.recommendation}`,
        );
      },
    );

  console.log("");
  console.log(
    `SILEC input: ${silecPath}`,
  );

  console.log(
    `Decision audit: ${decisionPath}`,
  );

  console.log(
    "==============================================",
  );

  console.log(
    "✅ Autonomous content decision generated.",
  );
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "AUTONOMOUS CONTENT DIRECTOR ERROR",
    );
    console.error(error);

    process.exit(1);
  },
);
