import type {
  SemanticEvent,
} from "../buildSemanticEvents";

import {
  rankSemanticResources,
  type OndaResource,
  type RankedSemanticResource,
} from "./selectSemanticResource";

import type {
  DirectorDecisionStatus,
  SemanticDecisionManifest,
} from "./buildSemanticDecisionManifest";

const ACCEPT_THRESHOLD = 14;
const REVIEW_THRESHOLD = 8;

type DirectorMemory = {
  recentResources: string[];
  recentCategories: string[];
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const adjustCandidate = (
  event: SemanticEvent,
  candidate: RankedSemanticResource,
  memory: DirectorMemory,
): RankedSemanticResource => {
  let adjustment = 0;

  const reasons = [
    ...candidate.reasons,
  ];

  const resourceName =
    candidate.resource.name;

  const searchable = normalize(
    `${candidate.resource.name} ${candidate.resource.title} ${candidate.resource.description}`,
  );

  /**
   * 1. ANTI-REPETICIÓN
   */

  if (
    memory.recentResources[0] ===
    resourceName
  ) {
    adjustment -= 12;

    reasons.push(
      "immediate-repetition:-12",
    );
  } else if (
    memory.recentResources.includes(
      resourceName,
    )
  ) {
    adjustment -= 6;

    reasons.push(
      "recent-repetition:-6",
    );
  }

  /**
   * 2. DIVERSIDAD DE CATEGORÍA
   */

  if (
    memory.recentCategories[0] ===
    candidate.resource.category
  ) {
    adjustment -= 2;

    reasons.push(
      "category-repetition:-2",
    );
  }

  /**
   * 3. FILLERS
   *
   * Un filler debe mantener continuidad,
   * no parecer CTA, cierre o tarjeta
   * textual repetitiva.
   */

  if (
    event.ruleId ===
    "semantic-filler"
  ) {
    if (
      candidate.resource.category ===
      "scenes"
    ) {
      adjustment += 6;

      reasons.push(
        "filler-scene-fit:+6",
      );
    }

    if (
      candidate.resource.category ===
      "media"
    ) {
      adjustment += 5;

      reasons.push(
        "filler-media-fit:+5",
      );
    }

    if (
      candidate.resource.category ===
      "graphics"
    ) {
      adjustment += 2;

      reasons.push(
        "filler-graphics-fit:+2",
      );
    }

    if (
      /(quote|chapter|end card|end-card|outro|cta)/.test(
        searchable,
      )
    ) {
      adjustment -= 10;

      reasons.push(
        "filler-text-card-penalty:-10",
      );
    }
  }

  /**
   * 4. ADECUACIÓN TEMPORAL
   */

  if (
    event.durationMs <= 2500
  ) {
    if (
      candidate.resource.category ===
      "entrances"
    ) {
      adjustment += 4;

      reasons.push(
        "short-event-entrance:+4",
      );
    }

    if (
      candidate.resource.category ===
      "graphics"
    ) {
      adjustment += 3;

      reasons.push(
        "short-event-graphics:+3",
      );
    }
  } else if (
    event.durationMs <= 6000
  ) {
    if (
      candidate.resource.category ===
      "scenes"
    ) {
      adjustment += 4;

      reasons.push(
        "medium-event-scene:+4",
      );
    }

    if (
      candidate.resource.category ===
      "graphics"
    ) {
      adjustment += 2;

      reasons.push(
        "medium-event-graphics:+2",
      );
    }
  } else {
    if (
      candidate.resource.category ===
      "scenes"
    ) {
      adjustment += 6;

      reasons.push(
        "long-event-scene:+6",
      );
    }

    if (
      candidate.resource.category ===
      "media"
    ) {
      adjustment += 5;

      reasons.push(
        "long-event-media:+5",
      );
    }
  }

  return {
    ...candidate,
    score:
      candidate.score +
      adjustment,
    reasons,
  };
};

export const buildDirectorDecisionSequence = (
  events: SemanticEvent[],
  catalog: OndaResource[],
  candidateLimit = 3,
): SemanticDecisionManifest[] => {
  const memory: DirectorMemory = {
    recentResources: [],
    recentCategories: [],
  };

  return events.map(
    (
      event,
    ): SemanticDecisionManifest => {
      /**
       * Evaluamos el catálogo completo primero.
       * Después aplicamos inteligencia secuencial.
       */

      const baseCandidates =
        rankSemanticResources(
          event,
          catalog,
          catalog.length,
        );

      const ranked =
        baseCandidates
          .map((candidate) =>
            adjustCandidate(
              event,
              candidate,
              memory,
            ),
          )
          .sort((a, b) => {
            if (
              a.score !== b.score
            ) {
              return (
                b.score -
                a.score
              );
            }

            return a.resource.name.localeCompare(
              b.resource.name,
            );
          });

      const candidates =
        ranked.slice(
          0,
          candidateLimit,
        );

      const selected =
        candidates[0] ?? null;

      const score =
        selected?.score ?? 0;

      let status:
        DirectorDecisionStatus =
          "REJECT";

      if (
        score >=
        ACCEPT_THRESHOLD
      ) {
        status = "ACCEPT";
      } else if (
        score >=
        REVIEW_THRESHOLD
      ) {
        status = "REVIEW";
      }

      const decisionReasons:
        string[] = [];

      if (selected) {
        decisionReasons.push(
          `Selected ${selected.resource.name}.`,
          `Final score ${selected.score}.`,
          ...selected.reasons,
        );
      } else {
        decisionReasons.push(
          "No suitable resource found.",
        );
      }

      if (
        status === "ACCEPT"
      ) {
        decisionReasons.push(
          "Autonomous selection accepted.",
        );
      } else if (
        status === "REVIEW"
      ) {
        decisionReasons.push(
          "Director review recommended.",
        );
      } else {
        decisionReasons.push(
          "Adapt, combine or generate a new audiovisual resource.",
        );
      }

      const manifest:
        SemanticDecisionManifest = {
          event: {
            id: event.id,
            ruleId:
              event.ruleId,
            concept:
              event.concept,
            visualType:
              event.visualType,
            startMs:
              event.startMs,
            endMs:
              event.endMs,
            durationMs:
              event.durationMs,
          },

          catalog: {
            totalResources:
              catalog.length,
            evaluatedResources:
              catalog.length,
          },

          candidates,

          selected,

          decision: {
            status,
            score,
            reasons:
              decisionReasons,
          },
        };

      /**
       * MEMORIA AUDIOVISUAL
       */

      if (selected) {
        memory.recentResources.unshift(
          selected.resource.name,
        );

        memory.recentResources =
          memory.recentResources.slice(
            0,
            3,
          );

        memory.recentCategories.unshift(
          selected.resource.category,
        );

        memory.recentCategories =
          memory.recentCategories.slice(
            0,
            3,
          );
      }

      return manifest;
    },
  );
};
