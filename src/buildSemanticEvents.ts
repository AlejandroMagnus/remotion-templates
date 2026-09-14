import {
  semanticRules,
  type SemanticRule,
  type SemanticVisualType,
} from "./semantic/semanticRules";

import {silecSemanticRules} from "./semantic/silecSemanticRules";
import {highTicketSemanticRules} from "./semantic/highTicketSemanticRules";
import {
  calibrateDirectorTimeline,
} from "./semantic/calibrateDirectorTimeline";

const DEFAULT_SEMANTIC_RULES: SemanticRule[] = [
  ...semanticRules,
  ...silecSemanticRules,
  ...highTicketSemanticRules,
];

export type WordTiming = {
  text: string;
  startMs: number;
  endMs: number;
};

export type SemanticEvent = {
  id: string;
  ruleId: string;
  visualType: SemanticVisualType;
  concept: string;
  matchedKeyword: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  priority: number;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

const tokenizeKeyword = (
  keyword: string,
) =>
  keyword
    .trim()
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);

const matchesKeywordAt = (
  words: WordTiming[],
  startIndex: number,
  keyword: string,
): boolean => {
  const tokens =
    tokenizeKeyword(keyword);

  if (tokens.length === 0) {
    return false;
  }

  if (
    startIndex +
      tokens.length >
    words.length
  ) {
    return false;
  }

  return tokens.every(
    (token, offset) =>
      normalize(
        words[
          startIndex +
            offset
        ].text,
      ) === token,
  );
};

const createSemanticEvent = (
  rule: SemanticRule,
  keyword: string,
  words: WordTiming[],
  startIndex: number,
): SemanticEvent => {
  const tokens =
    tokenizeKeyword(keyword);

  const firstWord =
    words[startIndex];

  const lastWord =
    words[
      startIndex +
        tokens.length -
        1
    ];

  const startMs =
    firstWord.startMs;

  const minimumEndMs =
    lastWord.endMs;

  const plannedEndMs =
    startMs +
    rule.durationMs;

  const endMs =
    Math.max(
      minimumEndMs,
      plannedEndMs,
    );

  return {
    id:
      `${rule.id}-${startMs}`,

    ruleId:
      rule.id,

    visualType:
      rule.visualType,

    concept:
      rule.concept,

    matchedKeyword:
      keyword,

    startMs,

    endMs,

    durationMs:
      endMs - startMs,

    priority:
      rule.priority,
  };
};

export const buildSemanticEvents = (
  words: WordTiming[],
  rules: SemanticRule[] =
    DEFAULT_SEMANTIC_RULES,
): SemanticEvent[] => {
  if (
    words.length === 0
  ) {
    return [];
  }

  const detected:
    SemanticEvent[] = [];

  /**
   * 1. DETECCIÓN SEMÁNTICA
   */

  for (
    let wordIndex = 0;
    wordIndex <
    words.length;
    wordIndex += 1
  ) {
    for (
      const rule of rules
    ) {
      for (
        const keyword of
        rule.keywords
      ) {
        if (
          !matchesKeywordAt(
            words,
            wordIndex,
            keyword,
          )
        ) {
          continue;
        }

        detected.push(
          createSemanticEvent(
            rule,
            keyword,
            words,
            wordIndex,
          ),
        );
      }
    }
  }

  /**
   * 2. DEDUPLICACIÓN
   */

  const deduplicated =
    new Map<
      string,
      SemanticEvent
    >();

  for (
    const event of detected
  ) {
    const key =
      `${event.ruleId}-${event.startMs}`;

    const existing =
      deduplicated.get(key);

    if (
      !existing ||
      event.priority >
        existing.priority
    ) {
      deduplicated.set(
        key,
        event,
      );
    }
  }

  /**
   * 3. ORDEN TEMPORAL
   */

  const ordered =
    Array.from(
      deduplicated.values(),
    ).sort((a, b) => {
      if (
        a.startMs !==
        b.startMs
      ) {
        return (
          a.startMs -
          b.startMs
        );
      }

      return (
        b.priority -
        a.priority
      );
    });

  /**
   * 4. EVENTOS SIMULTÁNEOS
   *
   * Si dos reglas empiezan exactamente
   * en el mismo instante, gana la de
   * mayor prioridad.
   */

  const collapsed:
    SemanticEvent[] = [];

  for (
    const event of ordered
  ) {
    const previous =
      collapsed[
        collapsed.length - 1
      ];

    if (
      previous &&
      previous.startMs ===
        event.startMs
    ) {
      if (
        event.priority >
        previous.priority
      ) {
        collapsed[
          collapsed.length - 1
        ] = event;
      }

      continue;
    }

    collapsed.push(event);
  }

  if (
    collapsed.length === 0
  ) {
    return [];
  }

  /**
   * 5. DIRECTOR DE RITMO Y CONTINUIDAD
   *
   * Desde aquí ya NO manda cada keyword.
   *
   * El Director:
   *
   * - agrupa ráfagas;
   * - selecciona el concepto dominante;
   * - evita cambios nerviosos;
   * - mantiene visuales;
   * - construye continuidad;
   * - reduce huecos vacíos.
   */

  const timelineStartMs =
    words[0].startMs;

  const timelineEndMs =
    words[
      words.length - 1
    ].endMs;

  return calibrateDirectorTimeline(
    collapsed,
    timelineStartMs,
    timelineEndMs,
  );
};
