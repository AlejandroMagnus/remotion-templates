export const AUTHORSHIP_AUDIT_VERSION = "AUTORIA-SINGULARIDAD-AUDIT-V1";

export type AuditStage = "script" | "final";

export type MemoryRecord = {
  contentCode: string;
  topic: string;
  thesis: string;
  narrationText: string;
  status?: string | null;
  publishedAt?: string | null;
};

export type AuditScene = {
  id?: string;
  type?: string;
  title?: string;
  content?: unknown;
};

export type CurrentPiece = {
  productionCode: string;
  topic: string;
  thesis: string;
  problem: string;
  conclusion: string;
  hook: string;
  closingIdea: string;
  reasoningChain: string[];
  narration: string;
  scenes: AuditScene[];
  creativeDecision?: unknown;
  prosodyPlan?: unknown;
  resolvedAssets?: unknown;
};

export type SimilarityHit = {
  contentCode: string;
  topic: string;
  score: number;
};

export type AuthorshipAuditResult = {
  version: string;
  stage: AuditStage;
  productionCode: string;
  status: "passed" | "blocked";
  score: number;
  dimensions: {
    conceptualDistinctiveness: number;
    specificity: number;
    openingOriginality: number;
    structuralOriginality: number;
    closingOriginality: number;
    practicalValue: number;
    visualIdentity: number;
    authorialVoice: number;
  };
  maxima: {
    thesisSimilarity: SimilarityHit | null;
    narrationSimilarity: SimilarityHit | null;
    openingSimilarity: SimilarityHit | null;
    closingSimilarity: SimilarityHit | null;
    structuralSimilarity: SimilarityHit | null;
  };
  diagnostics: {
    memoryCount: number;
    sourceSpecificTerms: string[];
    sourceSpecificTermCount: number;
    narrationSpecificDensity: number;
    genericRhetoricHits: string[];
    roleFingerprint: string[];
    genericSceneRatio: number;
    uniqueSceneTitleRatio: number;
    practicalSignals: string[];
    prosodyVariety: number | null;
    assetProviderVariety: number | null;
  };
  blockers: string[];
  warnings: string[];
  rules: string[];
};

const STOPWORDS = new Set([
  "a",
  "al",
  "algo",
  "algun",
  "alguna",
  "algunas",
  "alguno",
  "algunos",
  "ante",
  "antes",
  "asi",
  "aun",
  "aunque",
  "bajo",
  "bien",
  "cada",
  "como",
  "con",
  "contra",
  "cual",
  "cuando",
  "de",
  "del",
  "desde",
  "donde",
  "dos",
  "el",
  "ella",
  "ellas",
  "ello",
  "ellos",
  "en",
  "entre",
  "era",
  "es",
  "esa",
  "esas",
  "ese",
  "eso",
  "esos",
  "esta",
  "estas",
  "este",
  "esto",
  "estos",
  "fue",
  "ha",
  "hay",
  "la",
  "las",
  "le",
  "les",
  "lo",
  "los",
  "mas",
  "mi",
  "mientras",
  "muy",
  "no",
  "nos",
  "o",
  "otra",
  "otro",
  "para",
  "pero",
  "por",
  "porque",
  "que",
  "se",
  "ser",
  "si",
  "sin",
  "sobre",
  "son",
  "su",
  "sus",
  "tambien",
  "tiene",
  "un",
  "una",
  "unas",
  "uno",
  "unos",
  "y",
  "ya",
  "juridico",
  "juridica",
  "juridicos",
  "juridicas",
  "derecho",
  "derechos",
  "proceso",
  "procesal",
  "caso",
  "casos",
  "norma",
  "normas",
  "ley",
  "leyes",
  "analisis",
  "estrategia",
  "estrategico",
  "estrategica",
  "decision",
  "decisiones",
  "problema",
  "problemas",
  "situacion",
  "situaciones",
]);

const GENERIC_RHETORIC: Array<[string, RegExp]> = [
  ["no-basta", /\bno basta\b/i],
  ["punto-decisivo", /\bpunto decisivo\b/i],
  ["verdadera-diferencia", /\bverdadera diferencia\b/i],
  ["antes-de-decidir", /\bantes de (?:actuar|decidir|tomar una decision)\b/i],
  ["puede-cambiar", /\bpuede cambiar (?:el|la) (?:caso|resultado|decision)\b/i],
  ["mirar-mas-alla", /\bmirar mas alla\b/i],
  ["comprender-sistema", /\bcomprender (?:el|un) sistema\b/i],
  ["no-es-solo", /\bno es solo\b/i],
  ["lo-importante", /\blo importante\b/i],
  ["la-clave", /\bla clave\b/i],
];

const GENERIC_SCENES = new Set([
  "diagnostico",
  "estrategia",
  "decision",
  "problema",
  "analisis",
  "conclusion",
  "cierre",
  "contexto",
  "solucion",
  "riesgo",
]);

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function counts(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const token of tokens) {
    map.set(token, (map.get(token) ?? 0) + 1);
  }
  return map;
}

export function cosineSimilarity(a: string, b: string): number {
  const ca = counts(tokenize(a));
  const cb = counts(tokenize(b));
  const keys = new Set([...ca.keys(), ...cb.keys()]);
  if (keys.size === 0) return 0;

  let dot = 0;
  let na = 0;
  let nb = 0;

  for (const key of keys) {
    const va = ca.get(key) ?? 0;
    const vb = cb.get(key) ?? 0;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }

  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

function bigrams(value: string): Set<string> {
  const ts = tokenize(value);
  const out = new Set<string>();
  for (let i = 0; i < ts.length - 1; i++) {
    out.add(`${ts[i]} ${ts[i + 1]}`);
  }
  return out;
}

function jaccardSet(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function weightedTextSimilarity(a: string, b: string): number {
  const cosine = cosineSimilarity(a, b);
  const bigram = jaccardSet(bigrams(a), bigrams(b));
  return Math.min(1, 0.68 * cosine + 0.32 * bigram);
}

function edgeWords(value: string, side: "start" | "end"): string {
  const words = normalizeText(value).split(" ").filter(Boolean);
  const selected = side === "start" ? words.slice(0, 42) : words.slice(-42);
  return selected.join(" ");
}

export function inferRoleFingerprint(narration: string): string[] {
  const sentences = narration
    .split(/(?<=[.!?])\s+/)
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return sentences.slice(0, 14).map((sentence) => {
    if (
      /\bcomo\b|\bpaso\b|\bprimero\b|\bsegundo\b|\btramite\b|\brequisit/.test(
        sentence,
      )
    )
      return "route";
    if (/\bprueb|\bdocument|\bacredit|\bdemostr/.test(sentence))
      return "evidence";
    if (
      /\bcontraparte\b|\bdemandad|\bactor\b|\bdefensa\b|\batacar\b|\boposicion\b/.test(
        sentence,
      )
    )
      return "adversarial";
    if (/\bimpugn|\brecurso\b|\bapel|\brevoc|\bjerarqu/.test(sentence))
      return "remedy";
    if (/\briesgo\b|\bperder\b|\bcaducid|\bprescrip|\bplazo\b/.test(sentence))
      return "risk";
    if (
      /\bconstitucional|\bdebido proceso\b|\btutela\b|\bconvencional/.test(
        sentence,
      )
    )
      return "constitutional";
    if (/\bsi\b.*\bentonces\b|\bsi ocurre\b|\bsi la\b/.test(sentence))
      return "decision-tree";
    if (/\?$/.test(sentence)) return "question";
    if (
      /\bconclusion\b|\bpor eso\b|\ben sintesis\b|\bresultado\b/.test(sentence)
    )
      return "closing";
    return "explanation";
  });
}

function fingerprintSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const aa = new Set(a.map((x, i) => `${i}:${x}`));
  const bb = new Set(b.map((x, i) => `${i}:${x}`));
  const positional = jaccardSet(aa, bb);
  const flowA = new Set(a.slice(0, -1).map((x, i) => `${x}>${a[i + 1]}`));
  const flowB = new Set(b.slice(0, -1).map((x, i) => `${x}>${b[i + 1]}`));
  const flow = jaccardSet(flowA, flowB);
  return 0.58 * positional + 0.42 * flow;
}

function sourceSpecificTerms(piece: CurrentPiece): string[] {
  const source = [
    piece.topic,
    piece.thesis,
    piece.problem,
    piece.conclusion,
    ...piece.reasoningChain,
  ].join(" ");

  const freq = counts(tokenize(source));
  return [...freq.entries()]
    .filter(([token]) => token.length >= 5)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([token]) => token)
    .slice(0, 28);
}

function genericRhetoricHits(narration: string): string[] {
  return GENERIC_RHETORIC.filter(([, pattern]) =>
    pattern.test(normalizeText(narration)),
  ).map(([name]) => name);
}

function sceneTitle(scene: AuditScene): string {
  const title =
    typeof scene.title === "string"
      ? scene.title
      : typeof scene.id === "string"
        ? scene.id
        : typeof scene.type === "string"
          ? scene.type
          : "";
  return normalizeText(title);
}

function genericSceneRatio(scenes: AuditScene[]): number {
  if (scenes.length === 0) return 0;
  const generic = scenes.filter((scene) => {
    const title = sceneTitle(scene);
    return [...GENERIC_SCENES].some(
      (term) => title === term || title.includes(term),
    );
  }).length;
  return generic / scenes.length;
}

function uniqueSceneTitleRatio(scenes: AuditScene[]): number {
  if (scenes.length === 0) return 1;
  const titles = scenes.map(sceneTitle).filter(Boolean);
  if (titles.length === 0) return 0;
  return new Set(titles).size / titles.length;
}

function practicalSignals(piece: CurrentPiece): string[] {
  const n = normalizeText(piece.narration);
  const checks: Array<[string, RegExp]> = [
    ["route", /\bprimero\b|\bsegundo\b|\bpaso\b|\btramite\b|\brequisit/],
    ["evidence", /\bprueb|\bdocument|\bacredit|\bdemostr/],
    ["deadline", /\bplazo\b|\bcaducid|\bprescrip|\bvencim/],
    [
      "authority",
      /\bautoridad\b|\bjuez\b|\btribunal\b|\bregistro\b|\bentidad\b/,
    ],
    [
      "adversarial",
      /\bcontraparte\b|\bdefensa\b|\boposicion\b|\bexcepcion\b|\batacar\b/,
    ],
    ["remedy", /\bimpugn|\brecurso\b|\bapel|\brevoc|\bjerarqu/],
    ["execution", /\bejecucion\b|\bcumplim|\bcobro\b|\bhacer efectivo\b/],
    ["decision", /\bsi\b.{0,60}\bentonces\b|\balternativa\b|\bdecidir\b/],
  ];
  return checks.filter(([, pattern]) => pattern.test(n)).map(([name]) => name);
}

function flattenStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) {
    for (const item of value) flattenStrings(item, out);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      flattenStrings(item, out);
    }
  }
  return out;
}

function prosodyVariety(value: unknown): number | null {
  if (!value) return null;
  const strings = flattenStrings(value).map(normalizeText).filter(Boolean);
  const roleLike = strings.filter((x) =>
    /opening|question|warning|authority|explanation|reflection|decision|closing|revelation|contrast|evidence/.test(
      x,
    ),
  );
  if (roleLike.length === 0) return null;
  return new Set(roleLike).size;
}

function assetProviderVariety(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const strings = flattenStrings(value).map(normalizeText).filter(Boolean);
  const providers = strings.filter((x) =>
    /pexels|native-three|supabase|generated|graphic|video|image/.test(x),
  );
  if (providers.length === 0) return null;
  return new Set(providers).size;
}

function topHit(
  current: string,
  memory: MemoryRecord[],
  pick: (item: MemoryRecord) => string,
): SimilarityHit | null {
  let best: SimilarityHit | null = null;
  for (const item of memory) {
    const target = pick(item);
    if (!target.trim()) continue;
    const score = weightedTextSimilarity(current, target);
    if (!best || score > best.score) {
      best = {
        contentCode: item.contentCode,
        topic: item.topic,
        score: Number(score.toFixed(4)),
      };
    }
  }
  return best;
}

function topStructureHit(
  fingerprint: string[],
  memory: MemoryRecord[],
): SimilarityHit | null {
  let best: SimilarityHit | null = null;
  for (const item of memory) {
    if (!item.narrationText.trim()) continue;
    const score = fingerprintSimilarity(
      fingerprint,
      inferRoleFingerprint(item.narrationText),
    );
    if (!best || score > best.score) {
      best = {
        contentCode: item.contentCode,
        topic: item.topic,
        score: Number(score.toFixed(4)),
      };
    }
  }
  return best;
}

export function auditAuthorshipSingularity(
  piece: CurrentPiece,
  memory: MemoryRecord[],
  stage: AuditStage,
): AuthorshipAuditResult {
  const usableMemory = memory
    .filter((item) => item.contentCode !== piece.productionCode)
    .filter(
      (item) =>
        Boolean(item.thesis.trim()) || Boolean(item.narrationText.trim()),
    )
    .slice(0, 20);

  const terms = sourceSpecificTerms(piece);
  const narrationTokens = new Set(tokenize(piece.narration));
  const matchedTerms = terms.filter((term) => narrationTokens.has(term));
  const density = terms.length === 0 ? 0 : matchedTerms.length / terms.length;

  const rhetoric = genericRhetoricHits(piece.narration);
  const roles = inferRoleFingerprint(piece.narration);
  const sceneGeneric = genericSceneRatio(piece.scenes);
  const sceneUnique = uniqueSceneTitleRatio(piece.scenes);
  const practical = practicalSignals(piece);

  const thesisHit = topHit(piece.thesis, usableMemory, (item) => item.thesis);
  const narrationHit = topHit(
    piece.narration,
    usableMemory,
    (item) => item.narrationText,
  );
  const openingHit = topHit(
    edgeWords(piece.narration, "start"),
    usableMemory,
    (item) => edgeWords(item.narrationText, "start"),
  );
  const closingHit = topHit(
    edgeWords(piece.narration, "end"),
    usableMemory,
    (item) => edgeWords(item.narrationText, "end"),
  );
  const structureHit = topStructureHit(roles, usableMemory);

  const maxConcept = Math.max(thesisHit?.score ?? 0, narrationHit?.score ?? 0);

  const conceptualDistinctiveness = clamp(100 - maxConcept * 100);

  const specificity = clamp(
    36 + density * 72 - rhetoric.length * 7 - (terms.length < 8 ? 12 : 0),
  );

  const openingOriginality = clamp(100 - (openingHit?.score ?? 0) * 100);

  const structuralOriginality = clamp(100 - (structureHit?.score ?? 0) * 100);

  const closingOriginality = clamp(100 - (closingHit?.score ?? 0) * 100);

  const practicalValue = clamp(38 + Math.min(6, practical.length) * 10);

  const visualIdentity = clamp(
    100 - sceneGeneric * 55 - (1 - sceneUnique) * 35,
  );

  const authorialVoice = clamp(
    88 - rhetoric.length * 12 - ((openingHit?.score ?? 0) > 0.6 ? 14 : 0),
  );

  const dimensions = {
    conceptualDistinctiveness,
    specificity,
    openingOriginality,
    structuralOriginality,
    closingOriginality,
    practicalValue,
    visualIdentity,
    authorialVoice,
  };

  let score =
    conceptualDistinctiveness * 0.23 +
    specificity * 0.19 +
    openingOriginality * 0.1 +
    structuralOriginality * 0.14 +
    closingOriginality * 0.06 +
    practicalValue * 0.1 +
    visualIdentity * 0.11 +
    authorialVoice * 0.07;

  const pv = prosodyVariety(piece.prosodyPlan);
  const av = assetProviderVariety(piece.resolvedAssets);

  if (stage === "final") {
    if (pv !== null) {
      score += pv >= 4 ? 2 : pv <= 2 ? -4 : 0;
    }
    if (av !== null) {
      score += av >= 2 ? 2 : av <= 1 ? -3 : 0;
    }
  }

  score = clamp(score);

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (piece.narration.trim().length < 220) {
    blockers.push("Narración demasiado breve para demostrar autoría propia.");
  }
  if (piece.thesis.trim().length < 35) {
    blockers.push("La tesis es demasiado débil o genérica.");
  }
  if ((narrationHit?.score ?? 0) >= 0.72) {
    blockers.push(
      `Narración demasiado similar a ${narrationHit?.contentCode}.`,
    );
  }
  if ((thesisHit?.score ?? 0) >= 0.8) {
    blockers.push(`Tesis demasiado similar a ${thesisHit?.contentCode}.`);
  }
  if ((openingHit?.score ?? 0) >= 0.78) {
    blockers.push(`Apertura demasiado similar a ${openingHit?.contentCode}.`);
  }
  if (specificity < 55) {
    blockers.push(
      "Riesgo alto de sustitución de tema: el discurso conserva demasiada genericidad.",
    );
  }
  if (piece.scenes.length >= 4 && sceneGeneric >= 0.65) {
    blockers.push(
      "La gramática visual depende excesivamente de escenas genéricas.",
    );
  }
  if (score < 76) {
    blockers.push(
      `Puntuación de autoría ${score}/100 por debajo del mínimo 76.`,
    );
  }

  if (usableMemory.length < 5) {
    warnings.push(
      "Memoria histórica insuficiente: la comparación inter-video es parcial.",
    );
  }
  if (rhetoric.length >= 2) {
    warnings.push(
      `Se detectaron fórmulas retóricas repetibles: ${rhetoric.join(", ")}.`,
    );
  }
  if (practical.length < 2) {
    warnings.push(
      "La pieza ofrece poca operatividad observable; considerar ruta, prueba, decisión, defensa o impugnación.",
    );
  }
  if (stage === "final" && pv !== null && pv <= 2) {
    warnings.push(
      "La interpretación vocal presenta poca variedad de momentos prosódicos.",
    );
  }
  if (stage === "final" && av !== null && av <= 1) {
    warnings.push(
      "La ejecución visual depende de una sola familia de proveedor/activo.",
    );
  }

  return {
    version: AUTHORSHIP_AUDIT_VERSION,
    stage,
    productionCode: piece.productionCode,
    status: blockers.length === 0 ? "passed" : "blocked",
    score,
    dimensions,
    maxima: {
      thesisSimilarity: thesisHit,
      narrationSimilarity: narrationHit,
      openingSimilarity: openingHit,
      closingSimilarity: closingHit,
      structuralSimilarity: structureHit,
    },
    diagnostics: {
      memoryCount: usableMemory.length,
      sourceSpecificTerms: terms,
      sourceSpecificTermCount: terms.length,
      narrationSpecificDensity: Number(density.toFixed(4)),
      genericRhetoricHits: rhetoric,
      roleFingerprint: roles,
      genericSceneRatio: Number(sceneGeneric.toFixed(4)),
      uniqueSceneTitleRatio: Number(sceneUnique.toFixed(4)),
      practicalSignals: practical,
      prosodyVariety: pv,
      assetProviderVariety: av,
    },
    blockers,
    warnings,
    rules: [
      "R1 Sustitución de tema",
      "R2 Tesis intercambiable",
      "R3 Descubrimiento insuficiente",
      "R4 Arquitectura repetida",
      "R5 Apertura repetida",
      "R6 Cierre intercambiable",
      "R7 Fallback visual genérico",
      "R8 Ausencia de utilidad",
      "R9 Ausencia de perspectiva",
      "R10 Duplicación intelectual",
    ],
  };
}
