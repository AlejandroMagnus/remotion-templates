import type {
  SemanticEvent,
} from "../buildSemanticEvents";

const BURST_WINDOW_MS = 1600;

const BASE_MIN_HOLD_MS = 3000;
const BASE_MAX_HOLD_MS = 6200;

const MAX_NEXT_PREROLL_MS = 450;
const EARLY_START_BRIDGE_MS = 1600;

/**
 * Política ZERO-BLACK.
 */
const SHORT_GAP_MS = 1200;
const MEDIUM_GAP_MS = 4500;

/**
 * En huecos muy largos no queremos
 * cambios rápidos. Cada filler puede
 * permanecer hasta ~4 segundos.
 */
const FILLER_TARGET_MS = 4000;
const MAX_VISUAL_HOLD_MS = 6000;

const literalImportance: Record<
  string,
  number
> = {
  expediente: 12,
  plazos: 12,
  recurso: 11,
  "debido-proceso": 11,

  prueba: 10,
  argumentos: 10,
  motivacion: 10,
  decision: 10,

  defensa: 9,
  autoridad: 8,
  ignorar: 8,
  vulneracion: 8,

  "accion-final": 7,
  "semantic-filler": 0,
};

const narrativeStage: Record<
  string,
  number
> = {
  autoridad: 1,

  expediente: 2,

  argumentos: 3,
  prueba: 3,

  motivacion: 4,
  ignorar: 4,
  vulneracion: 4,
  "debido-proceso": 4,
  defensa: 4,

  decision: 5,

  recurso: 6,
  plazos: 6,
  "accion-final": 6,

  "semantic-filler": 0,
};

const importanceOf = (
  event: SemanticEvent,
) =>
  literalImportance[
    event.ruleId
  ] ?? 6;

const stageOf = (
  event: SemanticEvent,
) =>
  narrativeStage[
    event.ruleId
  ] ?? 0;

const adaptiveMinimumHold = (
  event: SemanticEvent,
) => {
  const bonus =
    Math.max(
      0,
      importanceOf(event) - 8,
    ) * 100;

  return Math.min(
    3500,
    BASE_MIN_HOLD_MS +
      bonus,
  );
};

const adaptiveMaximumHold = (
  event: SemanticEvent,
) => {
  const bonus =
    Math.max(
      0,
      importanceOf(event) - 8,
    ) * 125;

  return Math.min(
    6800,
    BASE_MAX_HOLD_MS +
      bonus,
  );
};

const chooseDominantEvent = (
  events: SemanticEvent[],
): SemanticEvent => {
  return [...events].sort(
    (a, b) => {
      const importanceDifference =
        importanceOf(b) -
        importanceOf(a);

      if (
        importanceDifference !== 0
      ) {
        return importanceDifference;
      }

      if (
        b.priority !==
        a.priority
      ) {
        return (
          b.priority -
          a.priority
        );
      }

      return (
        b.startMs -
        a.startMs
      );
    },
  )[0];
};

const shouldGroup = (
  currentGroup:
    SemanticEvent[],
  next:
    SemanticEvent,
): boolean => {
  const last =
    currentGroup[
      currentGroup.length - 1
    ];

  if (
    next.startMs -
      last.startMs <=
    BURST_WINDOW_MS
  ) {
    return true;
  }

  const currentStage =
    stageOf(last);

  const nextStage =
    stageOf(next);

  if (
    currentStage !== 0 &&
    currentStage === nextStage &&
    next.startMs -
      last.startMs <=
      2400
  ) {
    return true;
  }

  return false;
};

const collapseGroup = (
  group: SemanticEvent[],
): SemanticEvent => {
  const dominant =
    chooseDominantEvent(
      group,
    );

  const startMs =
    Math.min(
      ...group.map(
        (event) =>
          event.startMs,
      ),
    );

  return {
    ...dominant,

    id:
      `director-shot-${startMs}-${dominant.ruleId}`,

    startMs,

    /**
     * La duración final ya NO viene
     * impuesta por semanticRules.
     */
    endMs:
      startMs,

    durationMs: 0,
  };
};

const neutralVisualType = (
  previous?: SemanticEvent,
  next?: SemanticEvent,
):
  | "document"
  | "evidence"
  | "process" => {
  const preferred =
    previous?.visualType ??
    next?.visualType;

  if (
    preferred === "document" ||
    preferred === "evidence" ||
    preferred === "process"
  ) {
    return preferred;
  }

  const stage =
    next
      ? stageOf(next)
      : previous
        ? stageOf(previous)
        : 0;

  if (stage <= 2) {
    return "document";
  }

  if (stage === 3) {
    return "evidence";
  }

  return "process";
};

const createContinuityEvent = (
  startMs: number,
  endMs: number,
  previous:
    | SemanticEvent
    | undefined,
  next:
    | SemanticEvent
    | undefined,
  index: number,
): SemanticEvent => {
  const visualType =
    neutralVisualType(
      previous,
      next,
    );

  return {
    id:
      `semantic-filler-${startMs}-${index}`,

    ruleId:
      "semantic-filler",

    visualType,

    concept:
      previous && next
        ? `continuidad narrativa entre ${previous.concept} y ${next.concept}`
        : previous
          ? `continuidad posterior a ${previous.concept}`
          : next
            ? `continuidad previa a ${next.concept}`
            : "continuidad audiovisual",

    matchedKeyword:
      "__continuity__",

    startMs,

    endMs,

    durationMs:
      endMs -
      startMs,

    priority: 1,
  };
};

const fillLongGap = (
  startMs: number,
  endMs: number,
  previous:
    | SemanticEvent
    | undefined,
  next:
    | SemanticEvent
    | undefined,
): SemanticEvent[] => {
  const fillers:
    SemanticEvent[] = [];

  let cursor =
    startMs;

  let index = 0;

  while (
    cursor < endMs
  ) {
    const remaining =
      endMs - cursor;

    /**
     * Evita terminar con un micro-shot.
     */
    const slice =
      remaining <=
      FILLER_TARGET_MS * 1.5
        ? remaining
        : FILLER_TARGET_MS;

    const sliceEnd =
      Math.min(
        endMs,
        cursor + slice,
      );

    fillers.push(
      createContinuityEvent(
        cursor,
        sliceEnd,
        previous,
        next,
        index,
      ),
    );

    cursor =
      sliceEnd;

    index += 1;
  }

  return fillers;
};

export const calibrateDirectorTimeline = (
  events: SemanticEvent[],
  timelineStartMs: number,
  timelineEndMs: number,
): SemanticEvent[] => {
  if (
    events.length === 0
  ) {
    return [];
  }

  const semanticEvents =
    events.filter(
      (event) =>
        event.ruleId !==
        "semantic-filler",
    );

  if (
    semanticEvents.length ===
    0
  ) {
    return [];
  }

  const ordered =
    [...semanticEvents].sort(
      (a, b) =>
        a.startMs -
        b.startMs,
    );

  /**
   * 1. AGRUPACIÓN NARRATIVA
   */

  const groups:
    SemanticEvent[][] = [];

  for (
    const event of ordered
  ) {
    const currentGroup =
      groups[
        groups.length - 1
      ];

    if (!currentGroup) {
      groups.push([
        event,
      ]);

      continue;
    }

    if (
      shouldGroup(
        currentGroup,
        event,
      )
    ) {
      currentGroup.push(
        event,
      );
    } else {
      groups.push([
        event,
      ]);
    }
  }

  const shots =
    groups.map(
      collapseGroup,
    );

  if (
    shots.length === 0
  ) {
    return [];
  }

  /**
   * 2. ARRANQUE SIN NEGRO
   */

  if (
    shots[0].startMs -
      timelineStartMs <=
    EARLY_START_BRIDGE_MS
  ) {
    shots[0].startMs =
      timelineStartMs;
  }

  /**
   * 3. DURACIÓN ADAPTATIVA
   */

  const calibrated:
    SemanticEvent[] = [];

  for (
    let index = 0;
    index < shots.length;
    index += 1
  ) {
    const event =
      shots[index];

    const previous =
      calibrated[
        calibrated.length - 1
      ];

    const next =
      shots[
        index + 1
      ];

    let startMs =
      event.startMs;

    if (previous) {
      startMs =
        Math.max(
          event.startMs -
            MAX_NEXT_PREROLL_MS,
          previous.endMs,
        );
    }

    const minHold =
      adaptiveMinimumHold(
        event,
      );

    const maxHold =
      adaptiveMaximumHold(
        event,
      );

    let endMs: number;

    if (next) {
      const preferredChange =
        Math.max(
          startMs +
            minHold,
          next.startMs -
            MAX_NEXT_PREROLL_MS,
        );

      endMs =
        Math.min(
          preferredChange,
          startMs +
            maxHold,
          timelineEndMs,
        );

      if (
        endMs -
          startMs <
        minHold
      ) {
        endMs =
          Math.min(
            timelineEndMs,
            startMs +
              minHold,
          );
      }
    } else {
      endMs =
        Math.min(
          timelineEndMs,
          startMs +
            maxHold,
        );
    }

    if (
      endMs <=
      startMs
    ) {
      continue;
    }

    calibrated.push({
      ...event,

      startMs,

      endMs,

      durationMs:
        endMs -
        startMs,
    });
  }

  /**
   * 4. ZERO-BLACK CONTINUITY
   */

  const finalTimeline:
    SemanticEvent[] = [];

  for (
    let index = 0;
    index < calibrated.length;
    index += 1
  ) {
    const current =
      calibrated[index];

    const next =
      calibrated[
        index + 1
      ];

    finalTimeline.push(
      current,
    );

    if (!next) {
      continue;
    }

    const gap =
      next.startMs -
      current.endMs;

    if (gap <= 0) {
      continue;
    }

    /**
     * HUECO CORTO
     * → mantener el visual anterior.
     */
    if (
      gap <=
      SHORT_GAP_MS
    ) {
      current.endMs =
        next.startMs;

      current.durationMs =
        current.endMs -
        current.startMs;

      continue;
    }

    /**
     * HUECO MEDIO
     * → un solo filler contextual.
     */
    if (
      gap <=
      MEDIUM_GAP_MS
    ) {
      finalTimeline.push(
        createContinuityEvent(
          current.endMs,
          next.startMs,
          current,
          next,
          index,
        ),
      );

      continue;
    }

    /**
     * HUECO LARGO
     * → continuidad pausada.
     */
    finalTimeline.push(
      ...fillLongGap(
        current.endMs,
        next.startMs,
        current,
        next,
      ),
    );
  }

  /**
   * 5. FINAL DEL VIDEO
   */

  const last =
    finalTimeline[
      finalTimeline.length - 1
    ];

  if (
    last &&
    last.endMs <
      timelineEndMs
  ) {
    const remaining =
      timelineEndMs -
      last.endMs;

    if (
      remaining <=
      SHORT_GAP_MS
    ) {
      last.endMs =
        timelineEndMs;

      last.durationMs =
        last.endMs -
        last.startMs;
    } else {
      finalTimeline.push(
        ...fillLongGap(
          last.endMs,
          timelineEndMs,
          last,
          undefined,
        ),
      );
    }
  }

  return finalTimeline;
};
