import fs from "node:fs";
import path from "node:path";
import { inspectEditorialCatalog } from "../../src/strategy/EditorialCatalog";

export function loadEditorialCatalog(
  file = process.env.EDITORIAL_CATALOG_PATH ||
    "content/opportunities/catalog.json",
) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath))
    throw new Error(`No existe el catálogo editorial: ${filePath}`);
  return {
    filePath,
    ...inspectEditorialCatalog(JSON.parse(fs.readFileSync(filePath, "utf8"))),
  };
}

export function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\n");
  fs.renameSync(temporary, file);
}
