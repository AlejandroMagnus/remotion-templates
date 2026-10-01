import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  evaluateVisualContext,
  sceneMentionsUS,
} from "../src/assets/visualContextQA";
import { bolivianQueries, VisualSelector } from "../src/assets/visualSelector";
import { VisualMemory } from "../src/assets/visualMemory";
import { MultiSourceProvider } from "../src/assets/providers/multiSourceProvider";
import type { VisualAsset } from "../src/assets/assetTypes";
const dirs: string[] = [];
afterEach(() =>
  dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })),
);
const image = (id: string, altText: string): VisualAsset => ({
  provider: "pixabay",
  providerId: id,
  mediaType: "image",
  remoteUrl: "https://example.org/a.jpg",
  sourceUrl: `https://example.org/${id}`,
  creator: "Author",
  width: 1080,
  height: 1920,
  altText,
});

describe("Bolivian identity in actual asset selection", () => {
  it("rejects US flags even when the topic merely says international", () => {
    for (const alt of [
      "American flag",
      "Flag of the United States",
      "USA flag",
      "Bandera estadounidense",
      "Bandera de Estados Unidos",
    ]) {
      expect(
        evaluateVisualContext(
          {
            ruleId: "autoridad",
            narrationContext: "Arbitraje internacional desde Bolivia",
          },
          image("us", alt),
        ).approved,
      ).toBe(false);
    }
    expect(
      sceneMentionsUS({ narrationContext: "El abogado usa prueba documental" }),
    ).toBe(false);
  });
  it("permits a US flag when the narration explicitly discusses that country", () => {
    expect(
      evaluateVisualContext(
        {
          narrationContext: "Comparación con los tribunales de Estados Unidos",
        },
        image("us", "American flag"),
      ).approved,
    ).toBe(true);
    expect(sceneMentionsUS({ narrationContext: "Tribunales de EE.UU." })).toBe(
      true,
    );
  });
  it("prioritizes Bolivia queries without replacing a foreign comparison", () => {
    expect(
      bolivianQueries({ ruleId: "autoridad" }, ["government documents"])[0],
    ).toBe("Bolivia flag government");
    expect(bolivianQueries({ ruleId: "prueba" }, ["documents"])[0]).toBe(
      "documents Bolivia",
    );
    expect(
      bolivianQueries(
        { ruleId: "autoridad", narrationContext: "Derecho de Estados Unidos" },
        ["US court"],
      ),
    ).toEqual(["US court"]);
  });
  it("filters foreign flags and gives a Bolivian asset preference in the connected selector", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bolivia-visual-"));
    dirs.push(dir);
    const provider = new MultiSourceProvider(undefined, {
      pexels: undefined,
      pixabay: undefined,
    });
    vi.spyOn(provider, "search").mockResolvedValue([
      image("us", "Government documents with flag of the United States"),
      image("neutral", "Government official reviewing documents office"),
      image(
        "bo",
        "Government official reviewing documents office Bolivia Bolivian flag",
      ),
    ]);
    const selector = new VisualSelector(
      new VisualMemory("video-030", dir),
      provider,
      dir,
    );
    const result = await selector.candidates(
      {
        ruleId: "autoridad",
        narrationContext: "Control de la autoridad en Bolivia",
        durationMs: 3000,
      },
      ["government documents"],
      "image",
      1,
    );
    expect(result.map((r) => r.asset.providerId)).not.toContain("us");
    expect(result[0].asset.providerId).toBe("bo");
    expect(result[0].contextQA.boliviaDetected).toBe(true);
    expect(
      selector.events.some((e) => e.includes("foreign-flag-without-context")),
    ).toBe(true);
  });
});
