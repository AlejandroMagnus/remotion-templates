import fs from "node:fs";
import path from "node:path";
import {
  EditorialSelectionError,
  HIGH_TICKET_OPPORTUNITY_PORTFOLIO,
  selectAutonomousHighTicketContent,
  type HighTicketContentIntent,
  type HighTicketOpportunity,
} from "../src/strategy/AutonomousHighTicketContentDirector";
import {
  loadEditorialMemoryRows,
  normalizeSupabaseRestUrl,
} from "../src/strategy/EditorialMemoryStore";
import { mergeEditorialOpportunities } from "../src/strategy/EditorialCatalog";
import { loadEditorialCatalog, writeJson } from "./lib/editorial-catalog";

const productionCode =
  process.argv[2]?.trim() || process.env.PRODUCTION_CODE?.trim() || "";

if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(productionCode)) {
  throw new Error(
    "Use un production code con letras, números, guiones o guiones bajos.",
  );
}

const decisionPath = path.resolve(
  "public/generated",
  `${productionCode}-autonomous-director.json`,
);

function summary(text: string) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n");
  }
}

function videoNumber(code: string): number | null {
  const match = code.match(/^video-juridico-(\d+)$/);
  return match ? Number(match[1]) : null;
}

async function main() {
  const catalog = loadEditorialCatalog();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY.");
  }

  const memory = await loadEditorialMemoryRows(
    normalizeSupabaseRestUrl(url),
    async (requestUrl) => {
      const response = await fetch(requestUrl, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!response.ok) {
        throw new Error(
          `No se pudo leer la memoria editorial: HTTP ${response.status}`,
        );
      }
      return response;
    },
  );

  const requestedTopic =
    process.argv[3]?.trim() || process.env.REQUESTED_TOPIC?.trim() || null;
  const requestedAngle =
    process.argv[4]?.trim() || process.env.REQUESTED_ANGLE?.trim() || null;
  const mode = process.env.CONTENT_MODE;

  if (mode && !["autonomous", "directed"].includes(mode)) {
    throw new Error("Modo de selección inválido.");
  }

  const SPECIAL_053_ID = "bo-053-manifiesto-complejidad-juridica";
  const isSpecial053 = productionCode === "video-juridico-053";

  const intent: HighTicketContentIntent = {
    productionCode,
    mode:
      mode === "autonomous" || mode === "directed"
        ? mode
        : requestedTopic || requestedAngle
          ? "directed"
          : "autonomous",
    requestedTopic,
    requestedAngle,
    qInfinityPriorityId:
      process.env.QINFINITY_PRIORITY_ID?.trim() ||
      (isSpecial053 ? SPECIAL_053_ID : undefined),
    qInfinityReason:
      process.env.QINFINITY_REASON?.trim() ||
      (isSpecial053
        ? "Pieza insignia 053 aprobada y preseleccionada por diseño editorial."
        : undefined),
    qInfinityVetoIds: (process.env.QINFINITY_VETO_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  };

  const n = videoNumber(productionCode);
  const is041Plus = n !== null && n >= 41;

  const reviewedUniverse = mergeEditorialOpportunities(
    HIGH_TICKET_OPPORTUNITY_PORTFOLIO,
    catalog.available,
  );

  const existing = memory.find((item) => item.contentCode === productionCode);

  let selectionKind: "new-content" | "regenerate-existing";
  let selectionMemory = memory;
  let selectionPool: HighTicketOpportunity[];

  if (existing) {
    const opportunityId = existing.editorial?.opportunityId?.trim();
    if (!opportunityId) {
      throw new EditorialSelectionError(
        "PRODUCTION_RESUME_METADATA_MISSING",
        `${productionCode} existe en memoria, pero no conserva opportunityId para reconstruirlo.`,
      );
    }

    const recorded = reviewedUniverse.find((item) => item.id === opportunityId);
    if (!recorded) {
      throw new EditorialSelectionError(
        "PRODUCTION_RESUME_SOURCE_MISSING",
        `${productionCode} existe en memoria y apunta a ${opportunityId}, pero esa ficha ya no está disponible.`,
      );
    }

    selectionKind = "regenerate-existing";
    selectionMemory = memory.filter(
      (item) => item.contentCode !== productionCode,
    );
    selectionPool = [recorded];
  } else {
    selectionKind = "new-content";
    selectionPool = is041Plus
      ? catalog.available.filter(
          (item) =>
            item.id.startsWith("bo-") &&
            (isSpecial053 || item.id !== SPECIAL_053_ID),
        )
      : reviewedUniverse;

    if (is041Plus && selectionPool.length === 0) {
      throw new EditorialSelectionError(
        "BOLIVIA_041_REVIEW_PENDING",
        "No existe todavía ninguna ficha boliviana 041+ con revisión jurídica documentada y vigente en catalog.json. Revise e importe al menos una ficha; no se autoaprueba contenido.",
      );
    }
  }

  const selection = selectAutonomousHighTicketContent(
    intent,
    selectionMemory,
    selectionPool,
  );

  writeJson(decisionPath, {
    ...selection,
    status: "selected",
    selectionKind,
    memorySize: memory.length,
    reviewedCatalogAvailable: catalog.available.length,
  });

  writeJson(
    path.resolve("content", `${productionCode}.silec.json`),
    selection.silecInput,
  );

  console.log("V4.1 — DIRECTOR EDITORIAL BOLIVIA 041+");
  console.log(
    `Production: ${productionCode} | ${selectionKind} | Opportunity: ${selection.selectedOpportunity.id}`,
  );
  console.log(
    `Legal review: ${selection.silecInput.editorial?.legalReview?.status ?? "legacy-verification-required"}`,
  );
  summary(
    `### ${productionCode}\n\nModo: **${selectionKind}**\n\nFicha: **${selection.selectedOpportunity.id}**`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error instanceof EditorialSelectionError
      ? error.code
      : "EDITORIAL_INPUT_ERROR";

  writeJson(decisionPath, {
    status: "blocked",
    productionCode,
    code,
    message,
  });

  console.error(`${code}: ${message}`);
  summary(`### Selección detenida: ${productionCode}\n\n${code}: ${message}`);
  process.exitCode = 1;
});
