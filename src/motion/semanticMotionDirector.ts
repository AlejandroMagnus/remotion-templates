import {getHighTicketMotionProfile} from "./highTicketMotionProfiles";
import {getSilecMotionProfile} from "./silecMotionProfiles";

export type SemanticMotionProfile = {
  intent: string;

  startScale: number;
  endScale: number;

  startX: number;
  endX: number;

  startY: number;
  endY: number;

  startRotate: number;
  endRotate: number;
};

const MOTIONS: Record<string, SemanticMotionProfile> = {
  autoridad: {
    intent: "authority-slow-push",
    startScale: 1.045,
    endScale: 1.135,
    startX: 0,
    endX: 0,
    startY: 1.2,
    endY: -1.1,
    startRotate: 0,
    endRotate: 0,
  },

  expediente: {
    intent: "document-detail-pan",
    startScale: 1.12,
    endScale: 1.14,
    startX: -3.2,
    endX: 3.2,
    startY: 0.7,
    endY: -0.7,
    startRotate: -0.15,
    endRotate: 0.15,
  },

  argumentos: {
    intent: "argument-investigation",
    startScale: 1.08,
    endScale: 1.14,
    startX: 2.6,
    endX: -2.4,
    startY: 0.8,
    endY: -0.8,
    startRotate: 0.15,
    endRotate: -0.15,
  },

  prueba: {
    intent: "evidence-examination",
    startScale: 1.14,
    endScale: 1.075,
    startX: -2,
    endX: 1.8,
    startY: 1.8,
    endY: -1.8,
    startRotate: -0.1,
    endRotate: 0.1,
  },

  motivacion: {
    intent: "reasoning-slow-focus",
    startScale: 1.055,
    endScale: 1.125,
    startX: 0.9,
    endX: -0.9,
    startY: 1,
    endY: -1,
    startRotate: 0,
    endRotate: 0,
  },

  recurso: {
    intent: "appeal-forward-motion",
    startScale: 1.09,
    endScale: 1.13,
    startX: -3,
    endX: 2.8,
    startY: 0.5,
    endY: -0.5,
    startRotate: -0.12,
    endRotate: 0.12,
  },

  decision: {
    intent: "decision-convergence",
    startScale: 1.045,
    endScale: 1.13,
    startX: 1.2,
    endX: 0,
    startY: 1.4,
    endY: 0,
    startRotate: 0.1,
    endRotate: 0,
  },

  "debido-proceso": {
    intent: "process-vertical-rise",
    startScale: 1.11,
    endScale: 1.115,
    startX: 0,
    endX: 0,
    startY: 3,
    endY: -3,
    startRotate: 0,
    endRotate: 0,
  },

  defensa: {
    intent: "defense-controlled-push",
    startScale: 1.055,
    endScale: 1.12,
    startX: -1.4,
    endX: 1.2,
    startY: 0.8,
    endY: -0.6,
    startRotate: -0.1,
    endRotate: 0.1,
  },

  plazos: {
    intent: "deadline-progress",
    startScale: 1.1,
    endScale: 1.12,
    startX: -3.3,
    endX: 3.3,
    startY: 0,
    endY: 0,
    startRotate: 0,
    endRotate: 0,
  },

  ignorar: {
    intent: "ignored-pull-away",
    startScale: 1.13,
    endScale: 1.065,
    startX: 1.4,
    endX: -1.4,
    startY: -0.5,
    endY: 1,
    startRotate: 0,
    endRotate: -0.12,
  },

  vulneracion: {
    intent: "rights-tension",
    startScale: 1.075,
    endScale: 1.135,
    startX: -1.8,
    endX: 1.6,
    startY: 1,
    endY: -1,
    startRotate: -0.22,
    endRotate: 0.22,
  },

  "accion-final": {
    intent: "conclusion-release",
    startScale: 1.14,
    endScale: 1.055,
    startX: 0,
    endX: 0,
    startY: -1,
    endY: 1.3,
    startRotate: 0,
    endRotate: 0,
  },

  "semantic-filler": {
    intent: "neutral-cinematic-drift",
    startScale: 1.075,
    endScale: 1.105,
    startX: -1.6,
    endX: 1.6,
    startY: 1,
    endY: -1,
    startRotate: -0.08,
    endRotate: 0.08,
  },
};

const FALLBACKS: SemanticMotionProfile[] = [
  {
    intent: "fallback-push",
    startScale: 1.05,
    endScale: 1.12,
    startX: 0,
    endX: 0,
    startY: 1,
    endY: -1,
    startRotate: 0,
    endRotate: 0,
  },

  {
    intent: "fallback-pan",
    startScale: 1.11,
    endScale: 1.12,
    startX: -2.8,
    endX: 2.8,
    startY: 0.5,
    endY: -0.5,
    startRotate: 0,
    endRotate: 0,
  },

  {
    intent: "fallback-pull",
    startScale: 1.13,
    endScale: 1.065,
    startX: 1,
    endX: -1,
    startY: -0.7,
    endY: 0.7,
    startRotate: 0.1,
    endRotate: -0.1,
  },
];

export function getSemanticMotionProfile(
  ruleId: string,
  sceneIndex: number,
): SemanticMotionProfile {
  // 1. Prioridad máxima:
  // perfiles diseñados específicamente para
  // contenido jurídico HIGH TICKET.
  const highTicketMotion =
    getHighTicketMotionProfile(ruleId);

  if (highTicketMotion) {
    return highTicketMotion;
  }

  // 2. Perfiles jurídicos SILEC.
  const silecMotion =
    getSilecMotionProfile(ruleId);

  if (silecMotion) {
    return silecMotion;
  }

  // 3. Perfiles semánticos generales ya validados.
  if (MOTIONS[ruleId]) {
    return MOTIONS[ruleId];
  }

  // 4. Fallback seguro para cualquier concepto futuro.
  return FALLBACKS[
    sceneIndex % FALLBACKS.length
  ];
}
