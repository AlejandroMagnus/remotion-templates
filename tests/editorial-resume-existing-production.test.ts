import { describe, expect, it } from "vitest";
import { selectAutonomousHighTicketContent } from "../src/strategy/AutonomousHighTicketContentDirector";
import { fixture, memoryItem } from "./editorial-fixtures";

describe("V3.21-B resume existing production", () => {
  it("preserves the legacy selector contract by default", () => {
    const opportunity = fixture(81);
    const code = "video-juridico-029";

    expect(() =>
      selectAutonomousHighTicketContent(
        { productionCode: code, mode: "autonomous" },
        [memoryItem(opportunity, code)],
        [opportunity],
      ),
    ).toThrow(/ya figura en memoria/i);
  });

  it("reuses the recorded opportunity when resume is explicitly enabled", () => {
    const opportunity = fixture(82);
    const code = "video-juridico-029";

    const resumed = selectAutonomousHighTicketContent(
      {
        productionCode: code,
        mode: "autonomous",
        allowExistingProductionResume: true,
      },
      [memoryItem(opportunity, code)],
      [opportunity],
    );

    expect(resumed.productionCode).toBe(code);
    expect(resumed.selectedOpportunity.id).toBe(opportunity.id);
    expect(resumed.silecInput.productionCode).toBe(code);
    expect(resumed.editorialBrief.qInfinityPriorityApplied).toBe(false);
  });

  it("fails safely when old memory has no opportunityId", () => {
    const opportunity = fixture(83);
    const code = "video-juridico-legacy";

    expect(() =>
      selectAutonomousHighTicketContent(
        {
          productionCode: code,
          mode: "autonomous",
          allowExistingProductionResume: true,
        },
        [
          {
            contentCode: code,
            topic: "legacy topic",
            thesis: "legacy thesis",
            concepts: [],
            status: "rendered",
          },
        ],
        [opportunity],
      ),
    ).toThrow(/opportunityId/i);
  });
});
