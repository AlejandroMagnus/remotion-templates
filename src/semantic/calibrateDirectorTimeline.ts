import type {
  SemanticEvent,
} from "../buildSemanticEvents";

/**
 * V3.7.3
 * DIRECTOR DE RITMO Y CONTINUIDAD SEMÁNTICA
 *
 * Objetivos:
 * - evitar cambios visuales nerviosos;
 * - agrupar conceptos narrativamente relacionados;
 * - impedir tres imágenes casi simultáneas;
 * - mantener continuidad visual;
 * - reducir huecos negros;
 * - priorizar conceptos visualmente concretos;
 * - separar palabra detectada de verdadera decisión de montaje.
 */

const BURST_WINDOW_MS = 1800;

const MIN_VISUAL_HOLD_MS = 3200;

const IMPORTANT_VISUAL_HOLD_MS = 4200;

const MAX_VISUAL_HOLD_MS = 7000;

const EARLY_START_BRIDGE_MS = 1800;

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
  event.priority * 10 +
  (literalImportance[
    event.ruleId
  ] ?? 0);

const stageOf = (
  event: SemanticEvent,
) =>
  narrativeStage[
    event.ruleId
  ] ?? 0;

const chooseDominantEvent = (
  events: SemanticEvent[],
): SemanticEvent => {
  return [...events].sort(
    (a, b) => {
      const scoreDifference =
        importanceOf(b) -
        importanceOf(a);

      if (
        scoreDifference !== 0
      ) {
        return scoreDifference;
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

  const startDistance =
    next.startMs -
    last.startMs;

  if (
    startDistance <=
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
      last.endMs <=
      BURST_WINDOW_MS
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

  const endMs =
    Math.max(
      ...group.map(
        (event) =>
          event.endMs,
      ),
    );

  return {
    ...dominant,

    id:
      `director-shot-${startMs}-${dominant.ruleId}`,

    startMs,

    endMs,

    durationMs:
      endMs - startMs,
  };
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

  /**
   * Los fillers no deben provocar
   * nuevos cortes por sí solos.
   */
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
   * 1. AGRUPAR RÁFAGAS
   *
   * Tres conceptos muy cercanos
   * ya no producen tres imágenes.
   */
  const groups:
    SemanticEvent[][] = [];

  for (
    const event of ordered
  ) {
    const current =
      groups[
        groups.length - 1
      ];

    if (!current) {
      groups.push([
        event,
      ]);

      continue;
    }

    if (
      shouldGroup(
        current,
        event,
      )
    ) {
      current.push(
        event,
      );
    } else {
      groups.push([
        event,
      ]);
    }
  }

  let shots =
    groups.map(
      collapseGroup,
    );

  /**
   * 2. ARRANQUE VISUAL
   *
   * Si el primer concepto aparece
   * casi al inicio, comenzamos el
   * visual desde el principio para
   * evitar fondo vacío.
   */
  const first =
    shots[0];

  if (
    first.startMs -
      timelineStartMs <=
    EARLY_START_BRIDGE_MS
  ) {
    first.startMs =
      timelineStartMs;

    first.durationMs =
      first.endMs -
      first.startMs;
  }

  /**
   * 3. RITMO MÍNIMO
   *
   * El Director evita sustituir
   * un visual antes de que pueda
   * ser realmente percibido.
   */
  for (
    let index = 1;
    index < shots.length;
    index += 1
  ) {
    const previous =
      shots[index - 1];

    const current =
      shots[index];

    const previousMinimum =
      literalImportance[
        previous.ruleId
      ] >= 10
        ? IMPORTANT_VISUAL_HOLD_MS
        : MIN_VISUAL_HOLD_MS;

    const earliestChange =
      previous.startMs +
      previousMinimum;

    if (
      current.startMs <
      earliestChange
    ) {
      current.startMs =
        Math.min(
          earliestChange,
          current.endMs,
        );
    }
  }

  /**
   * Eliminar cualquier evento
   * que haya quedado sin duración
   * útil tras la calibración.
   */
  shots =
    shots.filter(
      (event) =>
        event.endMs >
        event.startMs,
    );

  /**
   * 4. CONTINUIDAD
   *
   * Cada visual permanece hasta
   * el siguiente cambio decidido
   * por el Director.
   *
   * Esto prácticamente elimina
   * los huecos negros.
   */
  return shots.map(
    (event, index) => {
      const next =
        shots[
          index + 1
        ];

      let endMs =
        event.endMs;

      if (next) {
        endMs =
          Math.min(
            next.startMs,
            event.startMs +
              MAX_VISUAL_HOLD_MS,
          );

        if (
          endMs <
          event.endMs
        ) {
          endMs =
            event.endMs;
        }

        endMs =
          Math.min(
            endMs,
            next.startMs,
          );
      } else {
        endMs =
          Math.min(
            timelineEndMs,
            Math.max(
              event.endMs,
              event.startMs +
                IMPORTANT_VISUAL_HOLD_MS,
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
