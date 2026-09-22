import type {
  QInfinityStrategicContentPacket,
} from "./QInfinityStrategicContentPacket";

/**
 * V3.16-A — EDITORIAL MEMORY
 *
 * Memoria estratégica de contenido audiovisual.
 *
 * Responsabilidades:
 * - consultar contenido previamente producido;
 * - comparar tema, tesis y conceptos;
 * - detectar repetición editorial;
 * - distinguir repetición de continuidad estratégica;
 * - permitir un nuevo ángulo cuando aporta conocimiento diferente;
 * - preparar el registro automático de nuevas producciones.
 *
 * NO dirige cinematografía.
 * NO genera assets.
 * NO renderiza.
 */

export type EditorialMemoryItem = {
  id?: number;

  contentCode: string;
  topic: string;
  title?: string | null;

  thesis?: string | null;
  subthesis?: string | null;

  narrationText?: string | null;

  concepts: string[];

  semanticFingerprint?: string | null;

  sourceSystem?: string | null;
  sourceReference?: string | null;

  status?: string | null;
  publishedAt?: string | null;
};

export type EditorialNoveltyLevel =
  | "new"
  | "related-new-angle"
  | "high-similarity"
  | "duplicate";

export type EditorialComparison = {
  contentCode: string;

  score: number;

  topicSimilarity: number;
  thesisSimilarity: number;
  conceptSimilarity: number;

  reasons: string[];
};

export type EditorialDecision = {
  approved: boolean;

  noveltyLevel:
    EditorialNoveltyLevel;

  noveltyScore: number;

  highestSimilarity: number;

  closestContentCode:
    string | null;

  comparisons:
    EditorialComparison[];

  reasons: string[];

  recommendation:
    | "produce"
    | "produce-new-angle"
    | "reformulate"
    | "reject-duplicate";
};

const normalize = (
  value: string,
): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9 ]/gi,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();

const STOP_WORDS =
  new Set([
    "a",
    "al",
    "ante",
    "como",
    "con",
    "de",
    "del",
    "el",
    "en",
    "es",
    "esta",
    "este",
    "la",
    "las",
    "lo",
    "los",
    "mas",
    "no",
    "o",
    "para",
    "por",
    "que",
    "se",
    "sin",
    "su",
    "sus",
    "un",
    "una",
    "y",

    "and",
    "for",
    "from",
    "in",
    "is",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
  ]);

function tokens(
  value: string,
): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter(
        (token) =>
          token.length >= 3 &&
          !STOP_WORDS.has(
            token,
          ),
      ),
  );
}

function jaccardSimilarity(
  first: Set<string>,
  second: Set<string>,
): number {
  if (
    first.size === 0 &&
    second.size === 0
  ) {
    return 0;
  }

  const intersection =
    [...first].filter(
      (token) =>
        second.has(token),
    ).length;

  const union =
    new Set([
      ...first,
      ...second,
    ]).size;

  if (union === 0) {
    return 0;
  }

  return (
    intersection /
    union
  );
}

function conceptSimilarity(
  first: string[],
  second: string[],
): number {
  const firstSet =
    tokens(
      first.join(" "),
    );

  const secondSet =
    tokens(
      second.join(" "),
    );

  return jaccardSimilarity(
    firstSet,
    secondSet,
  );
}

function roundScore(
  value: number,
): number {
  return (
    Math.round(
      value * 1000,
    ) / 1000
  );
}

function packetConcepts(
  packet:
    QInfinityStrategicContentPacket,
): string[] {
  return [
    packet.knowledge.topic,
    packet.knowledge.centralThesis,
    packet.knowledge.problem,
    packet.knowledge.conclusion,
    ...packet.knowledge.reasoningChain,
    ...packet.strategicObjective
      .capabilityDemonstrated,
  ];
}

export function createSemanticFingerprint(
  packet:
    QInfinityStrategicContentPacket,
): string {
  const significant =
    [...tokens(
      [
        packet.knowledge.topic,
        packet.knowledge.centralThesis,
        packet.knowledge.problem,
        packet.knowledge.conclusion,
        ...packet.knowledge
          .reasoningChain,
      ].join(" "),
    )]
      .sort()
      .slice(0, 24);

  return significant.join("-");
}

export function compareWithEditorialMemory(
  packet:
    QInfinityStrategicContentPacket,
  memory:
    EditorialMemoryItem[],
): EditorialDecision {
  if (
    memory.length === 0
  ) {
    return {
      approved: true,

      noveltyLevel:
        "new",

      noveltyScore: 1,

      highestSimilarity: 0,

      closestContentCode:
        null,

      comparisons: [],

      reasons: [
        "No previous editorial content was available for comparison.",
      ],

      recommendation:
        "produce",
    };
  }

  const currentTopic =
    tokens(
      packet.knowledge.topic,
    );

  const currentThesis =
    tokens(
      packet.knowledge
        .centralThesis,
    );

  const currentConcepts =
    packetConcepts(packet);

  const comparisons =
    memory
      .filter(
        (item) =>
          item.contentCode !==
          packet.productionCode,
      )
      .map(
        (
          item,
        ): EditorialComparison => {
          const topicScore =
            jaccardSimilarity(
              currentTopic,
              tokens(
                item.topic,
              ),
            );

          const thesisScore =
            jaccardSimilarity(
              currentThesis,
              tokens(
                item.thesis ??
                  "",
              ),
            );

          const conceptsScore =
            conceptSimilarity(
              currentConcepts,
              item.concepts,
            );

          /*
           * La tesis pesa más que
           * compartir simplemente
           * el mismo campo jurídico.
           *
           * Así podemos desarrollar
           * varias piezas sobre contratos,
           * litigios o prueba sin que el
           * sistema las considere
           * automáticamente duplicadas.
           */
          const score =
            topicScore * 0.25 +
            thesisScore * 0.5 +
            conceptsScore * 0.25;

          const reasons:
            string[] = [];

          if (
            topicScore >= 0.5
          ) {
            reasons.push(
              "similar-topic",
            );
          }

          if (
            thesisScore >= 0.5
          ) {
            reasons.push(
              "similar-thesis",
            );
          }

          if (
            conceptsScore >=
            0.5
          ) {
            reasons.push(
              "similar-concepts",
            );
          }

          return {
            contentCode:
              item.contentCode,

            score:
              roundScore(
                score,
              ),

            topicSimilarity:
              roundScore(
                topicScore,
              ),

            thesisSimilarity:
              roundScore(
                thesisScore,
              ),

            conceptSimilarity:
              roundScore(
                conceptsScore,
              ),

            reasons,
          };
        },
      )
      .sort(
        (a, b) =>
          b.score -
          a.score,
      );

  const closest =
    comparisons[0] ??
    null;

  const highestSimilarity =
    closest?.score ??
    0;

  const noveltyScore =
    roundScore(
      Math.max(
        0,
        1 -
          highestSimilarity,
      ),
    );

  if (
    highestSimilarity >=
    0.82
  ) {
    return {
      approved: false,

      noveltyLevel:
        "duplicate",

      noveltyScore,

      highestSimilarity,

      closestContentCode:
        closest.contentCode,

      comparisons,

      reasons: [
        `Very high editorial similarity with ${closest.contentCode}.`,
        "The proposed content should not be produced with the same thesis and angle.",
      ],

      recommendation:
        "reject-duplicate",
    };
  }

  if (
    highestSimilarity >=
    0.64
  ) {
    return {
      approved: false,

      noveltyLevel:
        "high-similarity",

      noveltyScore,

      highestSimilarity,

      closestContentCode:
        closest.contentCode,

      comparisons,

      reasons: [
        `High editorial similarity with ${closest.contentCode}.`,
        "Reformulate the central thesis or strategic angle before production.",
      ],

      recommendation:
        "reformulate",
    };
  }

  if (
    highestSimilarity >=
    0.38
  ) {
    return {
      approved: true,

      noveltyLevel:
        "related-new-angle",

      noveltyScore,

      highestSimilarity,

      closestContentCode:
        closest.contentCode,

      comparisons,

      reasons: [
        `The topic is related to ${closest.contentCode}, but the similarity remains compatible with a differentiated angle.`,
      ],

      recommendation:
        "produce-new-angle",
    };
  }

  return {
    approved: true,

    noveltyLevel:
      "new",

    noveltyScore,

    highestSimilarity,

    closestContentCode:
      closest?.contentCode ??
      null,

    comparisons,

    reasons: [
      "No previous production presents a materially similar thesis and editorial angle.",
    ],

    recommendation:
      "produce",
  };
}

export function buildEditorialMemoryRecord(
  packet:
    QInfinityStrategicContentPacket,
): Omit<
  EditorialMemoryItem,
  "id"
> {
  return {
    contentCode:
      packet.productionCode,

    topic:
      packet.knowledge.topic,

    title:
      packet.audiovisual.hook,

    thesis:
      packet.knowledge
        .centralThesis,

    subthesis:
      packet.knowledge
        .conclusion,

    narrationText:
      null,

    concepts:
      packetConcepts(packet),

    semanticFingerprint:
      createSemanticFingerprint(
        packet,
      ),

    sourceSystem:
      packet.source.ecosystem,

    sourceReference:
      packet.source.module,

    status:
      "planned",

    publishedAt:
      null,
  };
    }
