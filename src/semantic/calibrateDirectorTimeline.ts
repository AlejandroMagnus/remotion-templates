import type {
  SemanticEvent,
} from "../buildSemanticEvents";

/**
 * V3.7.4
 * DIRECTOR DE DURACIÓN ADAPTATIVA
 *
 * PRINCIPIO:
 * una keyword detectada NO determina por sí sola
 * cuánto permanece un visual.
 *
 * El Director decide según:
 * - distancia hasta el próximo concepto;
 * - importancia narrativa;
 * - continuidad;
 * - ritmo;
 * - agrupación de ráfagas;
 * - anticipación moderada del próximo visual.
 */

const BURST_WINDOW_MS = 1600;

const BASE_MIN_HOLD_MS = 3000;

const BASE_MAX_HOLD_MS = 6200;

const MAX_NEXT_PREROLL_MS = 450;

const EARLY_START_BRIDGE_MS = 1600;

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
  const importance =
    importanceOf(event);

  /**
   * Importancia alta aumenta solo
   * moderadamente la permanencia.
   *
   * EXPEDIENTE ya no recibe automáticamente
   * varios segundos extra.
   */
  const bonus =
    Math.max(
      0,
      importance - 8,
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
  const importance =
    importanceOf(event);

  const bonus =
    Math.max(
      0,
      importance - 8,
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

  const distance =
    next.startMs -
    last.startMs;

  /**
   * Ráfaga muy rápida:
   * no permitir varios cambios
   * prácticamente consecutivos.
   */
  if (
    distance <=
    BURST_WINDOW_MS
  ) {
    return true;
  }

  const currentStage =
    stageOf(last);

  const nextStage =
    stageOf(next);

  /**
   * Misma etapa narrativa/procedimental:
   * favorecer continuidad.
   */
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

  /**
   * IMPORTANTE:
   *
   * No utilizamos aquí el endMs heredado
   * de semanticRules.
   *
   * Aquella duración era una pista inicial.
   * Desde V3.7.4 la duración final la decide
   * el Director.
   */
  return {
    ...dominant,

    id:
      `director-shot-${startMs}-${dominant.ruleId}`,

    startMs,

    endMs:
      startMs,

    durationMs: 0,
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
   * Los fillers no deben crear
   * cambios de shot por sí mismos.
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
   * 2. ARRANQUE
   *
   * Evitamos pantalla vacía al inicio
   * si el primer concepto está próximo.
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
   * 3. CALIBRACIÓN ADAPTATIVA
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

    /**
     * Inicio real:
     *
     * puede adelantarse ligeramente
     * para crear continuidad,
     * pero nunca muchos segundos antes
     * de la narración.
     */
    let startMs =
      event.startMs;

    if (previous) {
      const earliestSemanticStart =
        Math.max(
          timelineStartMs,
          event.startMs -
            MAX_NEXT_PREROLL_MS,
        );

      startMs =
        Math.max(
          earliestSemanticStart,
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
      /**
       * El cambio ideal sucede poco
       * antes del siguiente concepto.
       *
       * Así:
       * - el visual actual no dura demasiado;
       * - el siguiente tampoco entra tarde;
       * - reducimos huecos negros.
       */
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

      /**
       * Nunca dejamos un shot sin
       * tiempo suficiente para percibirse.
       */
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
      /**
       * Último shot:
       * permanece lo necesario,
       * pero no indefinidamente.
       */
      endMs =
        Math.min(
          timelineEndMs,
          Math.max(
            startMs +
              minHold,
            Math.min(
              startMs +
                maxHold,
              timelineEndMs,
            ),
          ),
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
   * 4. CONTINUIDAD FINAL
   *
   * Si entre dos shots quedó un pequeño
   * hueco, prolongamos el anterior.
   *
   * No modificamos huecos grandes porque
   * deben resolverse mediante recursos de
   * continuidad, no congelando eternamente
   * una imagen.
   */
  for (
    let index = 0;
    index <
    calibrated.length - 1;
    index += 1
  ) {
    const current =
      calibrated[index];

    const next =
      calibrated[
        index + 1
      ];

    const gap =
      next.startMs -
      current.endMs;

    if (
      gap > 0 &&
      gap <= 900
    ) {
      current.endMs =
        next.startMs;

      current.durationMs =
        current.endMs -
        current.startMs;
    }
  }

  return calibrated;
};
