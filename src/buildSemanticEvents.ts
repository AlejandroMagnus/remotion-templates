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
 * ============================================================
 * V3.4 — CONTINUIDAD SEMÁNTICA
 * ============================================================
 */

const MAX_EVENT_HOLD_MS = 6000;

const FINAL_EVENT_HOLD_MS = 4500;

/**
 * Solo creamos filler cuando existe
 * un hueco visual perceptible.
 */
const MIN_FILLER_GAP_MS = 800;

/**
 * Evita dejar un mismo filler demasiado tiempo.
 * En huecos largos se generan varios fillers.
 */
const MAX_FILLER_DURATION_MS = 3500;

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
  const tokens = tokenizeKeyword(keyword);

  if (tokens.length === 0) {
    return false;
  }

  if (
    startIndex + tokens.length >
    words.length
  ) {
    return false;
  }

  return tokens.every(
    (token, offset) =>
      normalize(
        words[startIndex + offset].text,
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

const neutralVisualTypes: SemanticVisualType[] = [
  "document",
  "evidence",
  "process",
];

const toNeutralType = (
  type?: SemanticVisualType,
): SemanticVisualType | null => {
  if (
    type === "document" ||
    type === "evidence" ||
    type === "process"
  ) {
    return type;
  }

  if (type === "keyword") {
    return "document";
  }

  return null;
};

const chooseFillerVisualType = (
  previous:
    | SemanticEvent
    | undefined,
  next:
    | SemanticEvent
    | undefined,
  fillerIndex: number,
): SemanticVisualType => {
  const contextual =
    toNeutralType(
      previous?.visualType,
    ) ??
    toNeutralType(
      next?.visualType,
    );

  if (contextual) {
    const baseIndex =
      neutralVisualTypes.indexOf(
        contextual,
      );

    return neutralVisualTypes[
      (baseIndex +
        fillerIndex) %
        neutralVisualTypes.length
    ];
  }

  return neutralVisualTypes[
    fillerIndex %
      neutralVisualTypes.length
  ];
};

const fillerConcept = (
  previous:
    | SemanticEvent
    | undefined,
  next:
    | SemanticEvent
    | undefined,
): string => {
  if (previous && next) {
    return `continuidad audiovisual entre ${previous.concept} y ${next.concept}`;
  }

  if (previous) {
    return `continuidad audiovisual posterior a ${previous.concept}`;
  }

  if (next) {
    return `continuidad audiovisual previa a ${next.concept}`;
  }

  return "continuidad audiovisual contextual";
};

const createFillersForGap = (
  startMs: number,
  endMs: number,
  previous:
    | SemanticEvent
    | undefined,
  next:
    | SemanticEvent
    | undefined,
  initialIndex: number,
): SemanticEvent[] => {
  const totalGap =
    endMs - startMs;

  if (
    totalGap <
    MIN_FILLER_GAP_MS
  ) {
    return [];
  }

  const fillers:
    SemanticEvent[] = [];

  let cursor =
    startMs;

  let fillerIndex =
    initialIndex;

  while (
    endMs - cursor >=
    MIN_FILLER_GAP_MS
  ) {
    let sliceEnd =
      Math.min(
        cursor +
          MAX_FILLER_DURATION_MS,
        endMs,
      );

    /**
     * Evita dejar al final
     * un microhueco inútil.
     */
    if (
      endMs - sliceEnd <
      MIN_FILLER_GAP_MS
    ) {
      sliceEnd =
        endMs;
    }

    const visualType =
      chooseFillerVisualType(
        previous,
        next,
        fillerIndex,
      );

    fillers.push({
      id:
        `semantic-filler-${cursor}-${fillerIndex}`,
      ruleId:
        "semantic-filler",
      visualType,
      concept:
        fillerConcept(
          previous,
          next,
        ),
      matchedKeyword:
        "__semantic_filler__",
      startMs:
        cursor,
      endMs:
        sliceEnd,
      durationMs:
        sliceEnd -
        cursor,
      priority: 1,
    });

    cursor =
      sliceEnd;

    fillerIndex += 1;
  }

  return fillers;
};

export const buildSemanticEvents = (
  words: WordTiming[],
  rules: SemanticRule[] =
    semanticRules,
): SemanticEvent[] => {
  if (
    words.length === 0
  ) {
    return [];
  }

  const detected:
    SemanticEvent[] = [];

  /**
   * ============================================================
   * 1. DETECCIÓN SEMÁNTICA
   * ============================================================
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
   * ============================================================
   * 2. DEDUPLICACIÓN
   * ============================================================
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
   * ============================================================
   * 3. ORDEN TEMPORAL
   * ============================================================
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
   * ============================================================
   * 4. COLAPSAR EVENTOS SIMULTÁNEOS
   * ============================================================
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

  const timelineStart =
    words[0].startMs;

  const timelineEnd =
    words[
      words.length - 1
    ].endMs;

  /**
   * ============================================================
   * 5. PERMANENCIA SEMÁNTICA
   * ============================================================
   */

  const held =
    collapsed.map(
      (event, index) => {
        const next =
          collapsed[
            index + 1
          ];

        const maximumEnd =
          Math.min(
            event.startMs +
              MAX_EVENT_HOLD_MS,
            timelineEnd,
          );

        let endMs =
          Math.min(
            event.endMs,
            timelineEnd,
          );

        if (next) {
          const bridgeEnd =
            Math.min(
              next.startMs,
              maximumEnd,
            );

          endMs =
            Math.max(
              endMs,
              bridgeEnd,
            );

          endMs =
            Math.min(
              endMs,
              next.startMs,
            );
        } else {
          endMs =
            Math.max(
              endMs,
              Math.min(
                event.startMs +
                  FINAL_EVENT_HOLD_MS,
                timelineEnd,
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

  /**
   * ============================================================
   * 6. SEMANTIC FILLERS
   * ============================================================
   *
   * Detectamos cualquier tramo de narración
   * que todavía no tenga cobertura visual.
   *
   * Ese tramo recibe visuales neutrales
   * contextualizados.
   */

  const fillers:
    SemanticEvent[] = [];

  let cursor =
    timelineStart;

  let previousSemantic:
    | SemanticEvent
    | undefined;

  let fillerCounter =
    0;

  for (
    const event of held
  ) {
    if (
      event.startMs >
      cursor
    ) {
      const generated =
        createFillersForGap(
          cursor,
          event.startMs,
          previousSemantic,
          event,
          fillerCounter,
        );

      fillers.push(
        ...generated,
      );

      fillerCounter +=
        generated.length;
    }

    cursor =
      Math.max(
        cursor,
        event.endMs,
      );

    previousSemantic =
      event;
  }

  /**
   * Filler final hasta terminar
   * la narración.
   */
  if (
    timelineEnd >
    cursor
  ) {
    const generated =
      createFillersForGap(
        cursor,
        timelineEnd,
        previousSemantic,
        undefined,
        fillerCounter,
      );

    fillers.push(
      ...generated,
    );
  }

  /**
   * ============================================================
   * 7. TIMELINE FINAL
   * ============================================================
   *
   * Los eventos verdaderamente semánticos
   * conservan prioridad alta.
   *
   * Los fillers tienen prioridad 1.
   *
   * Por tanto, si alguna vez se solapan,
   * gana siempre el concepto real.
   */

  return [
    ...held,
    ...fillers,
  ].sort((a, b) => {
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
};
