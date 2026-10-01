import { validateGlb } from "./localCatalog";

/** Bundle a downloaded glTF and its declared dependencies into an offline GLB. */
export function packGlb(input: any, files: Map<string, Buffer>): Buffer {
  const doc = structuredClone(input);
  const chunks: Buffer[] = [];
  let cursor = 0;
  const append = (data: Buffer) => {
    const offset = cursor;
    chunks.push(data);
    cursor += data.length;
    const padding = (4 - (cursor % 4)) % 4;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      cursor += padding;
    }
    return offset;
  };
  const offsets = (doc.buffers ?? []).map((b: any) => {
    const bytes = files.get(b.uri);
    if (!bytes || bytes.length < b.byteLength)
      throw new Error("Missing glTF buffer.");
    return append(bytes);
  });
  for (const view of doc.bufferViews ?? []) {
    view.byteOffset = (view.byteOffset ?? 0) + offsets[view.buffer];
    view.buffer = 0;
  }
  doc.bufferViews ??= [];
  for (const img of doc.images ?? [])
    if (img.uri) {
      const data = files.get(img.uri);
      if (!data) throw new Error(`Missing texture: ${img.uri}`);
      const byteOffset = append(data);
      img.mimeType = img.uri.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg";
      img.bufferView = doc.bufferViews.length;
      doc.bufferViews.push({ buffer: 0, byteOffset, byteLength: data.length });
      delete img.uri;
    }
  const bin = Buffer.concat(chunks);
  doc.buffers = [{ byteLength: bin.length }];
  const json = Buffer.from(JSON.stringify(doc));
  const padded = Buffer.concat([
    json,
    Buffer.alloc((4 - (json.length % 4)) % 4, 32),
  ]);
  const header = Buffer.alloc(20);
  header.write("glTF");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + bin.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  const result = Buffer.concat([header, padded, binHeader, bin]);
  validateGlb(result);
  return result;
}
