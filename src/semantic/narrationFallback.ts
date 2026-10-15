/**
 * Narration-backed fallback for an empty semantic-rule match set.
 * Does not invent evidence or legal reasoning: scene concepts are grounded
 * in the actual spoken words and their original WordBoundary timings.
 */
import type {SemanticEvent, WordTiming} from "../buildSemanticEvents";

const MIN_SCENE_MS = 2600;
const TARGET_MAX_SCENE_MS = 5500;

const fold = (text: string): string =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const chooseRule = (speech: string): string => {
  const text = fold(speech);
  // Prefer actual named objects/processes in the narration, never infer them.
  if (/\b(ley|articulo|codigo|norma|reglamento)\b/.test(text)) return "norma";
  if (/\b(documento|pagare|letra|titulo|contrato|factura|recibo|firma|expediente)\b/.test(text)) return "expediente";
  if (/\b(prueba|evidencia|testigo|pericia)\b/.test(text)) return "prueba";
  if (/\b(riesgo|embargo|perdida|incumplimiento|garantia)\b/.test(text)) return "riesgos";
  if (/\b(plazo|fecha|vencimiento|termino)\b/.test(text)) return "plazos";
  // Human action and concrete situation: no new facts beyond the words.
  return "hechos";
};

export function buildNarrationFallbackEvents(words: WordTiming[]): SemanticEvent[] {
  if (!Array.isArray(words) || words.length === 0) return [];
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (
      !Number.isFinite(word.startMs) || !Number.isFinite(word.endMs) ||
      word.endMs <= word.startMs ||
      (i > 0 && word.startMs < words[i - 1].startMs) ||
      typeof word.text !== "string" || !word.text.trim()
    ) {
      throw new Error(`NARRATION_FALLBACK_INVALID_WORDBOUNDARY: ${i}`);
    }
  }

  const events: SemanticEvent[] = [];
  let start = 0;
  for (let i = 0; i < words.length; i += 1) {
    const elapsed = words[i].endMs - words[start].startMs;
    const endsThought = /[.!?;:…][»”"')\]]?$/.test(words[i].text.trim());
    const last = i === words.length - 1;
    // Prefer actual sentence boundaries, but cap narrative units near 5.5 s.
    const cut = last || elapsed >= TARGET_MAX_SCENE_MS ||
      (endsThought && elapsed >= MIN_SCENE_MS);
    if (!cut) continue;

    const segment = words.slice(start, i + 1);
    const literalText = segment.map((word) => word.text.trim()).join(" ").trim();
    const startMs = segment[0].startMs;
    const endMs = segment[segment.length - 1].endMs;
    if (!literalText || endMs <= startMs) {
      throw new Error("NARRATION_FALLBACK_EMPTY_SEGMENT");
    }
    const ruleId = chooseRule(literalText);
    events.push({
      id: `narration-source-bound-${events.length + 1}-${startMs}`,
      ruleId,
      // The downstream visual planner chooses routes from ruleId, not this field.
      visualType: "realistic" as SemanticEvent["visualType"],
      concept:
        `Representar únicamente esta idea de la narración: «${literalText}». ` +
        "No introducir hechos, documentos, personas ni conclusiones ajenos al texto.",
      matchedKeyword: "source-bound-narration",
      startMs,
      endMs,
      durationMs: endMs - startMs,
      priority: 0,
    });
    start = i + 1;
  }
  return events;
}
