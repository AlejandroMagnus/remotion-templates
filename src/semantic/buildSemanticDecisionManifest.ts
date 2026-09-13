import type {
  SemanticEvent,
} from "../buildSemanticEvents";

import {
  rankSemanticResources,
  type OndaResource,
  type RankedSemanticResource,
} from "./selectSemanticResource";

export type DirectorDecisionStatus =
  | "ACCEPT"
  | "REVIEW"
  | "REJECT";

export type SemanticDecisionManifest = {
  event: {
    id: string;
    ruleId: string;
    concept: string;
    visualType: string;
    startMs: number;
    endMs: number;
    durationMs: number;
  };

  catalog: {
    totalResources: number;
    evaluatedResources: number;
  };

  candidates: RankedSemanticResource[];

  selected: RankedSemanticResource | null;

  decision: {
    status: DirectorDecisionStatus;
    score: number;
    reasons: string[];
  };
};

const ACCEPT_THRESHOLD = 14;
const REVIEW_THRESHOLD = 8;

export const buildSemanticDecisionManifest = (
  event: SemanticEvent,
  catalog: OndaResource[],
  candidateLimit = 3,
): SemanticDecisionManifest => {
  const candidates: RankedSemanticResource[] =
    rankSemanticResources(
      event,
      catalog,
      candidateLimit,
    );

  const selected: RankedSemanticResource | null =
    candidates[0] ?? null;

  const score: number =
    selected?.score ?? 0;

  let status: DirectorDecisionStatus =
    "REJECT";

  if (score >= ACCEPT_THRESHOLD) {
    status = "ACCEPT";
  } else if (score >= REVIEW_THRESHOLD) {
    status = "REVIEW";
  }

  const reasons: string[] = [];

  if (!selected) {
    reasons.push(
      "No suitable Onda resource was found.",
    );
  } else {
    reasons.push(
      `Selected ${selected.resource.name}.`,
    );

    reasons.push(
      `Score ${selected.score}.`,
    );

    reasons.push(
      ...selected.reasons,
    );
  }

  if (status === "ACCEPT") {
    reasons.push(
      "Resource meets autonomous selection threshold.",
    );
  } else if (status === "REVIEW") {
    reasons.push(
      "Resource is usable but requires Director or QA review.",
    );
  } else {
    reasons.push(
      "Catalog result is insufficient: adapt, combine or generate a new resource.",
    );
  }

  return {
    event: {
      id: event.id,
      ruleId: event.ruleId,
      concept: event.concept,
      visualType: event.visualType,
      startMs: event.startMs,
      endMs: event.endMs,
      durationMs: event.durationMs,
    },

    catalog: {
      totalResources: catalog.length,
      evaluatedResources: catalog.length,
    },

    candidates,
    selected,

    decision: {
      status,
      score,
      reasons,
    },
  };
};
