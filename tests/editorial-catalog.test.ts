import { describe, expect, it } from "vitest";
import {
  EDITORIAL_CATALOG_VERSION,
  inspectEditorialCatalog,
  mergeEditorialOpportunities,
  reviewedContentHash,
} from "../src/strategy/EditorialCatalog";
import { fixture, packet, resignFixture } from "./editorial-fixtures";

function inspect(card = fixture()) {
  return inspectEditorialCatalog({
    version: EDITORIAL_CATALOG_VERSION,
    opportunities: [card],
  });
}

describe("catalog admits recorded legal reviews without claiming to validate law", () => {
  it("admits a complete reviewed card and binds the same text through SILEC", () => {
    const card = fixture();
    expect(inspect(card).available).toHaveLength(1);
    const built = packet(card);
    expect(built.source.legalVerificationRequired).toBe(false);
    expect(
      reviewedContentHash({
        ...built.knowledge,
        ...built.strategicObjective,
        ...built.audiovisual,
        editorial: built.editorial,
      }),
    ).toBe(card.editorial!.legalReview!.contentHash);
  });
  it.each(["pending", "revoked"] as const)(
    "excludes %s and refuses adaptation",
    (status) => {
      const card = fixture();
      card.editorial!.legalReview!.status = status;
      expect(inspect(card).available).toHaveLength(0);
      expect(() => packet(card)).toThrow("REVISIÓN JURÍDICA");
    },
  );
  it("invalidates a review when the claim, hook, or declared new angle is changed", () => {
    for (const field of ["centralThesis", "hook", "conclusion"] as const) {
      const card = fixture();
      card[field] += " contenido nuevo";
      expect(inspect(card).excluded[0].reason).toContain("cambió");
    }
    const card = fixture();
    card.editorial!.newAngle = {
      comparedWith: ["old"],
      contribution: "different",
    };
    expect(inspect(card).available).toHaveLength(0);
  });
  it("excludes absent sources, absent reviewer, future and expired reviews", () => {
    const missingSources = fixture();
    missingSources.editorial!.legalReview!.sources = [];
    const missingReviewer = fixture();
    delete missingReviewer.editorial!.legalReview!.reviewedBy;
    const expired = fixture();
    expired.editorial!.legalReview!.validUntil = "2021-01-01T00:00:00Z";
    const future = fixture();
    future.editorial!.legalReview!.reviewedAt = "2999-01-01T00:00:00Z";
    for (const card of [missingSources, missingReviewer, expired, future])
      expect(inspect(card).available).toHaveLength(0);
  });
  it("rejects malformed scores, single-domain DT, missing dimension and duplicate IDs", () => {
    const badScore = fixture();
    badScore.strategicValue = 101;
    expect(() => inspect(badScore)).toThrow();
    const singleDomain = fixture(1, "DT");
    singleDomain.editorial!.domains = ["one"];
    expect(() => inspect(resignFixture(singleDomain))).toThrow("DT requiere");
    const noDimension = fixture();
    delete noDimension.editorial!.dimension;
    expect(() => inspect(noDimension)).toThrow("dimensión");
    const card = fixture();
    expect(() =>
      inspectEditorialCatalog({
        version: EDITORIAL_CATALOG_VERSION,
        opportunities: [card, card],
      }),
    ).toThrow("duplicado");
    expect(() => mergeEditorialOpportunities([card], [card])).toThrow(
      "ya existe",
    );
  });
});
