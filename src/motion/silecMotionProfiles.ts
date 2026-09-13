import type {
  SemanticMotionProfile,
} from "./semanticMotionDirector";

const SILEC_MOTIONS: Record<
  string,
  SemanticMotionProfile
> = {
  hechos: {
    intent: "facts-reconstruction",
    startScale: 1.11,
    endScale: 1.075,
    startX: -2.6,
    endX: 2.4,
    startY: 1,
    endY: -1,
    startRotate: -0.12,
    endRotate: 0.12,
  },

  norma: {
    intent: "law-controlled-focus",
    startScale: 1.05,
    endScale: 1.13,
    startX: 0.8,
    endX: -0.6,
    startY: 1.2,
    endY: -0.8,
    startRotate: 0,
    endRotate: 0,
  },

  jurisprudencia: {
    intent: "precedent-research-pan",
    startScale: 1.12,
    endScale: 1.105,
    startX: -3,
    endX: 3,
    startY: 0.7,
    endY: -0.7,
    startRotate: -0.1,
    endRotate: 0.1,
  },

  "teoria-caso": {
    intent: "case-theory-convergence",
    startScale: 1.055,
    endScale: 1.135,
    startX: -1.7,
    endX: 0,
    startY: 1.6,
    endY: 0,
    startRotate: -0.12,
    endRotate: 0,
  },

  "estrategia-juridica": {
    intent: "strategic-forward-motion",
    startScale: 1.07,
    endScale: 1.135,
    startX: -2.7,
    endX: 2.3,
    startY: 0.8,
    endY: -0.8,
    startRotate: -0.12,
    endRotate: 0.12,
  },

  riesgos: {
    intent: "risk-controlled-tension",
    startScale: 1.065,
    endScale: 1.125,
    startX: 1.8,
    endX: -1.6,
    startY: -0.8,
    endY: 0.9,
    startRotate: 0.15,
    endRotate: -0.15,
  },

  objetivo: {
    intent: "objective-convergence",
    startScale: 1.04,
    endScale: 1.12,
    startX: 1,
    endX: 0,
    startY: 1,
    endY: 0,
    startRotate: 0,
    endRotate: 0,
  },

  diagnostico: {
    intent: "diagnostic-slow-push",
    startScale: 1.05,
    endScale: 1.125,
    startX: -1,
    endX: 1,
    startY: 0.8,
    endY: -0.7,
    startRotate: -0.08,
    endRotate: 0.08,
  },
};

export function getSilecMotionProfile(
  ruleId: string,
): SemanticMotionProfile | null {
  return SILEC_MOTIONS[ruleId] ?? null;
}
