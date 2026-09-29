import type { EditorialCategory } from "./EditorialCatalog";
import type { HighTicketOpportunity } from "./AutonomousHighTicketContentDirector";

type Dimension = "doctrinal" | "sustantiva" | "procesal" | "forense";
type DomainSeed = readonly [
  id: string,
  label: string,
  category: EditorialCategory,
  institutions: readonly string[],
];
type Lens = readonly [
  id: string,
  label: string,
  category: EditorialCategory | null,
  dimension: Dimension,
  focus: string,
  hook: string,
];

const DOMAINS: readonly DomainSeed[] = [
  [
    "constitucional",
    "Derecho Constitucional",
    "FI",
    [
      "debido proceso",
      "motivación de resoluciones",
      "tutela judicial efectiva",
      "proporcionalidad",
      "control de constitucionalidad",
    ],
  ],
  [
    "administrativo",
    "Derecho Administrativo",
    "DT",
    [
      "acto administrativo",
      "procedimiento sancionador",
      "recursos administrativos",
      "competencia administrativa",
      "contratación pública",
    ],
  ],
  [
    "civil",
    "Derecho Civil",
    "FI",
    [
      "obligaciones",
      "responsabilidad civil",
      "nulidad del acto jurídico",
      "prescripción",
      "garantías patrimoniales",
    ],
  ],
  [
    "corporativo",
    "Derecho Comercial y Corporativo",
    "HT",
    [
      "gobierno corporativo",
      "derechos de accionistas",
      "deberes de administradores",
      "fusiones y adquisiciones",
      "títulos valores",
    ],
  ],
  [
    "penal",
    "Derecho Penal",
    "FI",
    [
      "tipicidad",
      "dolo y culpa",
      "autoría y participación",
      "medidas cautelares",
      "riesgo penal empresarial",
    ],
  ],
  [
    "procesal-penal",
    "Derecho Procesal Penal",
    "DT",
    [
      "imputación",
      "acusación",
      "prueba ilícita",
      "cadena de custodia",
      "recursos penales",
    ],
  ],
  [
    "laboral",
    "Derecho Laboral y Seguridad Social",
    "DT",
    [
      "relación laboral",
      "despido",
      "beneficios sociales",
      "estabilidad laboral",
      "tercerización",
    ],
  ],
  [
    "tributario",
    "Derecho Tributario",
    "HT",
    [
      "hecho generador",
      "determinación tributaria",
      "fiscalización",
      "sanciones tributarias",
      "impugnación tributaria",
    ],
  ],
  [
    "agrario",
    "Derecho Agrario y Agroambiental",
    "DT",
    [
      "función social y económico-social",
      "saneamiento de tierras",
      "posesión agraria",
      "propiedad agraria",
      "jurisdicción agroambiental",
    ],
  ],
  [
    "minero",
    "Derecho Minero",
    "HT",
    [
      "derechos mineros",
      "contratos mineros",
      "regulación minera",
      "servidumbres mineras",
      "riesgo ambiental minero",
    ],
  ],
  [
    "energia",
    "Hidrocarburos y Energía",
    "HT",
    [
      "contratos energéticos",
      "regulación energética",
      "inversión energética",
      "tarifas y regulación económica",
      "cadena de hidrocarburos",
    ],
  ],
  [
    "arbitraje",
    "Arbitraje y Resolución de Controversias",
    "HT",
    [
      "cláusula arbitral",
      "competencia arbitral",
      "medidas cautelares arbitrales",
      "prueba arbitral",
      "laudo arbitral",
    ],
  ],
  [
    "ddhh",
    "Derechos Humanos y Control de Convencionalidad",
    "FI",
    [
      "control de convencionalidad",
      "protección judicial",
      "garantías judiciales",
      "libertad de expresión",
      "reparación integral",
    ],
  ],
  [
    "familia",
    "Derecho de Familia y Sucesiones",
    "FI",
    [
      "filiación",
      "asistencia familiar",
      "régimen de visitas",
      "divorcio y efectos patrimoniales",
      "sucesión hereditaria",
    ],
  ],
  [
    "digital",
    "Derecho Digital, Datos e Inteligencia Artificial",
    "DT",
    [
      "prueba digital",
      "protección de datos",
      "firma electrónica",
      "contratos electrónicos",
      "responsabilidad por sistemas de IA",
    ],
  ],
  [
    "compliance",
    "Compliance y Gestión Jurídica Empresarial",
    "HT",
    [
      "programa de compliance",
      "due diligence",
      "conflicto de interés",
      "investigaciones internas",
      "mapa de riesgo legal",
    ],
  ],
  [
    "seguros",
    "Derecho de Seguros",
    "HT",
    [
      "contrato de seguro",
      "declaración del riesgo",
      "siniestro",
      "cobertura y exclusiones",
      "subrogación",
    ],
  ],
  [
    "procesal-civil",
    "Derecho Procesal Civil y Comercial",
    "DT",
    [
      "competencia",
      "medidas cautelares",
      "carga de la prueba",
      "ejecución de sentencia",
      "recursos civiles",
    ],
  ],
];

const LENSES: readonly Lens[] = [
  [
    "norma",
    "norma aplicable",
    null,
    "sustantiva",
    "identificar la regla exacta, su vigencia, jerarquía y ámbito antes de citarla",
    "El artículo correcto vale más que diez citas imprecisas",
  ],
  [
    "jurisprudencia",
    "jurisprudencia y ratio decidendi",
    "FI",
    "doctrinal",
    "separar hechos, ratio decidendi, alcance y diferencias antes de trasladar un precedente",
    "Una sentencia parecida no siempre es un precedente aplicable",
  ],
  [
    "prueba",
    "arquitectura probatoria",
    null,
    "forense",
    "definir qué hecho necesita prueba, qué fuente puede demostrarlo y qué debilidad debe anticiparse",
    "Sin prueba, una buena teoría sigue siendo una hipótesis",
  ],
  [
    "procedimiento",
    "ruta procesal",
    "DT",
    "procesal",
    "ordenar competencia, legitimación, plazo, carga, acto siguiente y consecuencia",
    "Una buena pretensión puede perderse por una mala secuencia",
  ],
  [
    "errores",
    "errores críticos",
    null,
    "forense",
    "detectar fallas que cambian admisibilidad, prueba, responsabilidad o ejecutabilidad",
    "Los errores jurídicos más caros suelen parecer menores al principio",
  ],
  [
    "riesgo",
    "riesgo y prevención",
    "HT",
    "forense",
    "identificar exposición antes del conflicto y diseñar controles verificables",
    "El mejor conflicto es el que se detecta antes de existir",
  ],
  [
    "estrategia",
    "estrategia de decisión",
    "HT",
    "forense",
    "comparar alternativas por impacto, costo, tiempo, reversibilidad, prueba y ejecución",
    "Tener razón no sustituye tener una estrategia",
  ],
  [
    "constitucional",
    "control constitucional",
    "FI",
    "doctrinal",
    "examinar debido proceso, defensa, motivación, igualdad, proporcionalidad y tutela cuando sean pertinentes",
    "La legalidad también debe resistir un examen constitucional",
  ],
  [
    "empresa",
    "impacto empresarial",
    "HT",
    "forense",
    "conectar la respuesta jurídica con dinero, continuidad, reputación, negociación y riesgo futuro",
    "El costo jurídico rara vez termina en el expediente",
  ],
  [
    "ejecucion",
    "ejecutabilidad",
    null,
    "procesal",
    "traducir la conclusión en actos, responsables, documentos, plazos y cumplimiento",
    "Una solución que no puede ejecutarse todavía no es una solución",
  ],
  [
    "doctrina",
    "concepto e institución",
    "FI",
    "doctrinal",
    "delimitar concepto, función, elementos, límites y relación con instituciones cercanas",
    "Definir bien el problema elimina la mitad de los errores",
  ],
  [
    "contraargumento",
    "contraargumento y defensa anticipada",
    null,
    "forense",
    "formular la objeción más fuerte, identificar el hecho que podría derrotar la tesis y preparar réplica",
    "Un argumento serio empieza por intentar derrotarse a sí mismo",
  ],
];

function score(base: number, salt: number) {
  return Math.min(99, base + (salt % 4));
}

function makeOpportunity(
  domain: DomainSeed,
  institution: string,
  lens: Lens,
  index: number,
): HighTicketOpportunity {
  const [domainId, domainLabel, defaultCategory] = domain;
  const [lensId, lensLabel, lensCategory, dimension, focus, hookLead] = lens;
  const category = lensCategory ?? defaultCategory;
  const safeId = institution
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = `auto-dyn-${domainId}-${safeId}-${lensId}`;

  return {
    id,
    domain: domainLabel,
    topic: `${institution}: ${lensLabel}`,
    centralThesis:
      `En ${domainLabel}, ${institution} exige ${focus}. ` +
      "La conclusión solo debe formularse después de separar hechos comprobados, inferencias, fuente jurídica y prueba.",
    problem: `El tratamiento superficial de ${institution} suele confundir categorías y producir decisiones difíciles de probar o ejecutar.`,
    reasoningChain: [
      `Delimitar el problema concreto relativo a ${institution}.`,
      `Separar hechos comprobados, inferencias y datos todavía inciertos.`,
      `Aplicar el enfoque de ${lensLabel}: ${focus}.`,
      "Verificar la norma, artículo o precedente exacto antes de publicar una afirmación específica.",
      "Construir el contraargumento más fuerte y determinar qué prueba podría cambiar la conclusión.",
      "Cerrar con una decisión, una acción siguiente y un criterio de ejecución o control.",
    ],
    conclusion: `El valor profesional en ${institution} está en convertir información dispersa en una estructura verificable para decidir, probar y ejecutar con menor riesgo.`,
    targetAudience: [
      "abogados",
      "empresas",
      "directivos",
      "personas con asuntos jurídicos relevantes",
    ],
    capabilityDemonstrated: [
      `dominio de ${domainLabel}`,
      lensLabel,
      "integración de hechos, prueba, norma, estrategia y ejecución",
    ],
    commercialObjective:
      category === "HT"
        ? "Demostrar capacidad para prevenir, estructurar y resolver asuntos jurídicos de alto impacto económico."
        : "Construir autoridad intelectual y demostrar criterio jurídico transversal aplicable a asuntos complejos.",
    offerPath: [
      "diagnóstico jurídico estratégico",
      "segunda opinión jurídica",
      "arquitectura de caso",
      "asesoría preventiva o litigiosa premium",
    ],
    hook: `${hookLead}: ${institution}.`,
    closingIdea: `${institution} deja de ser una etiqueta cuando se convierte en un problema delimitado, probado y ejecutable.`,
    cta: "Antes de decidir en un asunto relevante, exige una estructura que conecte hechos, prueba, norma, riesgos, alternativas y ejecución.",
    strategicValue: score(95, index),
    authorityValue: score(96, index + 1),
    commercialPotential:
      category === "HT" ? score(97, index + 2) : score(91, index),
    urgencyValue: score(88, index + 3),
    reusability: 98,
    scalability: 99,
    editorial: {
      opportunityId: id,
      category,
      dimension,
      domains: [domainId, domainLabel],
      intellectualContribution: `${lensLabel} aplicado a ${institution} dentro de ${domainLabel}, con separación entre hechos, prueba, fuente jurídica, contraargumento, decisión y ejecución.`,
      productionGate: "draft-render-ok",
    },
    editorialScores: {
      intellectualAuthority: score(96, index),
      legalBreadth: score(category === "DT" ? 97 : 93, index + 1),
      commercialPotential: score(category === "HT" ? 98 : 91, index + 2),
      retention: score(93, index + 3),
      seo: score(90, index),
      differentiation: score(96, index + 1),
      timeliness: score(91, index + 2),
    },
  };
}

export function buildDynamicLegalEditorialUniverse(): HighTicketOpportunity[] {
  const result: HighTicketOpportunity[] = [];
  let index = 0;
  for (const domain of DOMAINS) {
    for (const institution of domain[3]) {
      for (const lens of LENSES) {
        result.push(makeOpportunity(domain, institution, lens, index));
        index += 1;
      }
    }
  }
  const ids = new Set(result.map((item) => item.id));
  if (ids.size !== result.length) {
    throw new Error("DynamicLegalEditorialUniverse generó IDs duplicados.");
  }
  return result;
}
