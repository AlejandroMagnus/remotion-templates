import type {
  SilecKnowledgeInput,
} from "../content/SilecContentAdapter";

import {
  compareWithEditorialMemory,
  comparableEditorialMemory,
  isProducedMemoryItem,
  type EditorialDecision,
  type EditorialMemoryItem,
} from "./EditorialMemory";
import {
  EDITORIAL_TARGETS,
  legalReviewIssue,
  reviewedContentHash,
  type EditorialCategory,
  type EditorialMetadata,
  type EditorialScoresSchema,
} from "./EditorialCatalog";
import type { z } from "zod";

/**
 * V3.17-C
 * AUTONOMOUS PORTFOLIO DIVERSITY DIRECTOR
 *
 * Objetivo:
 * - preservar el valor high ticket;
 * - impedir rotación excesiva alrededor del mismo tema;
 * - aumentar diversidad temática y estratégica;
 * - penalizar proximidad con producciones recientes;
 * - favorecer rotación entre dominios jurídicos;
 * - mantener intacta la autoridad del usuario en modo directed;
 * - producir SilecKnowledgeInput compatible con el pipeline existente.
 *
 * Principio rector:
 *
 * AUTONOMOUS:
 * valor estratégico + novedad + diversidad + distancia reciente.
 *
 * DIRECTED:
 * intención expresa del usuario + seguridad editorial.
 *
 * Este módulo:
 * - NO modifica EditorialMemory;
 * - NO modifica SilecContentAdapter;
 * - NO dirige cinematografía;
 * - NO genera assets;
 * - NO renderiza.
 */

/**
 * Q∞ 07 — Política editorial integrada al Director vigente.
 * Ventana móvil objetivo: FI 9, DT 6, HT 5.
 * Q∞ 01 puede cambiar la prioridad mediante una oportunidad expresa.
 * La clasificación histórica solo cuenta registros identificables;
 * nunca se inventan categorías para completar la ventana.
 */
export type { EditorialCategory } from "./EditorialCatalog";

const OPPORTUNITY_CATEGORY: Record<string, EditorialCategory> = {
  "contract-risk-before-signing": "HT",
  "evidence-before-conflict": "FI",
  "administrative-decision-defense": "DT",
  "corporate-conflict-early-warning": "HT",
  "contract-default-strategy": "HT",
  "due-diligence-hidden-liabilities": "HT",
  "arbitration-before-litigation": "DT",
  "asset-recovery-executability": "FI",
  "regulatory-risk-business": "DT",
  "shareholder-control-information": "FI",
};

function categoryOf(opportunity: HighTicketOpportunity): EditorialCategory {
  return opportunity.editorial?.category ?? OPPORTUNITY_CATEGORY[opportunity.id] ?? "HT";
}

function editorialCounts(memory: EditorialMemoryItem[], opportunities: HighTicketOpportunity[]) {
  const counts: Record<EditorialCategory, number> = { FI: 0, DT: 0, HT: 0 };
  let unclassified = 0;
  const window = memory.filter(isProducedMemoryItem).slice(-20);
  const categories = window.map((item) => {
    const match = opportunities.find((opportunity) => normalize(opportunity.topic) === normalize(item.topic));
    return item.editorial?.category ?? (match ? categoryOf(match) : undefined);
  });
  for (const category of categories) {
    if (category && category in counts) counts[category]++;
    else unclassified++;
  }
  const nextCounts = { ...counts };
  // Before adding the next video the oldest leaves a full rolling window.
  if (window.length === 20 && categories[0]) nextCounts[categories[0]]--;
  return { counts, nextCounts, unclassified, windowSize: window.length, target: EDITORIAL_TARGETS };
}

function metadataOf(opportunity: HighTicketOpportunity): EditorialMetadata {
  return {
    category: categoryOf(opportunity),
    domains: [opportunity.domain],
    intellectualContribution: opportunity.centralThesis,
    ...opportunity.editorial,
    opportunityId: opportunity.id,
  };
}

export type AutonomousDirectorMode =
  | "autonomous"
  | "directed";

export type HighTicketContentIntent = {
  productionCode: string;
  mode?: AutonomousDirectorMode;
  objective?: string;
  requestedTopic?: string | null;
  requestedAngle?: string | null;
  /** Prioridad expresa de Q∞ 01; se evalúa con las reglas editoriales existentes. */
  qInfinityPriorityId?: string | null;
  qInfinityReason?: string | null;
  /** Oportunidades vetadas expresamente por Q∞ 01. */
  qInfinityVetoIds?: string[];

};

export type HighTicketOpportunity = {
  editorial?: EditorialMetadata;
  editorialScores?: z.infer<typeof EditorialScoresSchema>;
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
  selectionScore?: number;
  portfolioBonus?: number;
  strategicScore: number;
  editorialNoveltyScore: number;

  recentDiversityScore: number;
  domainDiversityScore: number;
  repetitionPenalty: number;
  directedFitScore: number;

  editorialDecision: EditorialDecision;
  reasons: string[];
};

export type AutonomousContentSelection = {
  version: "V3.17-C";

  productionCode: string;
  mode: AutonomousDirectorMode;
  objective: string;

  selectedOpportunity:
    HighTicketOpportunity;
  editorialBrief: {
    mainCategory: EditorialCategory;
    secondaryCategory: EditorialCategory | null;
    intention: string;
    whyNow: string;
    desiredPerception: string;
    commercialOpportunity: string;
    topic: string;
    hook: string;
    portfolio: ReturnType<typeof editorialCounts>;
    qInfinityPriorityApplied: boolean;
  };


  score:
    HighTicketOpportunityScore;

  alternatives:
    HighTicketOpportunityScore[];

  silecInput:
    SilecKnowledgeInput;
};

const DEFAULT_OBJECTIVE =
  "Construir autoridad jurídica mediante pensamiento propio, dominio transversal y capacidad estratégica; equilibrar FI 45 %, DT 30 % y HT 25 %, bajo la prioridad de Q∞ 01.";

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
 * Cartera V3.17-B.
 *
 * Se amplía deliberadamente la variedad de problemas.
 * No sustituye SILEC ni PhD 12.
 *
 * Constituye una cartera estratégica de oportunidades
 * audiovisuales que posteriormente puede ser sustituida
 * o alimentada dinámicamente por conocimiento validado.
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
        "Una empresa o persona afectada por una decisión administrativa puede reaccionar únicamente contra la conclusión de la autoridad sin identificar oportunamente defectos relevantes del acto o del procedimiento.",

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

    {
      id: "due-diligence-hidden-liabilities",
      domain: "due-diligence",

      topic:
        "Los pasivos jurídicos que una operación empresarial puede ocultar antes de una adquisición o inversión",

      centralThesis:
        "El valor aparente de una empresa u operación puede cambiar radicalmente cuando se identifican obligaciones, litigios, contingencias, restricciones y riesgos jurídicos que no son visibles en una revisión superficial.",

      problem:
        "Una inversión puede evaluarse principalmente por sus cifras económicas sin integrar suficientemente contingencias jurídicas capaces de alterar precio, garantías o conveniencia de la operación.",

      reasoningChain: [
        "El precio de una operación depende también del riesgo asumido.",
        "Las contingencias jurídicas pueden no reflejarse completamente en la información financiera.",
        "Contratos, procesos, permisos y obligaciones pueden modificar el valor económico real.",
        "La debida diligencia permite transformar hallazgos jurídicos en decisiones de negociación.",
        "Detectar un riesgo antes del cierre permite renegociar, garantizar, condicionar o abandonar la operación.",
      ],

      conclusion:
        "La debida diligencia jurídica no consiste solo en revisar documentos: consiste en determinar qué riesgo está comprando realmente el inversionista.",

      targetAudience: [
        "inversionistas",
        "empresarios",
        "compradores de empresas",
        "socios estratégicos",
        "directores",
      ],

      capabilityDemonstrated: [
        "due diligence jurídica",
        "análisis de contingencias",
        "estructuración de inversiones",
        "diagnóstico empresarial",
        "gestión estratégica de riesgo",
      ],

      commercialObjective:
        "Demostrar capacidad para evaluar jurídicamente adquisiciones, inversiones y operaciones empresariales complejas.",

      offerPath:
        DEFAULT_OFFER_PATH,

      hook:
        "Una empresa puede valer mucho menos de lo que parece cuando se descubre qué obligaciones vienen incluidas con la compra.",

      closingIdea:
        "Antes de comprar una empresa, hay que saber también qué riesgos se están comprando.",

      cta:
        "Antes de cerrar una adquisición o inversión relevante, someta la operación a diagnóstico jurídico integral.",

      strategicValue: 97,
      authorityValue: 97,
      commercialPotential: 98,
      urgencyValue: 88,
      reusability: 94,
      scalability: 96,
    },

    {
      id: "arbitration-before-litigation",
      domain: "arbitraje-y-controversias",

      topic:
        "Cuándo una controversia empresarial exige diseñar la estrategia antes de elegir entre negociación, arbitraje o litigio",

      centralThesis:
        "La elección del mecanismo de resolución debe ser consecuencia del diagnóstico de la controversia y no una reacción automática al conflicto.",

      problem:
        "Una empresa puede comprometer tiempo, prueba y recursos en una vía sin comparar previamente jurisdicción, cláusulas aplicables, objetivos económicos, ejecutabilidad y alternativas de negociación.",

      reasoningChain: [
        "No todas las controversias persiguen el mismo resultado.",
        "La cláusula de solución de controversias condiciona las alternativas disponibles.",
        "La prueba, el tiempo y la ejecutabilidad modifican el valor de cada vía.",
        "La negociación puede ser estratégica sin significar renuncia a una posición jurídica.",
        "La selección del mecanismo debe responder al resultado perseguido.",
      ],

      conclusion:
        "La primera decisión estratégica de una controversia no es cómo pelearla, sino dónde, cuándo y para qué conviene hacerlo.",

      targetAudience: [
        "empresas",
        "inversionistas",
        "directores",
        "contratistas",
        "abogados corporativos",
      ],

      capabilityDemonstrated: [
        "estrategia de controversias",
        "arbitraje",
        "negociación estratégica",
        "arquitectura de caso",
        "evaluación de alternativas",
      ],

      commercialObjective:
        "Demostrar capacidad para diseñar rutas de resolución de controversias empresariales complejas.",

      offerPath:
        DEFAULT_OFFER_PATH,

      hook:
        "El error puede comenzar antes del juicio: elegir mal dónde resolver el conflicto.",

      closingIdea:
        "Una controversia de alto valor exige diseñar la ruta antes de iniciar la batalla.",

      cta:
        "Antes de comprometer una controversia relevante en una sola vía, compare estratégicamente las alternativas.",

      strategicValue: 97,
      authorityValue: 98,
      commercialPotential: 96,
      urgencyValue: 92,
      reusability: 94,
      scalability: 95,
    },

    {
      id: "asset-recovery-executability",
      domain: "recuperacion-patrimonial",

      topic:
        "Por qué una victoria jurídica puede no convertirse en recuperación patrimonial",

      centralThesis:
        "La utilidad económica de una estrategia jurídica depende no solo de obtener una decisión favorable, sino también de que el resultado pueda ejecutarse materialmente.",

      problem:
        "Un acreedor puede concentrarse en demostrar su derecho sin analizar oportunamente solvencia, patrimonio, garantías y posibilidades reales de ejecución.",

      reasoningChain: [
        "Una pretensión jurídicamente sólida no garantiza recuperación económica.",
        "La estructura patrimonial de la contraparte condiciona la utilidad de la estrategia.",
        "Las garantías pueden modificar sustancialmente la posición de recuperación.",
        "El tiempo puede deteriorar posibilidades de ejecución.",
        "La estrategia debe integrar desde el inicio derecho, prueba y resultado económico.",
      ],

      conclusion:
        "La estrategia jurídica de recuperación debe diseñarse pensando desde el primer día en el resultado ejecutable.",

      targetAudience: [
        "acreedores",
        "empresas",
        "inversionistas",
        "entidades con cuentas por cobrar",
        "abogados",
      ],

      capabilityDemonstrated: [
        "recuperación patrimonial",
        "estrategia ejecutiva",
        "análisis de garantías",
        "diagnóstico probatorio",
        "diseño de resultados ejecutables",
      ],

      commercialObjective:
        "Demostrar capacidad para integrar litigio, garantías y recuperación económica en asuntos de alto valor.",

      offerPath:
        DEFAULT_OFFER_PATH,

      hook:
        "Tener razón y cobrar son dos problemas jurídicos diferentes.",

      closingIdea:
        "Una estrategia de recuperación vale por su capacidad de convertirse en resultado.",

      cta:
        "Antes de iniciar una recuperación de alto valor, diagnostique también la ejecutabilidad del resultado.",

      strategicValue: 98,
      authorityValue: 96,
      commercialPotential: 99,
      urgencyValue: 96,
      reusability: 95,
      scalability: 95,
    },

    {
      id: "regulatory-risk-business",
      domain: "regulacion-empresarial",

      topic:
        "El riesgo regulatorio que puede cambiar una decisión empresarial antes de invertir",

      centralThesis:
        "Una inversión puede ser económicamente atractiva y, al mismo tiempo, jurídicamente vulnerable si depende de autorizaciones, regulación, obligaciones administrativas o condiciones institucionales no diagnosticadas.",

      problem:
        "Una decisión empresarial puede analizar mercado y rentabilidad sin incorporar con suficiente profundidad permisos, restricciones, competencias regulatorias y exposición administrativa.",

      reasoningChain: [
        "La viabilidad económica no sustituye la viabilidad jurídica.",
        "Las actividades reguladas dependen de competencias y autorizaciones específicas.",
        "Una restricción administrativa puede afectar tiempo, costo y continuidad.",
        "El riesgo regulatorio debe incorporarse antes de comprometer capital.",
        "La estrategia jurídica puede modificar estructura, condiciones o secuencia de inversión.",
      ],

      conclusion:
        "Una inversión de alto valor debe superar simultáneamente el análisis económico y el diagnóstico regulatorio.",

      targetAudience: [
        "inversionistas",
        "empresas reguladas",
        "directores",
        "desarrolladores de proyectos",
        "contratistas",
      ],

      capabilityDemonstrated: [
        "derecho regulatorio",
        "diagnóstico administrativo",
        "estructuración de inversiones",
        "gestión de riesgo",
        "estrategia empresarial",
      ],

      commercialObjective:
        "Demostrar capacidad para integrar regulación y estrategia en decisiones empresariales de alto impacto.",

      offerPath:
        DEFAULT_OFFER_PATH,

      hook:
        "Una inversión rentable sobre el papel puede fracasar por una restricción jurídica descubierta demasiado tarde.",

      closingIdea:
        "Antes de invertir capital, hay que saber si el proyecto puede sostenerse jurídicamente.",

      cta:
        "Antes de comprometer una inversión relevante, diagnostique también su arquitectura regulatoria.",

      strategicValue: 97,
      authorityValue: 98,
      commercialPotential: 97,
      urgencyValue: 90,
      reusability: 94,
      scalability: 97,
    },

    {
      id: "shareholder-control-information",
      domain: "gobierno-corporativo",

      topic:
        "Cuando el verdadero conflicto societario comienza con el control de la información",

      centralThesis:
        "En determinadas disputas societarias, el deterioro de la posición de un socio puede comenzar antes de una confrontación abierta, mediante restricciones de información, decisiones y control corporativo.",

      problem:
        "Un socio puede reaccionar cuando ya perdió capacidad práctica de conocer o influir sobre decisiones relevantes de la empresa.",

      reasoningChain: [
        "La información permite comprender qué está ocurriendo dentro de la sociedad.",
        "Cambios en acceso documental pueden revelar deterioro de relaciones internas.",
        "Las decisiones corporativas deben reconstruirse cronológicamente.",
        "La documentación temprana permite distinguir percepción de hechos verificables.",
        "La estrategia debe proteger información, posición y alternativas antes de la escalada.",
      ],

      conclusion:
        "En conflictos societarios complejos, proteger la posición comienza comprendiendo y documentando cómo se ejerce el control.",

      targetAudience: [
        "socios",
        "accionistas",
        "empresas familiares",
        "inversionistas",
        "directores",
      ],

      capabilityDemonstrated: [
        "gobierno corporativo",
        "conflicto societario",
        "estrategia documental",
        "protección de socios",
        "diagnóstico empresarial",
      ],

      commercialObjective:
        "Demostrar capacidad para diagnosticar conflictos de control e información dentro de estructuras societarias.",

      offerPath:
        DEFAULT_OFFER_PATH,

      hook:
        "A veces un socio comienza a perder poder mucho antes de saber que existe un conflicto.",

      closingIdea:
        "La información puede ser la primera línea de defensa de una posición societaria.",

      cta:
        "Cuando cambia el acceso a información o decisiones relevantes, diagnostique el riesgo antes de que la disputa escale.",

      strategicValue: 95,
      authorityValue: 96,
      commercialPotential: 96,
      urgencyValue: 91,
      reusability: 92,
      scalability: 93,
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
  const a =
    tokenize(first);

  const b =
    tokenize(second);

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

  if (
    union === 0
  ) {
    return 0;
  }

  return (
    intersection /
    union
  );
}

/**
 * Solo texto editorial: los IDs, nombres de campos y fechas no aportan similitud temática.
 */
function memoryItemText(
  item: EditorialMemoryItem,
): string {
  return [item.topic, item.title, item.thesis, item.subthesis, ...item.concepts].filter(Boolean).join(" ");
}

function opportunitySemanticText(
  opportunity:
    HighTicketOpportunity,
): string {
  return [
    opportunity.domain,
    opportunity.topic,
    opportunity.centralThesis,
    opportunity.problem,
    opportunity.conclusion,
    opportunity.hook,
    opportunity.closingIdea,
    ...opportunity.reasoningChain,
    ...opportunity.capabilityDemonstrated,
  ].join(" ");
}

/**
 * Analiza únicamente la memoria más reciente.
 *
 * La finalidad no es impedir volver para
 * siempre a un dominio valioso, sino evitar
 * secuencias perceptivamente repetitivas.
 */
function recentMemory(
  memory:
    EditorialMemoryItem[],
  limit = 6,
): EditorialMemoryItem[] {
  if (
    memory.length <= limit
  ) {
    return memory;
  }

  return memory.slice(
    memory.length - limit,
  );
}

function calculateRecentDiversity(
  opportunity:
    HighTicketOpportunity,
  memory:
    EditorialMemoryItem[],
): {
  score: number;
  maxSimilarity: number;
  averageSimilarity: number;
} {
  const recent =
    recentMemory(
      memory,
      6,
    );

  if (
    recent.length === 0
  ) {
    return {
      score: 100,
      maxSimilarity: 0,
      averageSimilarity: 0,
    };
  }

  const candidateText =
    opportunitySemanticText(
      opportunity,
    );

  const similarities =
    recent.map(
      (item) =>
        similarity(
          candidateText,
          memoryItemText(
            item,
          ),
        ),
    );

  const maxSimilarity =
    Math.max(
      ...similarities,
    );

  const averageSimilarity =
    similarities.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) /
    similarities.length;

  /*
   * El máximo reciente pesa más que
   * el promedio: evita producir hoy
   * una pieza demasiado próxima a la
   * inmediatamente anterior aunque
   * el historial completo sea diverso.
   */
  const similarityPressure =
    maxSimilarity * 0.7 +
    averageSimilarity * 0.3;

  return {
    score:
      round(
        clamp100(
          (
            1 -
            similarityPressure
          ) * 100,
        ),
      ),

    maxSimilarity:
      round(
        maxSimilarity * 100,
      ),

    averageSimilarity:
      round(
        averageSimilarity *
          100,
      ),
  };
}

/**
 * Detecta si el dominio conceptual del
 * candidato aparece repetidamente en
 * las producciones recientes.
 *
 * No depende de que EditorialMemory
 * exponga explícitamente "domain".
 */
function calculateDomainDiversity(
  opportunity:
    HighTicketOpportunity,
  memory:
    EditorialMemoryItem[],
): {
  score: number;
  recentDomainHits: number;
} {
  const recent =
    recentMemory(
      memory,
      5,
    );

  if (
    recent.length === 0
  ) {
    return {
      score: 100,
      recentDomainHits: 0,
    };
  }

  const domains = opportunity.editorial?.domains ?? [opportunity.domain];
  const generic = new Set(["derecho", "juridico", "juridica", "estrategia", "estrategico", "estrategica"]);
  const domainTokens = new Set([...tokenize(domains.join(" "))].filter((token) => !generic.has(token)));
  let hits = 0;
  for (const item of recent) {
    const overlap = item.editorial?.domains.length
      ? item.editorial.domains.some((domain) => domains.some((candidate) => normalize(domain) === normalize(candidate)))
      : [...domainTokens].some((token) => tokenize(memoryItemText(item)).has(token));
    if (overlap) hits++;
  }

  const score =
    hits === 0
      ? 100
      : hits === 1
        ? 78
        : hits === 2
          ? 52
          : hits === 3
            ? 28
            : 10;

  return {
    score,
    recentDomainHits:
      hits,
  };
}

function calculateRepetitionPenalty(
  editorialNoveltyScore:
    number,
  recentDiversityScore:
    number,
  domainHits:
    number,
): number {
  let penalty = 0;

  if (
    editorialNoveltyScore <
    35
  ) {
    penalty += 35;
  } else if (
    editorialNoveltyScore <
    45
  ) {
    penalty += 22;
  } else if (
    editorialNoveltyScore <
    55
  ) {
    penalty += 10;
  }

  if (
    recentDiversityScore <
    45
  ) {
    penalty += 30;
  } else if (
    recentDiversityScore <
    58
  ) {
    penalty += 18;
  } else if (
    recentDiversityScore <
    70
  ) {
    penalty += 8;
  }

  if (
    domainHits >= 3
  ) {
    penalty += 18;
  } else if (
    domainHits === 2
  ) {
    penalty += 10;
  } else if (
    domainHits === 1
  ) {
    penalty += 3;
  }

  return clamp100(
    penalty,
  );
}

function buildTemporaryPacket(
  productionCode: string,
  opportunity:
    HighTicketOpportunity,
  objective:
    string = DEFAULT_OBJECTIVE,
) {
  return {
    productionCode,

    editorial: metadataOf(opportunity),

    version:
      "V3.17-C-AUTONOMOUS-PORTFOLIO-DIVERSITY-DIRECTOR",

    source: {
      ecosystem:
        "ECOSISTEMA SILEC",

      module:
        "Q∞ — Autonomous Portfolio Diversity Director",

      domain:
        opportunity.domain,

      sourceType:
        "internal-knowledge" as const,

      legalVerificationRequired:
        true,
    },

    strategicObjective: {
      primaryGoal:
        objective,

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
        "Oportunidad seleccionada mediante valor estratégico, autoridad, potencial high ticket, novedad editorial, diversidad temática y distancia respecto de producciones recientes.",
    },
  };
}

function calculateDirectedFit(
  intent: HighTicketContentIntent,
  opportunity: HighTicketOpportunity,
): number {
  const topic = intent.requestedTopic?.trim() ?? "";
  const angle = intent.requestedAngle?.trim() ?? "";
  const stop = new Set(["los", "las", "del", "con", "para", "que", "una", "por", "como"]);
  const coverage = (query: string, target: string) => {
    const requested = [...tokenize(query)].filter((token) => !stop.has(token));
    const available = tokenize(target);
    return requested.length ? requested.filter((token) => available.has(token)).length / requested.length : 0;
  };
  const body = opportunitySemanticText(opportunity);
  const fits: number[] = [];
  if (topic) fits.push(normalize(topic) === normalize(opportunity.id) ? 1 : coverage(topic, body));
  if (angle) fits.push(coverage(angle, body));
  // A requested angle must be present in the reviewed candidate, not just in its title.
  return fits.length ? round(Math.min(...fits) * 100) : 0;
}

function scoreOpportunity(
  productionCode: string,
  opportunity:
    HighTicketOpportunity,
  memory:
    EditorialMemoryItem[],
  intent:
    HighTicketContentIntent,
  mode:
    AutonomousDirectorMode,
  objective:
    string,
): HighTicketOpportunityScore {
  const packet =
    buildTemporaryPacket(
      productionCode,
      opportunity,
      objective,
    );

  const editorialDecision =
    compareWithEditorialMemory(
      packet,
      memory,
    );

  const strategicScore =
    round(
      opportunity.editorialScores ? (
        opportunity.editorialScores.intellectualAuthority * 0.20 +
        opportunity.editorialScores.legalBreadth * 0.15 +
        opportunity.editorialScores.commercialPotential * 0.15 +
        opportunity.editorialScores.retention * 0.15 +
        opportunity.editorialScores.seo * 0.10 +
        opportunity.editorialScores.differentiation * 0.15 +
        opportunity.editorialScores.timeliness * 0.10
      ) : opportunity.strategicValue *
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
        .noveltyScore *
        100,
    );

  const recent =
    calculateRecentDiversity(
      opportunity,
      memory,
    );

  const domain =
    calculateDomainDiversity(
      opportunity,
      memory,
    );

  const repetitionPenalty =
    calculateRepetitionPenalty(
      editorialNoveltyScore,
      recent.score,
      domain.recentDomainHits,
    );

  const directedFitScore =
    calculateDirectedFit(
      intent,
      opportunity,
    );

  let totalScore: number;

  if (
    mode ===
    "directed"
  ) {
    /*
     * DIRECTED:
     * la intención del usuario domina.
     *
     * La memoria sigue aportando contexto,
     * pero no debe convertir diversidad
     * automática en desobediencia.
     */
    totalScore =
      round(
        clamp100(
          strategicScore * 0.2 +
          editorialNoveltyScore *
            0.1 +
          directedFitScore *
            0.7,
        ),
      );
  } else {
    /*
     * AUTONOMOUS:
     *
     * La novedad deja de ser un pequeño
     * complemento del 30%.
     *
     * La diversidad y la recencia forman
     * parte real de la decisión.
     */
    totalScore =
      round(
        clamp100(
          strategicScore * 0.38 +
          editorialNoveltyScore *
            0.27 +
          recent.score *
            0.22 +
          domain.score *
            0.13 -
          repetitionPenalty,
        ),
      );
  }

  /*
   * Regla de aprobación V3.17-C.
   *
   * En autonomous exigimos:
   * - aprobación de EditorialMemory;
   * - control de duplicados y ángulo revisado en EditorialMemory;
   * - distancia mínima reciente.
   *
   * En directed respetamos la aprobación
   * editorial existente, pero no imponemos
   * rotación temática contra la voluntad
   * expresa del usuario.
   */
  const legacy = HIGH_TICKET_OPPORTUNITY_PORTFOLIO.some((item) =>
    item.id === opportunity.id &&
    reviewedContentHash({ ...item, editorial: undefined }) === reviewedContentHash({ ...opportunity, editorial: undefined }),
  );
  const reviewIssue = !legacy || opportunity.editorial?.legalReview ? legalReviewIssue(opportunity) : null;
  const autonomousApproved = !reviewIssue &&
    editorialDecision.approved &&
    recent.score >= 55;

  const directedApproved = !reviewIssue &&
    editorialDecision.approved && directedFitScore >= 50;

  const approved =
    mode ===
    "directed"
      ? directedApproved
      : autonomousApproved;

  const reasons = [
    `legal-review=${reviewIssue ?? (legacy && !opportunity.editorial?.legalReview ? "legacy-verification-required" : "approved")}`,
    `mode=${mode}`,
    `strategic=${strategicScore}`,
    `novelty=${editorialNoveltyScore}`,
    `recent-diversity=${recent.score}`,
    `recent-max-similarity=${recent.maxSimilarity}`,
    `domain-diversity=${domain.score}`,
    `recent-domain-hits=${domain.recentDomainHits}`,
    `repetition-penalty=${repetitionPenalty}`,
    `directed-fit=${directedFitScore}`,
    `commercial=${opportunity.commercialPotential}`,
    `authority=${opportunity.authorityValue}`,
  ];

  if (
    !editorialDecision.approved
  ) {
    reasons.push(
      `editorial=${editorialDecision.recommendation}`,
    );
  }

  if (mode === "directed" && directedFitScore < 50) reasons.push("rejected-directed-intent-not-matched");

  if (
    mode ===
      "autonomous" &&
    recent.score < 55
  ) {
    reasons.push(
      "rejected-low-recent-diversity",
    );
  }

  return {
    opportunityId:
      opportunity.id,

    topic:
      opportunity.topic,

    approved,

    totalScore,

    strategicScore,

    editorialNoveltyScore,

    recentDiversityScore:
      recent.score,

    domainDiversityScore:
      domain.score,

    repetitionPenalty,

    directedFitScore,

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
    editorial: metadataOf(opportunity),

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

export class EditorialSelectionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly candidates: HighTicketOpportunityScore[] = [],
  ) {
    super(message);
    this.name = "EditorialSelectionError";
  }
}

export function selectAutonomousHighTicketContent(
  intent: HighTicketContentIntent,
  memory: EditorialMemoryItem[],
  opportunities: HighTicketOpportunity[] = HIGH_TICKET_OPPORTUNITY_PORTFOLIO,
): AutonomousContentSelection {
  const productionCode = intent.productionCode.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(productionCode)) {
    throw new Error("productionCode debe contener solo letras, números, guiones y guiones bajos.");
  }
  memory = comparableEditorialMemory(memory);
  const vetoReason = intent.qInfinityReason?.trim();
  if (memory.some((item) => item.contentCode === productionCode)) {
    throw new EditorialSelectionError("PRODUCTION_ALREADY_EXISTS",
      `${productionCode} ya figura en memoria. Use su input existente para volver a renderizarlo.`);
  }
  if (!opportunities.length) {
    throw new EditorialSelectionError("CATALOG_EMPTY", "Incorpore fichas revisadas al catálogo editorial.");
  }
  if (new Set(opportunities.map((item) => item.id)).size !== opportunities.length) {
    throw new Error("Existen IDs de oportunidad duplicados.");
  }
  const mode = intent.mode ?? (intent.requestedTopic || intent.requestedAngle ? "directed" : "autonomous");
  const objective = intent.objective?.trim() || DEFAULT_OBJECTIVE;
  const portfolio = editorialCounts(memory, opportunities);
  const vetoIds = new Set(intent.qInfinityVetoIds ?? []);
  const priorityId = intent.qInfinityPriorityId?.trim();
  const byId = new Map(opportunities.map((item) => [item.id, item]));
  if ((priorityId || vetoIds.size) && !intent.qInfinityReason?.trim()) {
    throw new EditorialSelectionError("PRIORITY_REASON_REQUIRED", "Registre el motivo de la prioridad o veto de Q∞ 01.");
  }
  if (priorityId && !byId.has(priorityId)) {
    throw new EditorialSelectionError("PRIORITY_UNAVAILABLE", "La prioridad Q∞ no existe entre las fichas disponibles y revisadas.");
  }
  const scores = opportunities.map((opportunity) => {
    const score = scoreOpportunity(productionCode, opportunity, memory, intent, mode, objective);
    const category = categoryOf(opportunity);
    // Balance observed history. Unknown historical categories remain explicit in the brief.
    const observedSize = Object.values(portfolio.nextCounts).reduce((sum, count) => sum + count, 0);
    const target = EDITORIAL_TARGETS[category] / 20 * Math.min(20, observedSize + 1);
    const deficit = target - portfolio.nextCounts[category];
    const bonus = mode === "autonomous" ? round(Math.max(0, deficit) * 3) : 0;
    score.portfolioBonus = bonus;
    score.selectionScore = round(score.totalScore + bonus);
    score.reasons.push(`portfolio-priority=${bonus}`, `portfolio-category=${category}`);
    if (vetoIds.has(opportunity.id)) {
      score.approved = false;
      score.reasons.push(`q-infinity-veto=${vetoReason}`);
    }
    return score;
  }).sort((a, b) => (b.portfolioBonus ?? 0) - (a.portfolioBonus ?? 0) || b.totalScore - a.totalScore || a.opportunityId.localeCompare(b.opportunityId));

  const priorityScore = priorityId ? scores.find((item) => item.opportunityId === priorityId) : undefined;
  if (priorityScore && !priorityScore.approved) {
    throw new EditorialSelectionError("PRIORITY_BLOCKED",
      "La prioridad Q∞ está vetada, repetida o requiere revisión. No se sustituye silenciosamente.", scores);
  }
  const selectedScore = priorityScore ?? scores.find((score) => score.approved);
  if (!selectedScore) {
    throw new EditorialSelectionError("CATALOG_NEEDS_REVIEWED_CONTENT",
      "La cartera no tiene una pieza distinta y aprobada disponible. Incorpore una nueva ficha revisada o un ángulo sustancial documentado; cambiar el número de video no cambia su contenido.", scores);
  }
  const selectedOpportunity = byId.get(selectedScore.opportunityId)!;
  return {
    version: "V3.17-C",
    productionCode,
    mode,
    objective,
    selectedOpportunity,
    editorialBrief: {
      mainCategory: categoryOf(selectedOpportunity),
      secondaryCategory: selectedOpportunity.editorial?.secondaryCategory ?? null,
      intention: objective,
      whyNow: priorityId ? `Prioridad Q∞ 01: ${intent.qInfinityReason}` :
        `Valor estratégico y novedad; ventana de ${portfolio.windowSize} videos, ${portfolio.unclassified} sin clasificación verificable.`,
      desiredPerception: selectedOpportunity.editorial?.intellectualContribution ?? selectedOpportunity.centralThesis,
      commercialOpportunity: selectedOpportunity.commercialObjective,
      topic: selectedOpportunity.topic,
      hook: selectedOpportunity.hook,
      portfolio,
      qInfinityPriorityApplied: Boolean(priorityId),
    },
    score: selectedScore,
    alternatives: scores,
    silecInput: opportunityToSilecInput(productionCode, selectedOpportunity),
  };
}
