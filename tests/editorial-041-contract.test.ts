import fs from "node:fs";
import { describe, expect, it } from "vitest";

const agenda = JSON.parse(
  fs.readFileSync("content/opportunities/agenda.json", "utf8"),
) as {
  proposals: Array<{
    id: string;
    proposedThesis?: string;
    viewerBenefit?: string;
    jurisdiction?: string | null;
    sources?: Array<{ reference: string; locator: string; url: string }>;
    status: string;
  }>;
};

const bolivia = agenda.proposals.filter((item) => item.id.startsWith("bo-"));

describe("V4.1 Bolivia 041+", () => {
  it("keeps every new proposal pending until documented review", () => {
    expect(bolivia.length).toBeGreaterThanOrEqual(12);
    for (const item of bolivia) {
      expect(item.status).toBe("pending-phd12");
      expect(item.jurisdiction).toBe("Bolivia");
    }
  });

  it("requires differentiated thesis, concrete viewer benefit and verifiable sources", () => {
    const theses = new Set<string>();
    for (const item of bolivia) {
      const thesis = item.proposedThesis?.trim() ?? "";
      const benefit = item.viewerBenefit?.trim() ?? "";
      expect(thesis.length).toBeGreaterThan(50);
      expect(benefit.length).toBeGreaterThan(35);
      expect(theses.has(thesis.toLowerCase())).toBe(false);
      theses.add(thesis.toLowerCase());
      expect(item.sources?.length ?? 0).toBeGreaterThan(0);
      for (const source of item.sources ?? []) {
        expect(source.reference.trim()).not.toBe("");
        expect(source.locator.trim()).not.toBe("");
        expect(source.url).toMatch(
          /^https:\/\/www\.gacetaoficialdebolivia\.gob\.bo\//,
        );
      }
    }
  });
});
