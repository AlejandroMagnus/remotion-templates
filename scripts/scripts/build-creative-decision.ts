import fs from "node:fs";
import path from "node:path";

import {
  selectCreativeProfile,
  type CreativeIntent,
  type CreativeMemoryItem,
} from "../src/strategy/CreativeDiversityDirector";

import type {
  QInfinityStrategicContentPacket,
} from "../src/strategy/QInfinityStrategicContentPacket";

/**
 * V3.18-C — CREATIVE DECISION EXECUTOR
 *
 * Entrada:
 * public/generated/<production>-strategic-content.json
 * public/generated/<production>-creative-memory.json
 *
 * Salida:
 * public/generated/<production>-creative-decision.json
 *
 * Responsabilidad:
 * contenido estratégico
 * + memoria creativa histórica
 * → decisión de CÓMO contar el nuevo video.
 *
 * No modifica Supabase.
 * No modifica VideoSpec.
 * No selecciona assets.
 * No renderiza.
 */

type CreativeMemoryFile = {
  version:
    string;

  productionCode:
    string;

  memorySize:
    number;

  items:
    CreativeMemoryItem[];
};

function getProductionCode():
  string {
  const value =
    process.argv[2]?.trim() ||
    process.env.PRODUCTION_CODE?.trim();

  if (!value) {
    throw new Error(
      [
        "Production code no definido.",
        "",
        "Uso:",
        "npx tsx scripts/build-creative-decision.ts video-juridico-010",
      ].join("\n"),
    );
  }

  return value;
}

function generatedPath(
  productionCode: string,
  suffix: string,
): string {
  return path.join(
    process.cwd(),
    "public",
    "generated",
    `${productionCode}-${suffix}.json`,
  );
}

function readJson<T>(
  filePath: string,
): T {
  if (
    !fs.existsSync(
      filePath,
    )
  ) {
    throw new Error(
      `Archivo requerido no existe: ${filePath}`,
    );
  }

  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8",
    ),
  ) as T;
}

function writeJson(
  filePath: string,
  value: unknown,
): void {
  fs.mkdirSync(
    path.dirname(
      filePath,
    ),
    {
      recursive:
        true,
    },
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      value,
      null,
      2,
    ),
    "utf8",
  );
}

function validatePacket(
  packet:
    QInfinityStrategicContentPacket,
  productionCode:
    string,
): void {
  if (
    packet.productionCode !==
    productionCode
  ) {
    throw new Error(
      "El paquete estratégico no corresponde al production code solicitado.",
    );
  }

  if (
    !packet.knowledge?.topic ||
    !packet.knowledge
      ?.centralThesis ||
    !packet.knowledge
      ?.problem
  ) {
    throw new Error(
      "Paquete estratégico incompleto para decisión creativa.",
    );
  }
}

function validateMemory(
  memory:
    CreativeMemoryFile,
  productionCode:
    string,
): void {
  if (
    memory.productionCode !==
    productionCode
  ) {
    throw new Error(
      "La memoria creativa no corresponde al production code solicitado.",
    );
  }

  if (
    !Array.isArray(
      memory.items,
    )
  ) {
    throw new Error(
      "Memoria creativa inválida: items no es un array.",
    );
  }
}

function buildIntent(
  packet:
    QInfinityStrategicContentPacket,
): CreativeIntent {
  return {
    productionCode:
      packet.productionCode,

    topic:
      packet.knowledge.topic,

    thesis:
      packet.knowledge
        .centralThesis,

    problem:
      packet.knowledge.problem,

    capabilities:
      packet
        .strategicObjective
        .capabilityDemonstrated ??
      [],

    commercialObjective:
      packet
        .strategicObjective
        .commercialObjective ??
      "",
  };
}

function main():
  void {
  const productionCode =
    getProductionCode();

  const strategicPath =
    generatedPath(
      productionCode,
      "strategic-content",
    );

  const memoryPath =
    generatedPath(
      productionCode,
      "creative-memory",
    );

  const outputPath =
    generatedPath(
      productionCode,
      "creative-decision",
    );

  const packet =
    readJson<
      QInfinityStrategicContentPacket
    >(
      strategicPath,
    );

  const memory =
    readJson<
      CreativeMemoryFile
    >(
      memoryPath,
    );

  validatePacket(
    packet,
    productionCode,
  );

  validateMemory(
    memory,
    productionCode,
  );

  const intent =
    buildIntent(
      packet,
    );

  const decision =
    selectCreativeProfile(
      intent,
      memory.items,
    );

  writeJson(
    outputPath,
    {
      version:
        "V3.18-C-CREATIVE-DECISION",

      productionCode,

      generatedAt:
        new Date()
          .toISOString(),

      intent,

      memorySize:
        decision.memorySize,

      selected:
        decision.selected,

      rationale:
        decision.rationale,

      ranking:
        decision.ranking.map(
          (
            candidate,
          ) => ({
            genre:
              candidate
                .profile
                .genre,

            narrativeArchitecture:
              candidate
                .profile
                .narrativeArchitecture,

            semanticScore:
              candidate
                .semanticScore,

            diversityScore:
              candidate
                .diversityScore,

            finalScore:
              candidate
                .finalScore,

            reasons:
              candidate
                .reasons,
          }),
        ),
    },
  );

  console.log("");
  console.log(
    "==============================================",
  );

  console.log(
    "V3.18-C — CREATIVE DECISION",
  );

  console.log(
    "==============================================",
  );

  console.log(
    `Production: ${productionCode}`,
  );

  console.log(
    `Topic: ${intent.topic}`,
  );

  console.log(
    `Creative memory: ${decision.memorySize}`,
  );

  console.log("");
  console.log(
    "PERFIL SELECCIONADO",
  );

  console.log(
    `Genre: ${decision.selected.genre}`,
  );

  console.log(
    `Narrative architecture: ${decision.selected.narrativeArchitecture}`,
  );

  console.log(
    `Rhythm: ${decision.selected.rhythm}`,
  );

  console.log(
    `Visual language: ${decision.selected.visualLanguage}`,
  );

  console.log(
    `Camera: ${decision.selected.cameraProfile}`,
  );

  console.log(
    `Transitions: ${decision.selected.transitionProfile}`,
  );

  console.log(
    `Graphic density: ${decision.selected.graphicDensity}`,
  );

  console.log(
    `Prosody: ${decision.selected.prosody}`,
  );

  console.log(
    `CTA: ${decision.selected.ctaStrategy}`,
  );

  console.log(
    "Media mix: " +
    `${decision.selected.mediaMix.photo}% photo / ` +
    `${decision.selected.mediaMix.video}% video / ` +
    `${decision.selected.mediaMix.graphic}% graphic / ` +
    `${decision.selected.mediaMix.threeD}% 3D`,
  );

  console.log("");
  console.log(
    "TOP 3 CREATIVE OPTIONS",
  );

  decision.ranking
    .slice(
      0,
      3,
    )
    .forEach(
      (
        candidate,
        index,
      ) => {
        console.log(
          `${index + 1}. ` +
          `${candidate.profile.genre} | ` +
          `semantic=${candidate.semanticScore} | ` +
          `diversity=${candidate.diversityScore} | ` +
          `final=${candidate.finalScore}`,
        );
      },
    );

  console.log("");
  console.log(
    `Decision: ${outputPath}`,
  );

  console.log(
    "==============================================",
  );

  console.log(
    "✅ Creative decision generated.",
  );
}

main();
