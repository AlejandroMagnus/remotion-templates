import { describe, expect, it } from "vitest";
import { loadEditorialCatalog } from "../scripts/lib/editorial-catalog";
import { selectAutonomousHighTicketContent } from "../src/strategy/AutonomousHighTicketContentDirector";
import { buildSilecStrategicPacket } from "../src/content/SilecContentAdapter";
import { buildEditorialMemoryRecord } from "../src/strategy/EditorialMemory";

describe("V4.2 reviewed Bolivia portfolio 041-052", () => {
  const catalog = loadEditorialCatalog();
  const bolivia = catalog.available.filter((item) =>
    /^bo-0(4[1-9]|5[0-2])-/.test(item.id),
  );

  it("has 12 documented and enabled cards", () => {
    expect(bolivia).toHaveLength(12);

    for (const card of bolivia) {
      expect(card.editorial?.legalReview?.status).toBe("approved");
      expect(card.editorial?.legalReview?.authority).toBe("PhD 12");
      expect(card.editorial?.legalReview?.jurisdiction).toBe("Bolivia");
      expect(card.editorial?.legalReview?.reviewedBy).toMatch(/GPT-5\.6 Sol/);
      expect(card.editorial?.legalReview?.reviewReference).toMatch(
        /^REV-0(4[1-9]|5[0-2])-2026-10-02$/,
      );
      expect(card.editorial?.legalReview?.sources.length).toBeGreaterThan(0);
      expect(card.editorial?.legalReview?.contentHash?.length).toBe(64);
      expect(card.commercialObjective).toMatch(/Beneficio para el espectador:/);
    }
  });

  it("keeps duplicate control active across consecutive new videos", () => {
    const first = selectAutonomousHighTicketContent(
      { productionCode: "video-juridico-041", mode: "autonomous" },
      [],
      bolivia,
    );

    const produced = {
      ...buildEditorialMemoryRecord(
        buildSilecStrategicPacket({
          ...first.selectedOpportunity,
          productionCode: "video-juridico-041",
        }),
      ),
      status: "rendered",
    };

    const second = selectAutonomousHighTicketContent(
      { productionCode: "video-juridico-042", mode: "autonomous" },
      [produced],
      bolivia,
    );

    expect(second.selectedOpportunity.id).not.toBe(
      first.selectedOpportunity.id,
    );
  });
});
