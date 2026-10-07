import fs from "node:fs";
import path from "node:path";
import { buildHumanValuePlan } from "../src/content/HumanValueDirector";
import type { SilecKnowledgeInput } from "../src/content/SilecContentAdapter";

function getProductionCode(): string {
  const code = process.env.PRODUCTION_CODE?.trim() || process.argv[2]?.trim();
  if (!code) {
    throw new Error(
      [
        "Production code no definido.",
        "Use PRODUCTION_CODE o:",
        "npx tsx scripts/build-human-value-plan.ts <production-code>",
      ].join("\n"),
    );
  }
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(code)) {
    throw new Error(`Código de producción inválido: ${code}`);
  }
  return code;
}

function readJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    throw new Error(`No existe o está vacío: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function main(): void {
  const code = getProductionCode();
  const root = process.cwd();
  const inputPath = path.join(root, "content", `${code}.silec.json`);
  const outputPath = path.join(
    root,
    "public",
    "generated",
    `${code}-human-value-plan.json`,
  );

  const input = readJson<SilecKnowledgeInput>(inputPath);
  if (input.productionCode !== code) {
    throw new Error(
      `Production code no coincide. Solicitado: ${code}. Input: ${input.productionCode}`,
    );
  }

  const plan = buildHumanValuePlan(input);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2) + "\n", "utf8");

  console.log("");
  console.log("==============================================");
  console.log("HUMAN VALUE PLAN CONFIRMADO");
  console.log("==============================================");
  console.log(`Production: ${code}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Benefit: ${plan.benefit}`);
  console.log(`Opening mode: ${plan.openingMode}`);
  console.log("==============================================");
}

main();
