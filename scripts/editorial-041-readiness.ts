import { loadEditorialCatalog } from "./lib/editorial-catalog";

const catalog = loadEditorialCatalog();
const bolivia = catalog.available.filter((item) => item.id.startsWith("bo-"));

console.log("=== READINESS VIDEO JURIDICO 041+ ===");
console.log(`Catálogo revisado total: ${catalog.available.length}`);
console.log(`Fichas Bolivia 041+ habilitadas: ${bolivia.length}`);
console.log(`Fichas excluidas por revisión: ${catalog.excluded.length}`);

if (bolivia.length === 0) {
  console.log(
    "ESTADO 041: PENDIENTE DE REVISION JURIDICA. No se autoaprobará ninguna propuesta.",
  );
  process.exitCode = 2;
} else {
  console.log(
    "ESTADO 041: LISTO PARA SELECCION. La decisión final se hará contra memoria persistente y controles de duplicidad.",
  );
  console.table(bolivia.map((item) => ({ id: item.id, topic: item.topic })));
}
