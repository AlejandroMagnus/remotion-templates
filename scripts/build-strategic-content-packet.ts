import fs from "node:fs";
import path from "node:path";

import {
  buildSilecStrategicPacket,
  type SilecKnowledgeInput,
} from "../src/content/SilecContentAdapter";

/**
 * V3.16-C — UNIVERSAL SILEC → Q∞ BRIDGE
 *
 * Convierte un input jurídico estructurado
 * en un QInfinityStrategicContentPacket.
 *
 * Entrada:
 * content/<production-code>.silec.json
 *
 * Salida:
 * public/generated/<production-code>-strategic-content.json
 *
 * Este archivo NO inventa conocimiento jurídico.
 * El input debe provenir de conocimiento previamente
 * estructurado/validado por la capa jurídica SILEC / PhD 12.
 */

function requireProductionCode(): string {
  const fromEnv =
    process.env.PRODUCTION_CODE?.trim();

  const fromCli =
    process.argv[2]?.trim();

  const productionCode =
    fromEnv || fromCli;

  if (!productionCode) {
    throw new Error(
      [
        "Missing production code.",
        "Use PRODUCTION_CODE or:",
        "npx tsx scripts/build-strategic-content-packet.ts <production-code>",
      ].join("\n"),
    );
  }

  return productionCode;
}

function readJson<T>(
  filePath: string,
): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      [
        `SILEC input not found: ${filePath}`,
        "",
        "A structured legal-content input is required",
        "before the audiovisual pipeline can continue.",
      ].join("\n"),
    );
  }

  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8",
    ),
  ) as T;
}

function validateInput(
  input: SilecKnowledgeInput,
  productionCode: string,
) {
  if (
    input.productionCode !==
    productionCode
  ) {
    throw new Error(
      [
        "Production code mismatch.",
        `Requested: ${productionCode}`,
        `SILEC input: ${input.productionCode}`,
      ].join("\n"),
    );
  }

  const requiredText: Array<
    [
      keyof SilecKnowledgeInput,
      unknown,
    ]
  > = [
    ["topic", input.topic],
    [
      "centralThesis",
      input.centralThesis,
    ],
    [
      "problem",
      input.problem,
    ],
    [
      "conclusion",
      input.conclusion,
    ],
    [
      "commercialObjective",
      input.commercialObjective,
    ],
    ["hook", input.hook],
    [
      "closingIdea",
      input.closingIdea,
    ],
    ["cta", input.cta],
  ];

  for (
    const [field, value]
    of requiredText
  ) {
    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      throw new Error(
        `Invalid or empty SILEC field: ${String(
          field,
        )}`,
      );
    }
  }

  const requiredArrays: Array<
    [
      keyof SilecKnowledgeInput,
      unknown,
    ]
  > = [
    [
      "reasoningChain",
      input.reasoningChain,
    ],
    [
      "targetAudience",
      input.targetAudience,
    ],
    [
      "capabilityDemonstrated",
      input.capabilityDemonstrated,
    ],
    [
      "offerPath",
      input.offerPath,
    ],
  ];

  for (
    const [field, value]
    of requiredArrays
  ) {
    if (
      !Array.isArray(value) ||
      value.length === 0
    ) {
      throw new Error(
        `Invalid or empty SILEC array: ${String(
          field,
        )}`,
      );
    }
  }
}

function main() {
  const productionCode =
    requireProductionCode();

  const inputPath =
    path.join(
      process.cwd(),
      "content",
      `${productionCode}.silec.json`,
    );

  const outputPath =
    path.join(
      process.cwd(),
      "public",
      "generated",
      `${productionCode}-strategic-content.json`,
    );

  const input =
    readJson<SilecKnowledgeInput>(
      inputPath,
    );

  validateInput(
    input,
    productionCode,
  );

  const packet =
    buildSilecStrategicPacket(
      input,
    );

  fs.mkdirSync(
    path.dirname(
      outputPath,
    ),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      packet,
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    "==============================================",
  );

  console.log(
    "V3.16-C — UNIVERSAL SILEC → Q∞ BRIDGE",
  );

  console.log(
    "==============================================",
  );

  console.log(
    `Production: ${packet.productionCode}`,
  );

  console.log(
    `Source: ${packet.source.module}`,
  );

  console.log(
    `Topic: ${packet.knowledge.topic}`,
  );

  console.log(
    `Commercial objective: ${packet.strategicObjective.commercialObjective}`,
  );

  console.log(
    `Q∞ strategic value: ${packet.qInfinity.strategicValue}/100`,
  );

  console.log(
    `Input: ${inputPath}`,
  );

  console.log(
    `Output: ${outputPath}`,
  );

  console.log(
    "✅ Strategic content packet generated.",
  );

  console.log(
    "==============================================",
  );
}

main();
