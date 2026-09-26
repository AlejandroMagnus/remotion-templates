import { describe, expect, it } from "vitest";
import {
  EditorialSelectionError,
  HIGH_TICKET_OPPORTUNITY_PORTFOLIO,
  selectAutonomousHighTicketContent,
} from "../src/strategy/AutonomousHighTicketContentDirector";
import type { EditorialMemoryItem } from "../src/strategy/EditorialMemory";
import {
  decodeEditorialMemory,
  encodeEditorialMemory,
} from "../src/strategy/EditorialMemoryStore";
import { fixture, memoryItem, resignFixture } from "./editorial-fixtures";

describe("editorial selection across future productions", () => {
  it("runs 40 serial selections through persisted memory with no reused opportunity and the 9/6/5 rolling target", () => {
    const catalog = Array.from({ length: 40 }, (_, i) =>
      fixture(i, i < 18 ? "FI" : i < 30 ? "DT" : "HT"),
    );
    const history: EditorialMemoryItem[] = [];
    const used = new Set<string>();
    for (let index = 0; index < 40; index++) {
      const selected = selectAutonomousHighTicketContent(
        { productionCode: `video-${index}` },
        history,
        catalog,
      );
      expect(used.has(selected.selectedOpportunity.id)).toBe(false);
      used.add(selected.selectedOpportunity.id);
      const record = memoryItem(
        selected.selectedOpportunity,
        selected.productionCode,
      );
      history.push(
        decodeEditorialMemory({
          id: index,
          content_code: record.contentCode,
          topic: record.topic,
          objective: encodeEditorialMemory(record),
          status: "rendered",
        }),
      );
      if (history.length >= 20) {
        const counts = { FI: 0, DT: 0, HT: 0 };
        for (const item of history.slice(-20))
          counts[item.editorial!.category]++;
        expect(counts).toEqual({ FI: 9, DT: 6, HT: 5 });
      }
    }
    expect(used.size).toBe(40);
    expect(() =>
      selectAutonomousHighTicketContent(
        { productionCode: "video-41" },
        history,
        catalog,
      ),
    ).toThrow("cartera");
  });

  it("gives an approved, reasoned Q∞ priority precedence and records vetoes", () => {
    const cards = [fixture(1, "FI"), fixture(2, "HT")];
    const priority = selectAutonomousHighTicketContent(
      {
        productionCode: "new",
        qInfinityPriorityId: cards[1].id,
        qInfinityReason: "prioridad expresa",
      },
      [],
      cards,
    );
    expect(priority.selectedOpportunity.id).toBe(cards[1].id);
    expect(priority.editorialBrief.qInfinityPriorityApplied).toBe(true);
    const veto = selectAutonomousHighTicketContent(
      {
        productionCode: "new",
        qInfinityVetoIds: [cards[0].id],
        qInfinityReason: "veto expreso",
      },
      [],
      cards,
    );
    expect(veto.selectedOpportunity.id).toBe(cards[1].id);
    expect(
      veto.alternatives.find((item) => item.opportunityId === cards[0].id)
        ?.approved,
    ).toBe(false);
    expect(() =>
      selectAutonomousHighTicketContent(
        { productionCode: "new", qInfinityPriorityId: cards[1].id },
        [],
        cards,
      ),
    ).toThrow("motivo");
  });

  it("never silently replaces a repeated or unavailable explicit priority", () => {
    const cards = [fixture(1), fixture(2)];
    for (const id of [cards[0].id, "absent"]) {
      try {
        selectAutonomousHighTicketContent(
          {
            productionCode: "new",
            qInfinityPriorityId: id,
            qInfinityReason: "user",
          },
          [memoryItem(cards[0])],
          cards,
        );
        expect.fail("Priority should be blocked");
      } catch (error) {
        expect(error).toBeInstanceOf(EditorialSelectionError);
        expect(["PRIORITY_BLOCKED", "PRIORITY_UNAVAILABLE"]).toContain(
          (error as EditorialSelectionError).code,
        );
      }
    }
  });

  it("infers directed mode from an angle, honors topic matches, and refuses unrelated requests", () => {
    const cards = [fixture(1), fixture(2)];
    const directed = selectAutonomousHighTicketContent(
      { productionCode: "new", requestedAngle: "tesis2 proposicion2" },
      [],
      cards,
    );
    expect(directed.mode).toBe("directed");
    expect(directed.selectedOpportunity.id).toBe(cards[1].id);
    expect(() =>
      selectAutonomousHighTicketContent(
        { productionCode: "new", requestedTopic: "proteccion constitucional" },
        [],
        cards,
      ),
    ).toThrow("cartera");
  });

  it("recognizes historical legacy categories from exact topics without inventing unknown classifications", () => {
    const old = HIGH_TICKET_OPPORTUNITY_PORTFOLIO[0];
    const legacy = memoryItem(old, "old");
    delete legacy.editorial;
    const novel = fixture(98);
    const selection = selectAutonomousHighTicketContent(
      { productionCode: "new" },
      [
        legacy,
        {
          contentCode: "unknown",
          topic: "another",
          thesis: "distinct",
          concepts: [],
          status: "rendered",
        },
        { ...legacy, contentCode: "failed", status: "failed" },
      ],
      [old, novel],
    );
    expect(selection.editorialBrief.portfolio).toMatchObject({
      counts: { FI: 0, DT: 0, HT: 1 },
      unclassified: 1,
      windowSize: 2,
    });
  });

  it("does not use the generic word derecho as evidence of the same legal domain", () => {
    const op = fixture(2);
    op.domain = "derecho-civil";
    op.editorial!.domains = ["derecho-civil"];
    resignFixture(op);
    const selection = selectAutonomousHighTicketContent(
      { productionCode: "new" },
      [
        {
          contentCode: "old",
          topic: "derecho penal",
          thesis: "pena imputabilidad culpabilidad",
          concepts: [],
          status: "rendered",
        },
      ],
      [op],
    );
    expect(selection.score.domainDiversityScore).toBe(100);
  });

  it("rejects unreviewed injected content, reused codes and malformed duplicate IDs", () => {
    const op = fixture();
    delete op.editorial!.legalReview;
    expect(() =>
      selectAutonomousHighTicketContent({ productionCode: "new" }, [], [op]),
    ).toThrow("cartera");
    const good = fixture();
    expect(() =>
      selectAutonomousHighTicketContent(
        { productionCode: "existing" },
        [memoryItem(good, "existing")],
        [good],
      ),
    ).toThrow("ya figura");
    expect(() =>
      selectAutonomousHighTicketContent(
        { productionCode: "../bad" },
        [],
        [good],
      ),
    ).toThrow("productionCode");
    expect(() =>
      selectAutonomousHighTicketContent(
        { productionCode: "new" },
        [],
        [good, good],
      ),
    ).toThrow("duplicados");
  });
});
