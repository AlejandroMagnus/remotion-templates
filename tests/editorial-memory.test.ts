import { describe, expect, it } from "vitest";
import {
  compareWithEditorialMemory,
  buildEditorialMemoryRecord,
} from "../src/strategy/EditorialMemory";
import { HIGH_TICKET_OPPORTUNITY_PORTFOLIO } from "../src/strategy/AutonomousHighTicketContentDirector";
import {
  decodeEditorialMemory,
  encodeEditorialMemory,
  loadEditorialMemoryRows,
} from "../src/strategy/EditorialMemoryStore";
import {
  fixture,
  packet,
  memoryItem,
  resignFixture,
} from "./editorial-fixtures";

describe("persisted editorial memory and duplicate prevention", () => {
  it("recovers the exact old thesis from concatenated objective and rejects a new video number", () => {
    const op = HIGH_TICKET_OPPORTUNITY_PORTFOLIO.find(
      (item) => item.id === "contract-default-strategy",
    )!;
    const old = decodeEditorialMemory({
      id: 22,
      content_code: "video-juridico-022",
      topic: op.topic,
      objective: `${op.centralThesis} | ${op.conclusion} | Una narración larga con otras palabras y ejemplos.`,
      status: "rendered",
    });
    expect(old.thesis).toBe(op.centralThesis);
    expect(old.subthesis).toBe(op.conclusion);
    const decision = compareWithEditorialMemory(
      packet(op, "video-juridico-023"),
      [old],
    );
    expect(decision).toMatchObject({
      approved: false,
      recommendation: "reject-duplicate",
      closestContentCode: "video-juridico-022",
    });
  });

  it("rejects renamed titles and IDs when the thesis is unchanged", () => {
    const before = fixture(1);
    const after = resignFixture({
      ...fixture(2),
      centralThesis: before.centralThesis,
    });
    const result = compareWithEditorialMemory(packet(after), [
      memoryItem(before),
    ]);
    expect(result.approved).toBe(false);
    expect(result.comparisons[0].reasons).toContain("identical-thesis");
  });

  it("rejects near-identical theses even when other fields change", () => {
    const before = fixture(1);
    before.centralThesis =
      "alfa beta gamma delta epsilon zeta eta theta iota kappa lambda mu";
    resignFixture(before);
    const after = resignFixture({
      ...fixture(2),
      centralThesis: before.centralThesis + " adicional",
    });
    expect(
      compareWithEditorialMemory(packet(after), [memoryItem(before)])
        .recommendation,
    ).toBe("reject-duplicate");
  });

  it("does not count a failed/planned attempt as produced and remains conservative about unknown status", () => {
    const op = fixture();
    for (const status of ["failed", "planned", "draft", "cancelled"]) {
      expect(
        compareWithEditorialMemory(packet(op), [{ ...memoryItem(op), status }])
          .approved,
      ).toBe(true);
    }
    expect(
      compareWithEditorialMemory(packet(op), [
        { ...memoryItem(op), status: null },
      ]).approved,
    ).toBe(false);
    expect(
      compareWithEditorialMemory(packet(op), [
        { ...memoryItem(op), status: "legacy-other" },
      ]).approved,
    ).toBe(false);
  });

  it("requires an actual reviewed new angle for related content, covering all related videos", () => {
    const original = fixture(1);
    original.reasoningChain = [
      "contexto antecedente procedimiento documento cronologia audiencia pericia prueba",
    ];
    resignFixture(original);
    const related = resignFixture({
      ...fixture(2),
      topic: original.topic,
      problem: original.problem,
      conclusion: original.conclusion,
      reasoningChain: original.reasoningChain,
      capabilityDemonstrated: original.capabilityDemonstrated,
    });
    const old = memoryItem(original, "old-a");
    const decision = compareWithEditorialMemory(packet(related), [old]);
    expect(decision.highestSimilarity).toBeGreaterThanOrEqual(0.38);
    expect(decision.highestSimilarity).toBeLessThan(0.64);
    expect(decision.approved).toBe(false);
    related.editorial!.newAngle = {
      comparedWith: ["old-a"],
      contribution: "fixture-distinct-contribution",
    };
    resignFixture(related);
    expect(compareWithEditorialMemory(packet(related), [old])).toMatchObject({
      approved: true,
      recommendation: "produce-new-angle",
    });
    expect(
      compareWithEditorialMemory(packet(related), [
        old,
        { ...old, contentCode: "old-b" },
      ]).approved,
    ).toBe(false);
    const noReview = packet(related);
    noReview.editorial!.legalReview!.status = "revoked";
    expect(compareWithEditorialMemory(noReview, [old]).approved).toBe(false);
  });

  it("round trips identity, category, thesis, review and untruncated narration", () => {
    const input = {
      ...memoryItem(fixture(3, "DT")),
      narrationText: "x".repeat(2500),
    };
    const output = decodeEditorialMemory({
      id: 1,
      content_code: input.contentCode,
      topic: input.topic,
      objective: encodeEditorialMemory(input),
      status: "rendered",
    });
    expect(output.editorial).toEqual(input.editorial);
    expect(output.thesis).toBe(input.thesis);
    expect(output.narrationText).toBe(input.narrationText);
  });

  it("fails clearly on corrupted structured memory instead of weakening duplicate protection", () => {
    expect(() =>
      decodeEditorialMemory({
        content_code: "old",
        topic: "old",
        objective: '{"version":"broken"}',
        status: "rendered",
      }),
    ).toThrow();
  });

  it("loads beyond 1000 records even if the server caps pages below the requested limit", async () => {
    const rows = Array.from({ length: 1201 }, (_, index) => ({
      id: index,
      content_code: `old-${index}`,
      topic: "topic",
      objective: "thesis | conclusion",
      status: "rendered",
    }));
    let calls = 0;
    const items = await loadEditorialMemoryRows(
      "https://fixture.invalid/rest/v1",
      async (url) => {
        const query = new URL(url).searchParams;
        expect(query.get("channel_id")).toBe("eq.3");
        expect(query.get("order")).toBe("updated_at.asc,id.asc");
        const offset = Number(query.get("offset"));
        calls++;
        return Response.json(rows.slice(offset, offset + 100));
      },
    );
    expect(items).toHaveLength(1201);
    expect(items.at(-1)?.contentCode).toBe("old-1200");
    expect(calls).toBe(14);
  });

  it("stops repeated pagination and HTTP errors", async () => {
    const record = buildEditorialMemoryRecord(packet(fixture()));
    const row = {
      id: 1,
      content_code: "old",
      topic: record.topic,
      objective: encodeEditorialMemory(record),
      status: "rendered",
    };
    await expect(
      loadEditorialMemoryRows("https://fixture.invalid", async () =>
        Response.json([row]),
      ),
    ).rejects.toThrow("repetidos");
    await expect(
      loadEditorialMemoryRows(
        "https://fixture.invalid",
        async () => new Response("", { status: 503 }),
      ),
    ).rejects.toThrow("503");
  });
});
