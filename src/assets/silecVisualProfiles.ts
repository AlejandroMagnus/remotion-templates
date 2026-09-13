export type SilecVisualProfile = {
  queries: string[];
  positive: string[];
  negative?: string[];
};

const SILEC_PROFILES: Record<string, SilecVisualProfile> = {
  hechos: {
    queries: [
      "lawyer reconstructing case facts timeline documents",
      "attorney reviewing incident chronology documents",
      "legal case facts evidence timeline desk",
    ],
    positive: [
      "lawyer",
      "attorney",
      "facts",
      "timeline",
      "case",
      "documents",
      "evidence",
      "review",
    ],
    negative: [
      "celebration",
      "party",
      "sports",
    ],
  },

  norma: {
    queries: [
      "lawyer reading legislation law book office",
      "legal code statute book documents desk",
      "attorney researching law legislation",
    ],
    positive: [
      "law",
      "legislation",
      "statute",
      "code",
      "book",
      "lawyer",
      "legal",
      "documents",
    ],
  },

  jurisprudencia: {
    queries: [
      "lawyer researching court precedent case law",
      "legal research court rulings law books",
      "attorney analyzing judicial decisions",
    ],
    positive: [
      "court",
      "precedent",
      "case",
      "law",
      "research",
      "ruling",
      "lawyer",
      "judge",
    ],
  },

  "teoria-caso": {
    queries: [
      "lawyer organizing case strategy evidence documents",
      "attorney planning legal case board notes",
      "legal case strategy evidence analysis",
    ],
    positive: [
      "lawyer",
      "strategy",
      "case",
      "evidence",
      "documents",
      "planning",
      "notes",
      "analysis",
    ],
  },

  "estrategia-juridica": {
    queries: [
      "lawyer strategic planning legal case documents",
      "attorney legal strategy meeting paperwork",
      "lawyer analyzing strategy case office",
    ],
    positive: [
      "lawyer",
      "attorney",
      "strategy",
      "planning",
      "case",
      "documents",
      "meeting",
      "analysis",
    ],
  },

  riesgos: {
    queries: [
      "lawyer risk assessment documents office",
      "legal risk analysis professional desk",
      "attorney serious reviewing legal risks",
    ],
    positive: [
      "lawyer",
      "risk",
      "analysis",
      "documents",
      "serious",
      "review",
      "professional",
    ],
  },

  objetivo: {
    queries: [
      "lawyer client strategy meeting planning goals",
      "attorney consultation planning legal strategy",
      "professional legal consultation objectives",
    ],
    positive: [
      "lawyer",
      "client",
      "strategy",
      "planning",
      "meeting",
      "consultation",
    ],
  },

  diagnostico: {
    queries: [
      "lawyer consultation reviewing case documents client",
      "attorney legal consultation analyzing documents",
      "professional lawyer case assessment office",
    ],
    positive: [
      "lawyer",
      "consultation",
      "client",
      "case",
      "analysis",
      "documents",
      "assessment",
    ],
  },
};

const BRIDGES: Array<{
  spanish: string[];
  english: string[];
}> = [
  {
    spanish: ["hecho", "hechos", "ocurrió"],
    english: ["facts", "timeline", "case", "evidence"],
  },
  {
    spanish: ["norma", "normas", "normativa"],
    english: ["law", "legislation", "statute", "code"],
  },
  {
    spanish: ["jurisprudencia", "precedente"],
    english: ["precedent", "court", "ruling", "research"],
  },
  {
    spanish: ["teoría del caso", "teoria del caso"],
    english: ["case", "strategy", "evidence", "planning"],
  },
  {
    spanish: ["estrategia", "posición adversa", "posicion adversa"],
    english: ["strategy", "planning", "analysis", "case"],
  },
  {
    spanish: ["riesgo", "riesgos", "consecuencias"],
    english: ["risk", "analysis", "review", "professional"],
  },
  {
    spanish: ["diagnóstico", "diagnostico"],
    english: ["consultation", "assessment", "analysis", "case"],
  },
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function getSilecVisualProfile(
  ruleId: string,
): SilecVisualProfile | null {
  return SILEC_PROFILES[ruleId] ?? null;
}

export function getSilecContextTerms(
  context: string,
): string[] {
  const normalized = normalize(context);
  const terms: string[] = [];

  for (const bridge of BRIDGES) {
    if (
      bridge.spanish.some((term) =>
        normalized.includes(normalize(term)),
      )
    ) {
      terms.push(...bridge.english);
    }
  }

  return [...new Set(terms)];
}
