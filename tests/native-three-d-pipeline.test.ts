import {afterEach, describe, expect, it} from "vitest";
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import pilot from "../examples/native-3d-pilot.video.json";

const root = process.cwd();
const scratch: string[] = [];
afterEach(() => scratch.splice(0).forEach((directory) => rmSync(directory, {recursive: true, force: true})));
function fixture() {
  const cwd = mkdtempSync(path.join(tmpdir(), "native-3d-test-"));
  scratch.push(cwd);
  mkdirSync(path.join(cwd, "examples"));
  mkdirSync(path.join(cwd, "public/generated"), {recursive: true});
  const write = (name: string, content: unknown) => writeFileSync(path.join(cwd, name), JSON.stringify(content));
  const read = (name: string) => JSON.parse(readFileSync(path.join(cwd, name), "utf8"));
  const run = (script: string, enabled = "true") => execFileSync(process.execPath,
    ["--import", path.join(root, "node_modules/tsx/dist/loader.mjs"), path.join(root, "scripts", script)], {
      cwd, encoding: "utf8", timeout: 15000,
      env: {...process.env, PRODUCTION_CODE: pilot.id, ENABLE_3D: enabled, SUPABASE_URL: "", SUPABASE_SECRET_KEY: "", PEXELS_API_KEY: ""},
    });
  return {write, read, run};
}

describe("3D pipeline integration", () => {
  it("resolves a native-only plan offline and audits actual 3D execution", () => {
    const f = fixture();
    f.write(`examples/${pilot.id}.video.json`, pilot);
    f.write(`public/generated/${pilot.id}-asset-scene-plan.json`, {productionCode: pilot.id, scenes: [
      {id: "evidence-pilot", ruleId: "prueba", route: "DOCUMENT_OBJECT", startMs: 0, endMs: 8000, durationMs: 8000},
    ]});
    expect(f.run("build-resolved-assets.ts")).toContain("NATIVE 3D");
    const manifest = f.read(`public/generated/${pilot.id}-resolved-assets.json`);
    expect(manifest.mediaSummary).toMatchObject({threeD: 1, images: 0, videos: 0});
    expect(manifest.creativeExecution.nativeThreeDSceneCount).toBe(1);
    expect(manifest.resolvedCount).toBe(1);
    expect(manifest.assets[0].asset.provider).toBe("native-three");
  });

  it("rebuilds timing idempotently and disabling clears stale 3D without changing audio", () => {
    const f = fixture();
    const spec = {...pilot, target: {...pilot.target, fixedDurationSec: 40}};
    f.write(`examples/${pilot.id}.video.json`, spec);
    f.write(`public/generated/${pilot.id}-asset-scene-plan.json`, {productionCode: pilot.id, scenes: [
      {id: "proof-scene", ruleId: "prueba", startMs: 5000, endMs: 10000},
    ]});
    f.write(`public/generated/${pilot.id}-timeline.json`, {words: [{text: "prueba", startMs: 5500, endMs: 5800}]});
    f.run("build-three-d-plan.ts");
    const first = f.read(`examples/${pilot.id}.video.json`);
    expect(first.threeD.scenes[0]).toMatchObject({assetSceneId: "proof-scene", cueMs: 5500});
    expect(first.audio).toEqual(spec.audio);
    expect(first.scenes).toEqual(spec.scenes);
    f.run("build-three-d-plan.ts");
    expect(f.read(`examples/${pilot.id}.video.json`)).toEqual(first);
    f.run("build-three-d-plan.ts", "false");
    const disabled = f.read(`examples/${pilot.id}.video.json`);
    expect(disabled.threeD).toBeUndefined();
    expect(disabled.audio).toEqual(spec.audio);
    expect(disabled.scenes).toEqual(spec.scenes);
  });
});
