import type { HighTicketOpportunity } from "../src/strategy/AutonomousHighTicketContentDirector";
import {
  reviewedContentHash,
  type EditorialCategory,
} from "../src/strategy/EditorialCatalog";
import { buildSilecStrategicPacket } from "../src/content/SilecContentAdapter";
import {
  buildEditorialMemoryRecord,
  type EditorialMemoryItem,
} from "../src/strategy/EditorialMemory";

/** Synthetic tokens and fake review records only; these are not legal content. */
export function fixture(
  id = 1,
  category: EditorialCategory = "FI",
): HighTicketOpportunity {
  const opportunity: HighTicketOpportunity = {
    id: `fixture-${id}`,
    domain: `rama${id}`,
    topic: `materia${id} asunto${id}`,
    centralThesis: `tesis${id} proposicion${id} argumento${id} concepto${id}`,
    problem: `problema${id}`,
    reasoningChain: [`razon${id}`],
    conclusion: `conclusion${id}`,
    targetAudience: [`audiencia${id}`],
    capabilityDemonstrated: [`capacidad${id}`],
    commercialObjective: `objetivo${id}`,
    offerPath: [`oferta${id}`],
    hook: `entrada${id}`,
    closingIdea: `cierre${id}`,
    cta: `accion${id}`,
    strategicValue: 90,
    authorityValue: 90,
    commercialPotential: 90,
    urgencyValue: 90,
    reusability: 90,
    scalability: 90,
    editorial: {
      opportunityId: `fixture-${id}`,
      category,
      dimension: "doctrinal",
      domains:
        category === "DT" ? [`rama${id}`, `otrarama${id}`] : [`rama${id}`],
      intellectualContribution: `aportacion${id}`,
      legalReview: {
        status: "approved",
        authority: "PhD 12",
        jurisdiction: "TEST ONLY",
        reviewedBy: "TEST FIXTURE ONLY",
        reviewedAt: "2020-01-01T00:00:00Z",
        reviewReference: "fixture-review",
        sources: [{ reference: "fixture-source", locator: "fixture-section" }],
      },
    },
    editorialScores: {
      intellectualAuthority: 90,
      legalBreadth: 90,
      commercialPotential: 90,
      retention: 90,
      seo: 90,
      differentiation: 90,
      timeliness: 90,
    },
  };
  return resignFixture(opportunity);
}

export function resignFixture(opportunity: HighTicketOpportunity) {
  opportunity.editorial!.legalReview!.contentHash =
    reviewedContentHash(opportunity);
  return opportunity;
}

export function packet(
  opportunity: HighTicketOpportunity,
  code = "fixture-current",
) {
  return buildSilecStrategicPacket({ ...opportunity, productionCode: code });
}

export function memoryItem(
  opportunity: HighTicketOpportunity,
  code = "fixture-prior",
): EditorialMemoryItem {
  return {
    ...buildEditorialMemoryRecord(packet(opportunity, code)),
    status: "rendered",
  };
}
