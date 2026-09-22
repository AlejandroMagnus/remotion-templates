import fs from "node:fs";
import path from "node:path";

import {
  buildSilecStrategicPacket,
  type SilecKnowledgeInput,
} from "../src/content/SilecContentAdapter";

/**
 * V3.16-C — UNIVERSAL SILEC → Q∞ BRIDGE
 *
 * Entrada:
 * content/<production-code>.silec.json
 *
 * Salida:
 * public/generated/<production-code>-strategic-content.json
 *
 * Responsabilidad:
 * transformar conocimiento jurídico estructurado
 * por la capa SILEC / PhD 12 en un paquete
 * estratégico consumible por Q∞ y por la
 * Memoria Editorial.
 *
 * NO inventa conocimiento jurídico.
 * NO dirige cinematografía.
 * NO genera assets.
 * NO renderiza.
 */

function getProductionCode(): string {
  const productionCode =
    process.env.PRODUCTION_CODE?.trim() ||
    process.argv[2]?.trim();

  if (!productionCode) {
    throw new Error(
      [
        "Production code no definido.",
        "",
        "Use PRODUCTION_CODE o:",
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
        `Input SILEC inexistente: ${filePath}`,
        "",
        "La producción requiere primero",
        "un input jurídico estructurado",
        "por la capa SILEC / PhD 12.",
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
): void {
  if (
    input.productionCode !==
    productionCode
  ) {
    throw new Error(
      [
        "Production code no coincide.",
        `Solicitado: ${productionCode}`,
        `Input SILEC: ${input.productionCode}`,
      ].join("\n"),
    );
  }

  const requiredStrings: Array<
    [
      string,
      unknown,
    ]
  > = [
    [
      "topic",
      input.topic,
    ],
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
    [
      "hook",
      input.hook,
    ],
    [
      "closingIdea",
      input.closingIdea,
    ],
    [
      "cta",
      input.cta,
    ],
  ];

  for (
    const [field, value]
    of requiredStrings
  ) {
    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      throw new Error(
        `Campo SILEC inválido o vacío: ${field}`,
      );
    }
  }

  const requiredArrays: Array<
    [
      string,
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
        `Array SILEC inválido o vacío: ${field}`,
      );
    }
  }
}

function main(): void {
  const productionCode =
    getProductionCode();

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
    readJson<
      SilecKnowledgeInput
    >(
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

  console.log("");
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
