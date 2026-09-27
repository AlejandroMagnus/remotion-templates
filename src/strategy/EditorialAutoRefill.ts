import fs from "node:fs";
import path from "node:path";
import type { HighTicketOpportunity } from "./AutonomousHighTicketContentDirector";

type Category = "FI" | "DT" | "HT";
type Dimension = "doctrinal" | "sustantiva" | "procesal" | "forense";

type AgendaProposal = {
  id: string;
  category: Category;
  dimension: Dimension;
  domains: string[];
  question: string;
  researchTask: string;
};

type Agenda = {
  proposals: AgendaProposal[];
};

type AngleBlueprint = {
  id: string;
  label: string;
  focus: string;
  capability: string;
  hookLead: string;
};

const ANGLES: AngleBlueprint[] = [
  {
    id: "diagnostico",
    label: "diagnóstico",
    focus:
      "identificar primero el verdadero problema jurídico y separar hechos, supuestos y consecuencias",
    capability: "diagnóstico jurídico estructurado",
    hookLead: "El error suele empezar antes de citar una norma",
  },
  {
    id: "prueba",
    label: "prueba",
    focus:
      "determinar qué afirmaciones necesitan respaldo y qué evidencia puede cambiar la decisión",
    capability: "arquitectura probatoria",
    hookLead: "Una buena teoría sin prueba sigue siendo una hipótesis",
  },
  {
    id: "riesgo",
    label: "riesgo",
    focus:
      "detectar qué omisión, plazo, documento o supuesto puede destruir una posición aparentemente sólida",
    capability: "detección anticipada de riesgos",
    hookLead: "El riesgo jurídico más caro suele ser el que nadie diagnosticó",
  },
  {
    id: "estrategia",
    label: "estrategia",
    focus:
      "ordenar alternativas por impacto, reversibilidad, costo y capacidad real de ejecución",
    capability: "diseño de estrategia jurídica",
    hookLead: "Tener razón no sustituye tener una estrategia",
  },
  {
    id: "contraargumento",
    label: "contraargumento",
    focus:
      "formular la objeción más fuerte antes de adoptar una conclusión y construir una respuesta verificable",
    capability: "defensa anticipada y réplica",
    hookLead: "Un argumento serio empieza por intentar derrotarse a sí mismo",
  },
  {
    id: "prevencion",
    label: "prevención",
    focus:
      "identificar controles que deben activarse antes de que el desacuerdo se convierta en conflicto",
    capability: "prevención jurídica",
    hookLead:
      "El mejor litigio es muchas veces el conflicto que se evitó a tiempo",
  },
  {
    id: "procedimiento",
    label: "procedimiento",
    focus:
      "secuenciar actuación, competencia, plazo, carga y documentación para evitar improvisaciones",
    capability: "arquitectura procesal",
    hookLead: "Una buena pretensión puede perderse por una mala secuencia",
  },
  {
    id: "precedente",
    label: "precedente",
    focus:
      "distinguir la regla aplicable de las frases accesorias y verificar la analogía de los hechos relevantes",
    capability: "razonamiento jurisprudencial",
    hookLead: "Citar una sentencia no equivale a usar un precedente",
  },
  {
    id: "constitucional",
    label: "control constitucional",
    focus:
      "examinar debido proceso, motivación, defensa, proporcionalidad y tutela efectiva cuando resulten pertinentes",
    capability: "constitucionalización del análisis",
    hookLead:
      "Una decisión jurídicamente correcta también debe ser constitucionalmente defendible",
  },
  {
    id: "ejecucion",
    label: "ejecución",
    focus:
      "traducir la conclusión jurídica en actos, responsables, documentos, plazos y verificación de cumplimiento",
    capability: "ejecución jurídica",
    hookLead:
      "Una estrategia que no puede ejecutarse todavía no es una solución",
  },
  {
    id: "empresa",
    label: "impacto empresarial",
    focus:
      "conectar la decisión jurídica con continuidad operativa, dinero, reputación, negociación y exposición futura",
    capability: "criterio jurídico empresarial",
    hookLead: "El costo legal rara vez termina en el expediente",
  },
  {
    id: "decision",
    label: "decisión",
    focus:
      "convertir información dispersa en una decisión defendible, explicando incertidumbre, alternativas y costo de error",
    capability: "toma de decisiones jurídicas",
    hookLead: "El valor del análisis aparece cuando permite decidir mejor",
  },
];

function trimQuestion(value: string) {
  return value.replace(/[¿?]+/g, "").trim();
}

function lowerFirst(value: string) {
  return value.length ? value[0].toLowerCase() + value.slice(1) : value;
}

function audience(category: Category) {
  if (category === "FI") {
    return [
      "abogados litigantes",
      "asesores jurídicos",
      "equipos legales que buscan criterio avanzado",
    ];
  }
  if (category === "DT") {
    return [
      "direcciones jurídicas",
      "empresas reguladas",
      "abogados que integran varias ramas del derecho",
    ];
  }
  return [
    "empresarios y directorios",
    "gerencias",
    "clientes de servicios jurídicos premium",
  ];
}

function scores(category: Category, angleIndex: number) {
  const shift = angleIndex % 5;
  return {
    intellectualAuthority: category === "FI" ? 97 : 93 + shift,
    legalBreadth: category === "DT" ? 97 : 90 + shift,
    commercialPotential: category === "HT" ? 98 : 88 + shift,
    retention: 91 + (shift % 4),
    seo: 86 + shift,
    differentiation: 94 + (shift % 3),
    timeliness: 88 + shift,
  };
}

function opportunity(
  proposal: AgendaProposal,
  angle: AngleBlueprint,
  angleIndex: number,
): HighTicketOpportunity {
  const subject = trimQuestion(proposal.question);
  const research = proposal.researchTask.replace(/\.$/, "").trim();
  const subjectLower = lowerFirst(subject);

  return {
    id: `auto-${proposal.id}-${angle.id}`,
    domain: proposal.domains[0] || "derecho",
    topic: `${subject} — ${angle.label}`,
    centralThesis:
      `Para analizar ${subjectLower} con rigor no conviene empezar por una respuesta prefabricada. ` +
      `El método debe ${lowerFirst(research)} y, desde el ángulo de ${angle.label}, ` +
      `${angle.focus}.`,
    problem:
      `La práctica jurídica pierde precisión cuando ${subjectLower} se aborda con una conclusión anticipada, ` +
      `sin distinguir hechos relevantes, evidencia, regla aplicable, objeciones y consecuencias.`,
    reasoningChain: [
      `Delimitar el problema: ${subject}.`,
      `Ordenar el trabajo de investigación: ${research}.`,
      `Aplicar el foco de ${angle.label}: ${angle.focus}.`,
      "Separar hechos comprobados, inferencias, norma o criterio aplicable y puntos todavía inciertos.",
      "Construir la conclusión junto con su contraargumento principal y verificar qué dato podría modificarla.",
      "Traducir el análisis en una decisión concreta, una acción siguiente y un criterio de control.",
    ],
    conclusion:
      `En ${subjectLower}, la ventaja profesional no está en responder más rápido sino en reducir el error de decisión. ` +
      `El enfoque de ${angle.label} obliga a mostrar qué se sabe, qué falta probar, qué riesgo permanece y qué debe hacerse después.`,
    targetAudience: audience(proposal.category),
    capabilityDemonstrated: [
      angle.capability,
      "razonamiento jurídico estructurado",
      "integración de hechos, prueba, norma y estrategia",
    ],
    commercialObjective:
      "Demostrar criterio jurídico propio y capacidad de estructurar problemas complejos para servicios de análisis, segunda opinión y estrategia premium.",
    offerPath: [
      "diagnóstico jurídico estratégico",
      "segunda opinión jurídica",
      "arquitectura de caso",
      "asesoría preventiva o litigiosa premium",
    ],
    hook: `${angle.hookLead}: ${subject}.`,
    closingIdea: `El criterio superior no acumula información: convierte ${subjectLower} en una estructura verificable para decidir y actuar.`,
    cta: "Cuando un asunto tenga consecuencias relevantes, exige un diagnóstico que conecte hechos, prueba, norma, riesgo y ejecución antes de decidir.",
    strategicValue: 94 + (angleIndex % 5),
    authorityValue: 94 + ((angleIndex + 2) % 5),
    commercialPotential:
      proposal.category === "HT" ? 98 : 90 + (angleIndex % 5),
    urgencyValue: 86 + (angleIndex % 7),
    reusability: 96,
    scalability: 97,
    editorial: {
      opportunityId: `auto-${proposal.id}-${angle.id}`,
      category: proposal.category,
      dimension: proposal.dimension,
      domains: proposal.domains.length ? proposal.domains : ["derecho"],
      intellectualContribution: `Aplicar ${angle.label} a ${subjectLower} mediante una cadena problema → hechos → prueba → criterio → contraargumento → decisión → ejecución.`,
      productionGate: "draft-render-ok",
    },
    editorialScores: scores(proposal.category, angleIndex),
  };
}

export function buildEditorialAutoRefill(
  file = path.resolve("content/opportunities/agenda.json"),
): HighTicketOpportunity[] {
  if (!fs.existsSync(file)) {
    throw new Error(`No existe agenda editorial para AUTO-REFILL: ${file}`);
  }

  const agenda = JSON.parse(fs.readFileSync(file, "utf8")) as Agenda;
  if (!Array.isArray(agenda.proposals) || agenda.proposals.length === 0) {
    throw new Error("La agenda editorial no contiene propuestas.");
  }

  const result = agenda.proposals.flatMap((proposal) =>
    ANGLES.map((angle, angleIndex) => opportunity(proposal, angle, angleIndex)),
  );

  const ids = new Set(result.map((item) => item.id));
  if (ids.size !== result.length) {
    throw new Error("AUTO-REFILL generó IDs duplicados.");
  }

  return result;
}
