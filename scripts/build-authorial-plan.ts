import fs from "node:fs";
import path from "node:path";
import { buildAuthorialPlan } from "../src/content/AuthorialDirector";

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function code(): string {
  const value = process.argv[2]?.trim() || process.env.PRODUCTION_CODE?.trim();

  if (!value) {
    throw new Error("Production code no definido.");
  }
  return value;
}

function attempt(): number {
  const raw =
    process.argv[3]?.trim() || process.env.AUTHORIAL_ATTEMPT?.trim() || "0";

  const value = Number(raw);

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Intento de autoría inválido: ${raw}`);
  }

  return value;
}

function main() {
  const productionCode = code();
  const currentAttempt = attempt();

  const sourcePath = path.join(
    process.cwd(),
    "content",
    `${productionCode}.silec.json`,
  );

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`No existe ${sourcePath}`);
  }

  const source = readJson<Record<string, unknown>>(sourcePath);

  const plan = buildAuthorialPlan(source, currentAttempt);

  const outDir = path.join(process.cwd(), "public", "generated");

  fs.mkdirSync(outDir, {
    recursive: true,
  });

  const outPath = path.join(outDir, `${productionCode}-authorial-plan.json`);

  fs.writeFileSync(outPath, JSON.stringify(plan, null, 2) + "\n", "utf8");

  console.log(`AUTHORIAL_PLAN=${outPath}`);
  console.log(`AUTHORIAL_MODE=${plan.mode}`);
  console.log(`AUTHORIAL_THESIS=${plan.authorialThesis}`);
}

main();
