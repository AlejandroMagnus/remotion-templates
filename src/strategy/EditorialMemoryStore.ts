import { z } from "zod";
import { EditorialMetadataSchema } from "./EditorialCatalog";
import type { EditorialMemoryItem } from "./EditorialMemory";

export const MEMORY_VERSION = "QINFINITY-EDITORIAL-MEMORY-2";
const RecordSchema = z.object({
  title: z.string().nullable().optional(),
  thesis: z.string(),
  subthesis: z.string().nullable().optional(),
  narrationText: z.string().nullable().optional(),
  concepts: z.array(z.string()),
  semanticFingerprint: z.string().nullable().optional(),
  sourceSystem: z.string().nullable().optional(),
  sourceReference: z.string().nullable().optional(),
  editorial: EditorialMetadataSchema.optional(),
});
const EnvelopeSchema = z.object({
  version: z.literal(MEMORY_VERSION),
  record: RecordSchema,
});

export type SupabaseContentItem = {
  id?: number;
  content_code: string;
  topic: string | null;
  objective: string | null;
  status: string | null;
  updated_at?: string | null;
};

/** Existing rows contain "thesis | conclusion | narration". Preserve each field. */
export function decodeEditorialMemory(
  row: SupabaseContentItem,
): EditorialMemoryItem {
  let record: z.infer<typeof RecordSchema>;
  const objective = row.objective?.trim() ?? "";
  if (objective.startsWith("{")) {
    // Recognised structured memory must never silently fall back to a weak comparison.
    const envelope = EnvelopeSchema.parse(JSON.parse(objective));
    record = envelope.record;
  } else {
    const [thesis = "", subthesis = "", ...narration] = objective.split(" | ");
    record = {
      title: row.topic,
      thesis,
      subthesis,
      narrationText: narration.join(" | "),
      concepts: [row.topic ?? "", thesis, subthesis].filter(Boolean),
    };
  }
  return {
    ...record,
    id: row.id,
    contentCode: row.content_code,
    topic: row.topic ?? "",
    status: row.status,
    publishedAt: row.updated_at ?? null,
  };
}

/** Versioned JSON uses the existing objective text field; no database migration. */
export function encodeEditorialMemory(item: EditorialMemoryItem): string {
  return JSON.stringify({
    version: MEMORY_VERSION,
    record: RecordSchema.parse(item),
  });
}

export function normalizeSupabaseRestUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "")
    .concat("/rest/v1");
}

/** Paginate until empty: Supabase can cap pages below the requested limit. */
export async function loadEditorialMemoryRows(
  restUrl: string,
  request: (url: string) => Promise<Response>,
  channelId = 3,
): Promise<EditorialMemoryItem[]> {
  const result = new Map<string, EditorialMemoryItem>();
  const seenRows = new Set<string>();
  let offset = 0;
  for (;;) {
    const url =
      `${restUrl}/content_items?select=id,content_code,topic,objective,status,updated_at` +
      `&channel_id=eq.${channelId}&order=updated_at.asc,id.asc&limit=500&offset=${offset}`;
    const response = await request(url);
    if (!response.ok)
      throw new Error(
        `No se pudo leer la memoria editorial: HTTP ${response.status}`,
      );
    const rows = (await response.json()) as SupabaseContentItem[];
    if (!Array.isArray(rows))
      throw new Error("Respuesta de memoria editorial inválida.");
    if (!rows.length) break;
    for (const row of rows) {
      const identity = `${row.id}:${row.content_code}`;
      if (seenRows.has(identity))
        throw new Error(
          "La paginación de memoria devolvió registros repetidos; se interrumpe la selección.",
        );
      seenRows.add(identity);
      if (!row.content_code) continue;
      const item = decodeEditorialMemory(row);
      result.delete(item.contentCode);
      result.set(item.contentCode, item);
    }
    offset += rows.length;
  }
  return [...result.values()];
}
