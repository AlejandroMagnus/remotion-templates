import { describe, expect, it } from "vitest";
import { buildEditorialAutoRefill } from "../src/strategy/EditorialAutoRefill";
import { selectAutonomousHighTicketContent } from "../src/strategy/AutonomousHighTicketContentDirector";

describe("V3.19-B numbered autonomous production", () => {
  it("keeps the same numbered production deterministic", () => {
    const opportunities = buildEditorialAutoRefill();

    const first = selectAutonomousHighTicketContent(
      { productionCode: "video-juridico-026", mode: "autonomous" },
      [],
      opportunities,
    );

    const retry = selectAutonomousHighTicketContent(
      { productionCode: "video-juridico-026", mode: "autonomous" },
      [],
      opportunities,
    );

    expect(retry.selectedOpportunity.id).toBe(first.selectedOpportunity.id);
  });

  it("rotates consecutive numbered productions to different opportunities", () => {
    const opportunities = buildEditorialAutoRefill();

    const video26 = selectAutonomousHighTicketContent(
      { productionCode: "video-juridico-026", mode: "autonomous" },
      [],
      opportunities,
    );

    const video27 = selectAutonomousHighTicketContent(
      { productionCode: "video-juridico-027", mode: "autonomous" },
      [],
      opportunities,
    );

    expect(video27.selectedOpportunity.id).not.toBe(
      video26.selectedOpportunity.id,
    );
  });
});
