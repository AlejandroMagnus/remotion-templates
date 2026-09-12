import {
  semanticRules,
  type SemanticRule,
  type SemanticVisualType,
} from "./semantic/semanticRules";

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

/**
 * Tiempo máximo durante el cual un visual puede
 * permanecer esperando al siguiente evento semántico.
 */
const MAX_EVENT_HOLD_MS = 6000;

/**
 * Permanencia del último evento cuando ya no existe
 * otro evento semántico inmediatamente después.
 */
const FINAL_EVENT_HOLD_MS = 4500;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

const tokenizeKeyword = (keyword: string) =>
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
  const keywordTokens =
    tokenizeKeyword(keyword);

  if (keywordTokens.length === 0) {
    return false;
  }

  if (
    startIndex +
      keywordTokens.length >
    words.length
  ) {
    return false;
  }

  return keywordTokens.every(
    (token, offset) =>
      normalize(
        words[startIndex + offset].text,
      ) === token,
  );
};

const createEvent = (
  rule: SemanticRule,
  keyword: string,
  words: WordTiming[],
  startIndex: number,
): SemanticEvent => {
  const keywordTokens =
    tokenizeKeyword(keyword);

  const firstWord =
    words[startIndex];

  const lastWord =
    words[
      startIndex +
        keywordTokens.length -
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
    id: `${rule.id}-${startMs}`,
    ruleId: rule.id,
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
    semanticRules,
): SemanticEvent[] => {
  const detected:
    SemanticEvent[] = [];

  /**
   * 1. Detectar todos los conceptos
   * sobre el timeline V2-SYNC.
   */
  for (
    let wordIndex = 0;
    wordIndex < words.length;
    wordIndex += 1
  ) {
    for (const rule of rules) {
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
          createEvent(
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
   * 2. Eliminar duplicados
   * de la misma regla en
   * el mismo instante.
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
   * 3. Orden temporal.
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
   * 4. Si dos conceptos nacen
   * exactamente en el mismo
   * instante, conservar el de
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

  /**
   * 5. CONTINUIDAD TEMPORAL.
   *
   * Cada visual intenta permanecer
   * hasta el siguiente concepto,
   * pero nunca más de 6 segundos.
   *
   * Esto reduce los espacios negros
   * sin hacer que un visual permanezca
   * indefinidamente.
   */
  return collapsed.map(
    (event, index) => {
      const nextEvent =
        collapsed[index + 1];

      const maximumEnd =
        event.startMs +
        MAX_EVENT_HOLD_MS;

      let endMs =
        event.endMs;

      if (nextEvent) {
        const bridgeEnd =
          Math.min(
            nextEvent.startMs,
            maximumEnd,
          );

        endMs =
          Math.max(
            endMs,
            bridgeEnd,
          );

        /**
         * Nunca invadir el evento
         * semántico siguiente.
         */
        endMs =
          Math.min(
            endMs,
            nextEvent.startMs,
          );
      } else {
        endMs =
          Math.max(
            endMs,
            Math.min(
              event.startMs +
                FINAL_EVENT_HOLD_MS,
              maximumEnd,
            ),
          );
      }

      return {
        ...event,
        endMs,
        durationMs:
          Math.max(
            0,
            endMs -
              event.startMs,
          ),
      };
    },
  );
};
