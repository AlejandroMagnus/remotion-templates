import { describe, expect, it } from "vitest";
import { buildDynamicLegalEditorialUniverse } from "../src/strategy/DynamicLegalEditorialUniverse";
import { selectAutonomousHighTicketContent } from "../src/strategy/AutonomousHighTicketContentDirector";

describe("V3.20 dynamic legal universe", () => {
  it("creates more than one thousand unique legal candidates", () => {
    const universe = buildDynamicLegalEditorialUniverse();
    expect(universe.length).toBeGreaterThanOrEqual(1000);
    expect(new Set(universe.map((item) => item.id)).size).toBe(universe.length);
    expect(
      new Set(universe.map((item) => item.domain)).size,
    ).toBeGreaterThanOrEqual(18);
  });

  it("keeps same number deterministic and consecutive numbers different", () => {
    const universe = buildDynamicLegalEditorialUniverse();
    const a = selectAutonomousHighTicketContent(
      { productionCode: "video-juridico-026", mode: "autonomous" },
      [],
      universe,
    );
    const retry = selectAutonomousHighTicketContent(
      { productionCode: "video-juridico-026", mode: "autonomous" },
      [],
      universe,
    );
    const b = selectAutonomousHighTicketContent(
      { productionCode: "video-juridico-027", mode: "autonomous" },
      [],
      universe,
    );
    expect(retry.selectedOpportunity.id).toBe(a.selectedOpportunity.id);
    expect(b.selectedOpportunity.id).not.toBe(a.selectedOpportunity.id);
  });
});
