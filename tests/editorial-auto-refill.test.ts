import { describe, expect, it } from "vitest";
import { buildEditorialAutoRefill } from "../src/strategy/EditorialAutoRefill";
import { selectAutonomousHighTicketContent } from "../src/strategy/AutonomousHighTicketContentDirector";

describe("V3.17-D editorial auto-refill", () => {
  it("creates a large unique candidate bank from the agenda", () => {
    const candidates = buildEditorialAutoRefill();
    expect(candidates.length).toBeGreaterThanOrEqual(400);
    expect(new Set(candidates.map((item) => item.id)).size).toBe(
      candidates.length,
    );
    expect(
      candidates.every(
        (item) => item.editorial?.productionGate === "draft-render-ok",
      ),
    ).toBe(true);
  });

  it("can select a new renderable draft without inventing legal approval", () => {
    const candidates = buildEditorialAutoRefill();
    const selection = selectAutonomousHighTicketContent(
      {
        productionCode: "video-juridico-auto-refill-test",
        mode: "autonomous",
      },
      [],
      candidates,
    );

    expect(selection.version).toBe("V3.17-D");
    expect(selection.selectedOpportunity.id.startsWith("auto-")).toBe(true);
    expect(
      selection.selectedOpportunity.editorial?.legalReview,
    ).toBeUndefined();
    expect(selection.selectedOpportunity.editorial?.productionGate).toBe(
      "draft-render-ok",
    );
  });
});
