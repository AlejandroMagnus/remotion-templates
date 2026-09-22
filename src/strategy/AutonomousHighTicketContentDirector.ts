import type {
  SilecKnowledgeInput,
} from "../content/SilecContentAdapter";

import {
  compareWithEditorialMemory,
  type EditorialDecision,
  type EditorialMemoryItem,
} from "./EditorialMemory";

/**
 * V3.17-A
 * AUTONOMOUS HIGH-TICKET CONTENT DIRECTOR
 *
 * Responsabilidad:
 * - recibir una intención estratégica;
 * - evaluar oportunidades de contenido;
 * - priorizar autoridad y potencial high ticket;
 * - consultar Memoria Editorial;
 * - evitar duplicaciones;
 * - permitir temas relacionados desde nuevos ángulos;
 * - seleccionar autónomamente la mejor oportunidad;
 * - producir un SilecKnowledgeInput compatible
 *   con el pipeline V3.16 existente.
 *
 * NO modifica EditorialMemory.
 * NO modifica SilecContentAdapter.
 * NO dirige cinematografía.
 * NO genera assets.
 * NO renderiza.
 */

export type AutonomousDirectorMode =
  | "autonomous"
  | "directed";

export type HighTicketContentIntent = {
  productionCode: string;

  mode?: AutonomousDirectorMode;

  objective?: string;

  requestedTopic?: string | null;

  requestedAngle?: string | null;
};

export type HighTicketOpportunity = {
  id: string;

  domain: string;

  topic: string;

  centralThesis: string;

  problem: string;

  reasoningChain: string[];

  conclusion: string;

  targetAudience: string[];

  capabilityDemonstrated: string[];

  commercialObjective: string;

  offerPath: string[];

  hook: string;

  closingIdea: string;

  cta: string;

  strategicValue: number;

  authorityValue: number;

  commercialPotential: number;

  urgencyValue: number;

  reusability: number;

  scalability: number;
};

export type HighTicketOpportunityScore = {
  opportunityId: string;

  topic: string;

  approved: boolean;

  totalScore: number;

  strategicScore: number;

  editorialNoveltyScore: number;

  editorialDecision: EditorialDecision;

  reasons: string[];
};

export type AutonomousContentSelection = {
  version: "V3.17-A";

  productionCode: string;

  mode: AutonomousDirectorMode;

  objective: string;

  selectedOpportunity:
    HighTicketOpportunity;

  score:
    HighTicketOpportunityScore;

  alternatives:
    HighTicketOpportunityScore[];

  silecInput:
    SilecKnowledgeInput;
};

const DEFAULT_OBJECTIVE =
  "Captar clientes jurídicos high ticket demostrando capacidad de diagnóstico, prevención, estrategia y resolución de problemas jurídicos de alto valor.";

const DEFAULT_TARGET_AUDIENCE = [
  "empresarios",
  "directores y ejecutivos",
  "propietarios de empresas",
  "inversionistas",
  "personas involucradas en operaciones patrimoniales de alto valor",
  "abogados y asesores jurídicos",
];

const DEFAULT_OFFER_PATH = [
  "contenido de autoridad",
  "identificación del problema por el potencial cliente",
  "consulta estratégica",
  "diagnóstico jurídico integral",
  "servicio jurídico premium",
];

/**
 * Cartera inicial de oportunidades.
 *
 * Esta cartera NO pretende sustituir SILEC.
 * Define problemas y ángulos comerciales
 * susceptibles de convertirse posteriormente
 * en conocimiento jurídico estructurado.
 *
 * En futuras versiones podrá alimentarse
 * dinámicamente desde SILEC / PhD 12,
 * investigación validada y oportunidades
 * detectadas por Q∞.
 */
export const HIGH_TICKET_OPPORTUNITY_PORTFOLIO:
  HighTicketOpportunity[] = [
    {
      id: "contract-risk-before-signing",

      domain: "derecho-empresarial",

      topic:
        "Diagnóstico jurídico preventivo antes de firmar operaciones de alto valor",

      centralThesis:
        "El momento más eficaz para gestionar un riesgo jurídico es antes de asumir obligaciones, porque después de la firma disminuyen las alternativas disponibles y aumenta el costo de corregir una decisión.",

      problem:
        "Empresas e inversionistas pueden concentrarse en cerrar una operación sin analizar suficientemente incumplimiento, prueba, garantías, exposición patrimonial y mecanismos de salida.",

      reasoningChain: [
        "La firma transforma una negociación en obligaciones jurídicamente relevantes.",
        "Antes de firmar existe mayor capacidad para negociar garantías y distribuir riesgos.",
        "Después de asumir obligaciones, corregir una estructura deficiente puede requerir renegociación o litigio.",
        "Una cláusula formalmente válida no necesariamente protege el resultado económico esperado.",
        "La estrategia preventiva debe analizar anticipadamente incumplimiento, prueba y ejecución.",
      ],

      conclusion:
        "La protección jurídica de alto nivel comienza antes de la firma, cuando todavía existe capacidad real para reducir riesgos.",

      targetAudience:
        DEFAULT_TARGET_AUDIENCE,

      capabilityDemonstrated: [
        "diagnóstico jurídico preventivo",
        "análisis estratégico de contratos",
        "identificación anticipada de riesgos",
        "protección patrimonial",
        "arquitectura jurídica de operaciones complejas",
      ],

      commercialObjective:
        "Demostrar capacidad para diagnosticar y estructurar operaciones empresariales, contractuales y patrimoniales de alto valor.",

      offerPath:
        DEFAULT_OFFER_PATH,

      hook:
        "El peor momento para descubrir un riesgo jurídico es después de firmar.",

      closingIdea:
        "La mejor estrategia jurídica comienza antes de firmar.",

      cta:
        "Antes de comprometer patrimonio o empresa, diagnostique jurídicamente el riesgo mientras todavía existen alternativas.",

      strategicValue: 96,
      authorityValue: 94,
      commercialPotential: 96,
      urgencyValue: 88,
      reusability: 94,
      scalability: 95,
    },

    {
      id: "evidence-before-conflict",

      domain: "estrategia-probatoria",

      topic:
        "La prueba estratégica antes del conflicto jurídico",

      centralThesis:
        "En controversias de alto valor, la prueba debe identificarse, preservarse y organizarse estratégicamente antes de que el conflicto alcance su fase crítica.",

      problem:
        "Empresas y personas pueden descubrir demasiado tarde que documentos, comunicaciones o antecedentes esenciales no fueron preservados adecuadamente.",

      reasoningChain: [
        "Un derecho necesita hechos demostrables para convertirse en una posición defendible.",
        "La evidencia puede perderse o fragmentarse con el paso del tiempo.",
        "La preservación temprana permite reconstruir cronologías y responsabilidades.",
        "La prueba debe analizarse también frente a la posición previsible de la contraparte.",
        "Una arquitectura probatoria anticipada fortalece negociación y defensa.",
      ],

      conclusion:
        "La protección jurídica de alto nivel exige construir capacidad probatoria antes de necesitar utilizarla.",

      targetAudience:
        DEFAULT_TARGET_AUDIENCE,

      capabilityDemonstrated: [
        "diagnóstico jurídico preventivo",
        "estrategia probatoria",
        "análisis anticipado de controversias",
        "preservación estratégica de evidencia",
        "arquitectura jurídica de casos complejos",
      ],

      commercialObjective:
        "Demostrar capacidad para estructurar posiciones probatorias defendibles en asuntos empresariales y patrimoniales de alto valor.",

      offerPath:
        DEFAULT_OFFER_PATH,

      hook:
        "La prueba más importante de un conflicto puede desaparecer antes de que exista una demanda.",

      closingIdea:
        "La prueba estratégica comienza cuando aparece el riesgo.",

      cta:
        "Antes de que una controversia comprometa patrimonio o empresa, diagnostique jurídicamente la prueba y el riesgo.",

      strategicValue: 95,
      authorityValue: 96,
      commercialPotential: 92,
      urgencyValue: 91,
      reusability: 95,
      scalability: 94,
    },

    {
      id: "administrative-decision-defense",

      domain: "derecho-administrativo",

      topic:
        "Cómo preparar estratégicamente la defensa frente a una decisión administrativa adversa",

      centralThesis:
        "La defensa administrativa eficaz comienza identificando desde el primer momento hechos, prueba, motivación, procedimiento y efectos concretos de la decisión impugnable.",

      problem:
        "Una empresa o persona afectada por una decisión administrativa puede reaccionar únicamente contra la conclusión de la autoridad sin identificar oportunamente defectos de motivación, valoración probatoria, procedimiento o competencia.",

      reasoningChain: [
        "Una decisión administrativa produce consecuencias jurídicas concretas que deben identificarse con precisión.",
        "La estrategia requiere separar hechos, prueba, fundamento normativo y razonamiento de la autoridad.",
        "La motivación y la valoración de la prueba deben analizarse frente al expediente real.",
        "Los mecanismos de impugnación dependen de actos, plazos y requisitos específicos.",
        "Una defensa construida tempranamente preserva argumentos, prueba y alternativas posteriores.",
      ],

      conclusion:
        "La impugnación estratégica no comienza redactando un recurso: comienza reconstruyendo técnicamente la decisión que debe ser enfrentada.",

      targetAudience: [
        "empresas reguladas",
        "empresarios",
        "directores y ejecutivos",
        "contratistas",
        "profesionales",
        "abogados y asesores jurídicos",
      ],

      capabilityDemonstrated: [
        "derecho administrativo estratégico",
        "diagnóstico de decisiones administrativas",
        "análisis probatorio",
        "arquitectura de impugnación",
        "defensa empresarial",
      ],

      commercialObjective:
        "Demostrar capacidad para diagnosticar y estructurar defensas complejas frente a decisiones administrativas con impacto empresarial o patrimonial.",

      offerPath:
        DEFAULT_OFFER_PATH,

      hook:
        "Impugnar una decisión administrativa sin reconstruir cómo fue tomada puede significar atacar el problema equivocado.",

      closingIdea:
        "Una defensa administrativa sólida comienza antes de redactar el recurso.",

      cta:
        "Antes de impugnar una decisión con impacto económico relevante, diagnostique integralmente el acto, la prueba y la estrategia.",

      strategicValue: 96,
      authorityValue: 97,
      commercialPotential: 94,
      urgencyValue: 94,
      reusability: 92,
      scalability: 93,
    },

    {
      id: "corporate-conflict-early-warning",

      domain: "derecho-corporativo",

      topic:
        "Señales jurídicas tempranas de un conflicto societario de alto valor",

      centralThesis:
        "Los conflictos societarios rara vez comienzan con una demanda; suelen manifestarse antes mediante decisiones, información, documentación y cambios de conducta que pueden diagnosticarse estratégicamente.",

      problem:
        "Socios y empresas pueden ignorar señales tempranas de deterioro societario hasta que el conflicto compromete control, patrimonio, información o continuidad empresarial.",

      reasoningChain: [
        "Los conflictos societarios suelen desarrollarse progresivamente.",
        "Cambios en acceso a información, decisiones o documentación pueden revelar riesgos emergentes.",
        "La reconstrucción temprana de hechos permite distinguir desacuerdo comercial de riesgo jurídico.",
        "La preservación de documentos y decisiones puede resultar crítica si el conflicto escala.",
        "La intervención temprana conserva más alternativas de negociación y protección.",
      ],

      conclusion:
        "Detectar tempranamente un conflicto societario permite proteger posiciones antes de que la disputa reduzca las alternativas disponibles.",

      targetAudience: [
        "socios",
        "accionistas",
        "empresarios",
        "directores",
        "inversionistas",
        "empresas familiares",
      ],

      capabilityDemonstrated: [
        "diagnóstico de conflictos societarios",
        "estrategia corporativa",
        "protección patrimonial",
        "análisis preventivo",
        "negociación estratégica",
      ],

      commercialObjective:
        "Demostrar capacidad para intervenir estratégicamente en conflictos societarios con impacto patrimonial y empresarial relevante.",

      offerPath:
        DEFAULT_OFFER_PATH,

      hook:
        "Un conflicto societario puede comenzar mucho antes de que alguien presente una demanda.",

      closingIdea:
        "Cuando aparecen las primeras señales, todavía existen más opciones que cuando el conflicto ya controla la empresa.",

      cta:
        "Si una disputa societaria comienza a comprometer información, control o patrimonio, diagnostique el riesgo antes de que escale.",

      strategicValue: 95,
      authorityValue: 95,
      commercialPotential: 97,
      urgencyValue: 92,
      reusability: 93,
      scalability: 94,
    },

    {
      id: "contract-default-strategy",

      domain: "derecho-contractual",

      topic:
        "Qué analizar estratégicamente cuando una contraparte incumple un contrato de alto valor",

      centralThesis:
        "Ante un incumplimiento contractual relevante, la primera decisión no debería ser demandar automáticamente, sino determinar obligaciones, prueba, garantías, patrimonio, remedios y capacidad real de ejecución.",

      problem:
        "Una reacción inmediata frente al incumplimiento puede llevar a escoger una vía jurídica sin haber evaluado previamente la posición probatoria, económica y estratégica completa.",

      reasoningChain: [
        "El incumplimiento debe reconstruirse frente a las obligaciones contractuales concretas.",
        "La prueba disponible condiciona la capacidad de sostener cada pretensión.",
        "Las garantías y la solvencia de la contraparte afectan el valor real de una eventual decisión favorable.",
        "Negociación, resolución, cumplimiento y litigio presentan costos y resultados diferentes.",
        "La estrategia debe comparar alternativas antes de comprometer recursos en una sola vía.",
      ],

      conclusion:
        "En un incumplimiento de alto valor, la estrategia comienza determinando qué resultado es jurídicamente defendible, económicamente útil y realmente ejecutable.",

      targetAudience:
        DEFAULT_TARGET_AUDIENCE,

      capabilityDemonstrated: [
        "estrategia contractual",
        "diagnóstico de incumplimiento",
        "análisis probatorio",
        "evaluación de garantías",
        "diseño de estrategia de recuperación",
      ],

      commercialObjective:
        "Demostrar capacidad para diseñar estrategias integrales frente a incumplimientos contractuales con impacto económico significativo.",

      offerPath:
        DEFAULT_OFFER_PATH,

      hook:
        "Ganar una demanda puede no servir de mucho si antes nadie analizó cómo cobrar.",

      closingIdea:
        "La estrategia contractual no consiste solamente en tener razón, sino en construir un resultado jurídicamente defendible y ejecutable.",

      cta:
        "Ante un incumplimiento de alto valor, diagnostique obligaciones, prueba, garantías y ejecución antes de escoger la vía.",

      strategicValue: 98,
      authorityValue: 96,
      commercialPotential: 99,
      urgencyValue: 97,
      reusability: 96,
      scalability: 97,
    },
  ];

function clamp100(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      value,
    ),
  );
}

function round(
  value: number,
): number {
  return (
    Math.round(
      value * 100,
    ) / 100
  );
}

function normalize(
  value: string,
): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9 ]/gi,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function tokenize(
  value: string,
): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter(
        (token) =>
          token.length >= 3,
      ),
  );
}

function similarity(
  first: string,
  second: string,
): number {
  const a = tokenize(first);
  const b = tokenize(second);

  if (
    a.size === 0 ||
    b.size === 0
  ) {
    return 0;
  }

  const intersection =
    [...a].filter(
      (token) =>
        b.has(token),
    ).length;

  const union =
    new Set([
      ...a,
      ...b,
    ]).size;

  if (union === 0) {
    return 0;
  }

  return intersection / union;
}

function buildTemporaryPacket(
  productionCode: string,
  opportunity:
    HighTicketOpportunity,
) {
  return {
    productionCode,

    version:
      "V3.17-A-AUTONOMOUS-HIGH-TICKET-DIRECTOR",

    source: {
      ecosystem:
        "ECOSISTEMA SILEC",

      module:
        "Q∞ — Autonomous High-Ticket Content Director",

      domain:
        opportunity.domain,

      sourceType:
        "internal-knowledge" as const,

      legalVerificationRequired:
        true,
    },

    strategicObjective: {
      primaryGoal:
        DEFAULT_OBJECTIVE,

      targetAudience:
        opportunity.targetAudience,

      capabilityDemonstrated:
        opportunity
          .capabilityDemonstrated,

      commercialObjective:
        opportunity
          .commercialObjective,

      offerPath:
        opportunity.offerPath,
    },

    knowledge: {
      topic:
        opportunity.topic,

      centralThesis:
        opportunity
          .centralThesis,

      problem:
        opportunity.problem,

      reasoningChain:
        opportunity
          .reasoningChain,

      conclusion:
        opportunity.conclusion,
    },

    audiovisual: {
      hook:
        opportunity.hook,

      narrativePromise:
        "Convertir un problema jurídico de alto valor en una explicación estratégica clara, útil y orientada a decisión.",

      tone:
        "jurídico premium, estratégico, claro, seguro y pedagógico",

      desiredDurationSeconds:
        60,

      visualPrinciples: [
        "una idea dominante por unidad narrativa",
        "imagen vinculada semánticamente a la narración",
        "continuidad narrativa",
        "movimiento cinematográfico cadencioso",
        "sin slideshow",
        "sin saturación gráfica",
      ],

      closingIdea:
        opportunity.closingIdea,

      cta:
        opportunity.cta,
    },

    qInfinity: {
      strategicValue:
        opportunity.strategicValue,

      authorityValue:
        opportunity.authorityValue,

      commercialPotential:
        opportunity
          .commercialPotential,

      reusability:
        opportunity.reusability,

      scalability:
        opportunity.scalability,

      rationale:
        "Oportunidad seleccionada por potencial estratégico, autoridad, captación high ticket, novedad editorial y capacidad de reutilización.",
    },
  };
}

function scoreOpportunity(
  productionCode: string,
  opportunity:
    HighTicketOpportunity,
  memory:
    EditorialMemoryItem[],
  intent:
    HighTicketContentIntent,
): HighTicketOpportunityScore {
  const packet =
    buildTemporaryPacket(
      productionCode,
      opportunity,
    );

  const editorialDecision =
    compareWithEditorialMemory(
      packet,
      memory,
    );

  const strategicScore =
    round(
      opportunity.strategicValue *
        0.22 +
        opportunity.authorityValue *
          0.18 +
        opportunity
          .commercialPotential *
          0.28 +
        opportunity.urgencyValue *
          0.12 +
        opportunity.reusability *
          0.1 +
        opportunity.scalability *
          0.1,
    );

  const editorialNoveltyScore =
    round(
      editorialDecision
        .noveltyScore * 100,
    );

  let directedBonus = 0;

  if (
    intent.requestedTopic?.trim()
  ) {
    directedBonus +=
      similarity(
        intent.requestedTopic,
        opportunity.topic,
      ) * 20;
  }

  if (
    intent.requestedAngle?.trim()
  ) {
    directedBonus +=
      similarity(
                intent.requestedAngle,
        [
          opportunity.centralThesis,
          opportunity.problem,
          opportunity.conclusion,
        ].join(" "),
      ) * 10;
  }

  const totalScore =
    round(
      clamp100(
        strategicScore * 0.7 +
          editorialNoveltyScore *
            0.3 +
          directedBonus,
      ),
    );

  const reasons = [
    `strategic=${strategicScore}`,
    `novelty=${editorialNoveltyScore}`,
    `commercial=${opportunity.commercialPotential}`,
    `authority=${opportunity.authorityValue}`,
  ];

  if (
    directedBonus > 0
  ) {
    reasons.push(
      `directed-bonus=${round(
        directedBonus,
      )}`,
    );
  }

  if (
    !editorialDecision.approved
  ) {
    reasons.push(
      `editorial=${editorialDecision.recommendation}`,
    );
  }

  return {
    opportunityId:
      opportunity.id,

    topic:
      opportunity.topic,

    approved:
      editorialDecision.approved,

    totalScore,

    strategicScore,

    editorialNoveltyScore,

    editorialDecision,

    reasons,
  };
}

function opportunityToSilecInput(
  productionCode: string,
  opportunity:
    HighTicketOpportunity,
): SilecKnowledgeInput {
  return {
    productionCode,

    topic:
      opportunity.topic,

    centralThesis:
      opportunity.centralThesis,

    problem:
      opportunity.problem,

    reasoningChain:
      opportunity.reasoningChain,

    conclusion:
      opportunity.conclusion,

    targetAudience:
      opportunity.targetAudience,

    capabilityDemonstrated:
      opportunity
        .capabilityDemonstrated,

    commercialObjective:
      opportunity
        .commercialObjective,

    offerPath:
      opportunity.offerPath,

    hook:
      opportunity.hook,

    closingIdea:
      opportunity.closingIdea,

    cta:
      opportunity.cta,
  };
}

export function selectAutonomousHighTicketContent(
  intent:
    HighTicketContentIntent,
  memory:
    EditorialMemoryItem[],
  opportunities:
    HighTicketOpportunity[] =
      HIGH_TICKET_OPPORTUNITY_PORTFOLIO,
): AutonomousContentSelection {
  const productionCode =
    intent.productionCode.trim();

  if (!productionCode) {
    throw new Error(
      "productionCode es obligatorio.",
    );
  }

  if (
    opportunities.length === 0
  ) {
    throw new Error(
      "No existen oportunidades editoriales para evaluar.",
    );
  }

  const mode:
    AutonomousDirectorMode =
      intent.mode ??
      (
        intent.requestedTopic
          ? "directed"
          : "autonomous"
      );

  const objective =
    intent.objective?.trim() ||
    DEFAULT_OBJECTIVE;

  const scores =
    opportunities
      .map(
        (opportunity) =>
          scoreOpportunity(
            productionCode,
            opportunity,
            memory,
            intent,
          ),
      )
      .sort(
        (a, b) =>
          b.totalScore -
          a.totalScore,
      );

  const approvedScores =
    scores.filter(
      (score) =>
        score.approved,
    );

  if (
    approvedScores.length === 0
  ) {
    throw new Error(
      [
        "No existe una oportunidad editorial aprobada.",
        "Todas las alternativas presentan similitud excesiva con la Memoria Editorial.",
        "Debe ampliarse la cartera o generar nuevos ángulos estratégicos.",
      ].join(" "),
    );
  }

  const selectedScore =
    approvedScores[0];

  const selectedOpportunity =
    opportunities.find(
      (opportunity) =>
        opportunity.id ===
        selectedScore
          .opportunityId,
    );

  if (!selectedOpportunity) {
    throw new Error(
      "No fue posible resolver la oportunidad seleccionada.",
    );
  }

  return {
    version: "V3.17-A",

    productionCode,

    mode,

    objective,

    selectedOpportunity,

    score:
      selectedScore,

    alternatives:
      scores,

    silecInput:
      opportunityToSilecInput(
        productionCode,
        selectedOpportunity,
      ),
  };
    }
