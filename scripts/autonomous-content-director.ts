import fs from "node:fs";
import path from "node:path";
import {
  EditorialSelectionError,
  HIGH_TICKET_OPPORTUNITY_PORTFOLIO,
  selectAutonomousHighTicketContent,
  type HighTicketContentIntent,
} from "../src/strategy/AutonomousHighTicketContentDirector";
import { mergeEditorialOpportunities } from "../src/strategy/EditorialCatalog";
import {
  loadEditorialMemoryRows,
  normalizeSupabaseRestUrl,
} from "../src/strategy/EditorialMemoryStore";
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
let catalogAudit: unknown = null;

function summary(text: string) {
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n");
}

async function main() {
  const catalog = loadEditorialCatalog();
  catalogAudit = {
    version: catalog.catalog.version,
    available: catalog.available.map((item) => item.id),
    excluded: catalog.excluded,
    legacyVerificationRequired: HIGH_TICKET_OPPORTUNITY_PORTFOLIO.map(
      (item) => item.id,
    ),
  };
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY.");
  const memory = await loadEditorialMemoryRows(
    normalizeSupabaseRestUrl(url),
    async (requestUrl) => {
      const response = await fetch(requestUrl, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (!response.ok)
        throw new Error(
          `No se pudo leer la memoria editorial: HTTP ${response.status}`,
        );
      return response;
    },
  );
  const requestedTopic =
    process.argv[3]?.trim() || process.env.REQUESTED_TOPIC?.trim() || null;
  const requestedAngle =
    process.argv[4]?.trim() || process.env.REQUESTED_ANGLE?.trim() || null;
  const mode = process.env.CONTENT_MODE;
  if (mode && !["autonomous", "directed"].includes(mode))
    throw new Error("Modo de selección inválido.");
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
    qInfinityPriorityId: process.env.QINFINITY_PRIORITY_ID?.trim(),
    qInfinityReason: process.env.QINFINITY_REASON?.trim(),
    qInfinityVetoIds: (process.env.QINFINITY_VETO_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  };
  const selection = selectAutonomousHighTicketContent(
    intent,
    memory,
    mergeEditorialOpportunities(
      HIGH_TICKET_OPPORTUNITY_PORTFOLIO,
      catalog.available,
    ),
  );
  writeJson(decisionPath, {
    status: "selected",
    ...selection,
    memorySize: memory.length,
    catalog: catalogAudit,
  });
  writeJson(
    path.resolve("content", `${productionCode}.silec.json`),
    selection.silecInput,
  );

  console.log("V3.17-C — DIRECTOR EDITORIAL Q∞");
  console.log(
    `Production: ${productionCode} | Mode: ${selection.mode} | Memory: ${memory.length}`,
  );
  console.log(
    "FICHA EDITORIAL PREVIA\n" +
      JSON.stringify(selection.editorialBrief, null, 2),
  );
  console.log(`Opportunity: ${selection.selectedOpportunity.id}`);
  console.log(
    `Legal review: ${selection.silecInput.editorial?.legalReview?.status ?? "legacy-verification-required"}`,
  );
  console.table(
    selection.alternatives.map((item) => ({
      id: item.opportunityId,
      score: item.totalScore,
      portfolio: item.portfolioBonus,
      selection: item.selectionScore,
      approved: item.approved,
      recommendation: item.editorialDecision.recommendation,
    })),
  );
  console.log(`Decision audit: ${decisionPath}`);
  summary(
    `### Ficha editorial: ${productionCode}\n\n\`\`\`json\n${JSON.stringify(selection.editorialBrief, null, 2)}\n\`\`\`\n\nRevisión jurídica: ${selection.silecInput.editorial?.legalReview?.status ?? "pendiente en ficha heredada"}.`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error instanceof EditorialSelectionError
      ? error.code
      : "EDITORIAL_INPUT_ERROR";
  const candidates =
    error instanceof EditorialSelectionError ? error.candidates : [];
  writeJson(decisionPath, {
    status: "blocked",
    productionCode,
    code,
    message,
    candidates,
    catalog: catalogAudit,
  });
  console.error(`${code}: ${message}`);
  console.table(
    candidates.map((item) => ({
      id: item.opportunityId,
      reasons: item.reasons.join("; "),
    })),
  );
  summary(
    `### Selección detenida: ${productionCode}\n\n${code}: ${message}\n\nRevise el artefacto de diagnóstico editorial.`,
  );
  process.exitCode = 1;
});
