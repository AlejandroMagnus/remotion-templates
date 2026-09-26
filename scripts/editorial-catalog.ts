import fs from "node:fs";
import {
  EDITORIAL_CATALOG_VERSION,
  inspectEditorialCatalog,
  mergeEditorialOpportunities,
  reviewedContentHash,
} from "../src/strategy/EditorialCatalog";
import { HIGH_TICKET_OPPORTUNITY_PORTFOLIO } from "../src/strategy/AutonomousHighTicketContentDirector";
import { loadEditorialCatalog, writeJson } from "./lib/editorial-catalog";

function main() {
  const command = process.argv[2] || "check";
  if (command === "draft") {
    const agenda = JSON.parse(
      fs.readFileSync("content/opportunities/agenda.json", "utf8"),
    ) as {
      proposals: Array<{
        id: string;
        question: string;
        category: string;
        dimension: string;
        domains: string[];
      }>;
    };
    const proposal = agenda.proposals.find(
      (item) => item.id === process.argv[3],
    );
    if (!proposal || !/^[a-z0-9-]+$/.test(proposal.id))
      throw new Error("Seleccione un ID existente en agenda.json.");
    const file = `content/opportunities/drafts/${proposal.id}.json`;
    if (fs.existsSync(file))
      throw new Error(`Ya existe ${file}; revise la ficha existente.`);
    writeJson(file, {
      id: proposal.id,
      domain: proposal.domains[0],
      topic: proposal.question,
      centralThesis: "",
      problem: "",
      reasoningChain: [],
      conclusion: "",
      targetAudience: [],
      capabilityDemonstrated: [],
      commercialObjective: "",
      offerPath: [],
      hook: "",
      closingIdea: "",
      cta: "",
      strategicValue: 0,
      authorityValue: 0,
      commercialPotential: 0,
      urgencyValue: 0,
      reusability: 0,
      scalability: 0,
      editorial: {
        opportunityId: proposal.id,
        category: proposal.category,
        dimension: proposal.dimension,
        domains: proposal.domains,
        intellectualContribution: "",
        legalReview: { status: "pending", authority: "PhD 12", sources: [] },
      },
      editorialScores: {
        intellectualAuthority: 0,
        legalBreadth: 0,
        commercialPotential: 0,
        retention: 0,
        seo: 0,
        differentiation: 0,
        timeliness: 0,
      },
    });
    console.log(
      `Borrador pendiente: ${file}. Complete el contenido y la revisión antes de importar.`,
    );
    return;
  }
  if (command === "check") {
    const catalog = loadEditorialCatalog();
    mergeEditorialOpportunities(
      HIGH_TICKET_OPPORTUNITY_PORTFOLIO,
      catalog.catalog.opportunities,
    );
    console.log(
      `Catálogo: ${catalog.available.length} fichas con revisión registrada vigente; ${catalog.excluded.length} pendientes o excluidas.`,
    );
    console.log(
      "Las 10 fichas heredadas conservan legalVerificationRequired; no se certifican como validadas.",
    );
    if (catalog.excluded.length) console.table(catalog.excluded);
    return;
  }
  const file = process.argv[3];
  if (!file || !["hash", "import"].includes(command)) {
    throw new Error(
      "Uso: npm run editorial:catalog -- check | draft <agenda-id> | hash <ficha.json> | import <ficha.json>",
    );
  }
  const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  const inspected = inspectEditorialCatalog({
    version: EDITORIAL_CATALOG_VERSION,
    opportunities: [raw],
  });
  const card = inspected.catalog.opportunities[0];
  if (command === "hash") {
    console.log(reviewedContentHash(card));
    console.log(
      "Huella del texto; no constituye aprobación jurídica ni cambia el estado de revisión.",
    );
    return;
  }
  if (inspected.excluded.length) throw new Error(inspected.excluded[0].reason);
  const existing = loadEditorialCatalog();
  // Validate against both legacy IDs and every catalog row, including revoked cards.
  mergeEditorialOpportunities(
    [...HIGH_TICKET_OPPORTUNITY_PORTFOLIO, ...existing.catalog.opportunities],
    [card],
  );
  writeJson(existing.filePath, {
    ...existing.catalog,
    opportunities: [...existing.catalog.opportunities, card],
  });
  console.log(
    `Ficha incorporada: ${card.id}. Revise el diff y conserve su constancia PhD 12.`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
