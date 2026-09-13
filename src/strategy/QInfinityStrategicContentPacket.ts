export type QInfinityStrategicContentPacket = {
  productionCode: string;
  version: string;

  source: {
    ecosystem: string;
    module: string;
    domain: string;
    sourceType: "internal-knowledge" | "case" | "research";
    legalVerificationRequired: boolean;
  };

  strategicObjective: {
    primaryGoal: string;
    targetAudience: string[];
    capabilityDemonstrated: string[];
    commercialObjective: string;
    offerPath: string[];
  };

  knowledge: {
    topic: string;
    centralThesis: string;
    problem: string;
    reasoningChain: string[];
    conclusion: string;
  };

  audiovisual: {
    hook: string;
    narrativePromise: string;
    tone: string;
    desiredDurationSeconds: number;
    visualPrinciples: string[];
    closingIdea: string;
    cta: string;
  };

  qInfinity: {
    strategicValue: number;
    authorityValue: number;
    commercialPotential: number;
    reusability: number;
    scalability: number;
    rationale: string;
  };
};
