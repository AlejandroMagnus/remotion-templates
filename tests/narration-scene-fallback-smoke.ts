import assert from "node:assert/strict";
import {buildNarrationFallbackEvents} from "../src/semantic/narrationFallback";
import {buildAssetScenePlan} from "../src/semantic/buildAssetScenePlan";
import type {WordTiming} from "../src/buildSemanticEvents";

const narration = "Una tienda entrega mercadería y recibe un pagaré con espacios vacíos. Al mes siguiente el cliente deja de responder. La comerciante revisa el documento firmado y compara sus fechas. Una letra y un pagaré no son lo mismo. Cada instrumento exige requisitos diferentes según su naturaleza.";
const tokens = narration.split(/\s+/);
const words: WordTiming[] = tokens.map((text, index) => ({text, startMs: index * 320, endMs: index * 320 + 235}));
const fallback = buildNarrationFallbackEvents(words);
assert.ok(fallback.length >= 3, "debe generar varias unidades temporales");
const scenes = buildAssetScenePlan(fallback);
assert.equal(scenes.length, fallback.length);
assert.equal(scenes[0].startMs, words[0].startMs);
assert.equal(scenes[scenes.length - 1]?.endMs, words[words.length - 1]?.endMs);
assert.ok(scenes.every((scene) => scene.durationMs > 0 && scene.visualIntent && scene.generationPrompt));
assert.ok(scenes.every((scene) => scene.concept.includes("narración") && scene.concept.includes("No introducir hechos")));
assert.deepEqual(buildNarrationFallbackEvents([]), []);
assert.throws(() => buildNarrationFallbackEvents([{text: "error", startMs: 20, endMs: 20}]));
console.log(`REPARACION_ESCENAS_026_V1: PRUEBA_FUNCION_OK ${scenes.length} escenas`);
