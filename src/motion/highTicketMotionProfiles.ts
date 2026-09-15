export type HighTicketMotionProfile = {
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

const HIGH_TICKET_MOTIONS: Record<
  string,
  HighTicketMotionProfile
> = {
  "controversia-alto-valor": {
    intent: "high-stakes-controlled-push",
    startScale: 1.05,
    endScale: 1.135,
    startX: 0,
    endX: 0,
    startY: 1.2,
    endY: -1,
    startRotate: 0,
    endRotate: 0,
  },

  "contratos-high-ticket": {
    intent: "contract-detail-examination",
    startScale: 1.12,
    endScale: 1.14,
    startX: -3,
    endX: 3,
    startY: 0.6,
    endY: -0.6,
    startRotate: -0.1,
    endRotate: 0.1,
  },

  arbitraje: {
    intent: "arbitration-strategic-drift",
    startScale: 1.075,
    endScale: 1.13,
    startX: -2.2,
    endX: 2,
    startY: 0.7,
    endY: -0.7,
    startRotate: -0.08,
    endRotate: 0.08,
  },

  "conflicto-administrativo": {
    intent: "administrative-tension-pan",
    startScale: 1.08,
    endScale: 1.13,
    startX: 2.4,
    endX: -2.2,
    startY: 0.8,
    endY: -0.8,
    startRotate: 0.1,
    endRotate: -0.1,
  },

  patrimonio: {
    intent: "asset-protection-convergence",
    startScale: 1.055,
    endScale: 1.125,
    startX: -1.2,
    endX: 1,
    startY: 1,
    endY: -0.8,
    startRotate: -0.06,
    endRotate: 0.06,
  },

  "control-constitucional": {
    intent: "constitutional-authority-rise",
    startScale: 1.07,
    endScale: 1.13,
    startX: 0,
    endX: 0,
    startY: 2.5,
    endY: -2.2,
    startRotate: 0,
    endRotate: 0,
  },
};

export function getHighTicketMotionProfile(
  ruleId: string,
): HighTicketMotionProfile | null {
  return HIGH_TICKET_MOTIONS[ruleId] ?? null;
}
