export const AUTHORIAL_DIRECTOR_VERSION =
  "DIRECTOR-AUTORIA-JURIDICA-AUTOCORRECTIVO-V1";

export type AuthorialMode =
  | "ruta-operativa"
  | "prueba-decisiva"
  | "conflicto-adversarial"
  | "riesgo-preventivo"
  | "impugnacion-remedio"
  | "decision-bifurcada";

export type AuthorialPlan = {
  version: string;
  productionCode: string;
  attempt: number;
  mode: AuthorialMode;
  sourceBound: true;
  authorialThesis: string;
  counterThesis: string;
  discovery: string;
  utility: string;
  architecture: string;
  reasoningChain: string[];
  sceneLabels: string[];
  sourceFragments: string[];
  reasonToExist: string;
};

type FlexibleInput = Record<string, unknown> & {
  productionCode?: string;
  topic?: string;
  centralThesis?: string;
  problem?: string;
  conclusion?: string;
  hook?: string;
  closingIdea?: string;
  reasoningChain?: string[];
};

const MODES: AuthorialMode[] = [
  "ruta-operativa",
  "prueba-decisiva",
  "conflicto-adversarial",
  "riesgo-preventivo",
  "impugnacion-remedio",
  "decision-bifurcada",
];

const clean = (value: unknown): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const unique = (items: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items.map(clean).filter(Boolean)) {
    const key = item.toLocaleLowerCase("es");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
};

const has = (value: string, pattern: RegExp): boolean =>
  pattern.test(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
  );

const keywordScore = (value: string, patterns: RegExp[]): number =>
  patterns.reduce((score, pattern) => score + (has(value, pattern) ? 1 : 0), 0);

const modePatterns: Record<AuthorialMode, RegExp[]> = {
  "ruta-operativa": [
    /\bpaso\b/,
    /\btramite\b/,
    /\brequisit/,
    /\bproced/,
    /\bregistro\b/,
    /\bautoridad\b/,
  ],
  "prueba-decisiva": [
    /\bprueb/,
    /\bevidenc/,
    /\bdocument/,
    /\bacredit/,
    /\bdemostr/,
    /\bperit/,
  ],
  "conflicto-adversarial": [
    /\bcontraparte\b/,
    /\bdefensa\b/,
    /\boposic/,
    /\bexcepcion\b/,
    /\bdemandad/,
    /\bactor\b/,
  ],
  "riesgo-preventivo": [
    /\briesgo\b/,
    /\bplazo\b/,
    /\bcaducid/,
    /\bprescrip/,
    /\bnul/,
    /\bperder\b/,
  ],
  "impugnacion-remedio": [
    /\bimpugn/,
    /\brecurso\b/,
    /\bapel/,
    /\brevoc/,
    /\bjerarqu/,
    /\bamparo\b/,
  ],
  "decision-bifurcada": [
    /\bsi\b/,
    /\balternativ/,
    /\bdecision\b/,
    /\bdepende\b/,
    /\bopcion\b/,
    /\bescenario\b/,
  ],
};

const architectureByMode: Record<AuthorialMode, string> = {
  "ruta-operativa": "route-step-bifurcation-result",
  "prueba-decisiva": "evidence-question-demonstration-consequence",
  "conflicto-adversarial": "claim-attack-defense-countermove",
  "riesgo-preventivo": "risk-trigger-prevention-response",
  "impugnacion-remedio": "adverse-act-ground-remedy-outcome",
  "decision-bifurcada": "decision-branch-consequence-choice",
};

function fragments(input: FlexibleInput): string[] {
  return unique([
    clean(input.problem),
    clean(input.centralThesis),
    ...(Array.isArray(input.reasoningChain)
      ? input.reasoningChain.map(clean)
      : []),
    clean(input.conclusion),
    clean(input.closingIdea),
  ]).filter((item) => item.length >= 18);
}

function ranked(
  source: string[],
  mode: AuthorialMode,
  attempt: number,
): string[] {
  const scored = source.map((value, index) => ({
    value,
    index,
    score: keywordScore(value, modePatterns[mode]),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const shift = attempt % Math.max(1, source.length);
    const ai = (a.index - shift + source.length) % source.length;
    const bi = (b.index - shift + source.length) % source.length;
    return ai - bi;
  });

  return scored.map((item) => item.value);
}

function choose(values: string[], index: number, fallback: string): string {
  return values[index] || values[0] || fallback;
}

function labelFrom(value: string): string {
  const cleanValue = clean(value)
    .replace(/[.:;!?]+$/g, "")
    .trim();

  const words = cleanValue.split(" ").filter(Boolean);
  const shortened = words.slice(0, 8).join(" ");
  return shortened.length >= 12 ? shortened : cleanValue.slice(0, 72);
}

export function buildAuthorialPlan(
  input: FlexibleInput,
  attempt: number,
): AuthorialPlan {
  const productionCode = clean(input.productionCode);
  const topic = clean(input.topic) || "asunto jurídico";
  const source = fragments(input);

  if (!productionCode) {
    throw new Error("productionCode requerido para autoría.");
  }
  if (source.length < 3) {
    throw new Error(
      "La ficha no tiene suficiente contenido fuente para construir autoría sin inventar Derecho.",
    );
  }

  const safeAttempt =
    Number.isFinite(attempt) && attempt >= 0 ? Math.floor(attempt) : 0;

  const mode = MODES[safeAttempt % MODES.length];
  const ordered = ranked(source, mode, safeAttempt);

  const authorialThesis = choose(ordered, 0, clean(input.centralThesis));
  const counterThesis = choose(
    ordered.filter((item) => item !== authorialThesis),
    0,
    clean(input.problem),
  );
  const discovery = choose(
    ordered.filter(
      (item) => item !== authorialThesis && item !== counterThesis,
    ),
    0,
    clean(input.conclusion),
  );
  const utility = choose(
    ordered.filter(
      (item) =>
        item !== authorialThesis &&
        item !== counterThesis &&
        item !== discovery,
    ),
    0,
    clean(input.closingIdea) || clean(input.conclusion),
  );

  const originalThesis = clean(input.centralThesis);
  const reasoningChain = unique([
    authorialThesis,
    ...(originalThesis && originalThesis !== authorialThesis
      ? [originalThesis]
      : []),
    discovery,
    counterThesis,
    ...ordered,
  ]).slice(0, 7);

  const sceneLabels = unique(
    [authorialThesis, discovery, counterThesis, utility, ...ordered]
      .map(labelFrom)
      .filter(Boolean),
  ).slice(0, 8);

  return {
    version: AUTHORIAL_DIRECTOR_VERSION,
    productionCode,
    attempt: safeAttempt,
    mode,
    sourceBound: true,
    authorialThesis,
    counterThesis,
    discovery,
    utility,
    architecture: architectureByMode[mode],
    reasoningChain,
    sceneLabels,
    sourceFragments: source,
    reasonToExist:
      `La pieza ${productionCode} se concentra en "${labelFrom(authorialThesis)}" ` +
      `desde la perspectiva ${mode} del tema "${topic}", usando únicamente proposiciones ya presentes en la ficha jurídica revisada.`,
  };
}

export function applyAuthorialPresentation<T extends FlexibleInput>(
  input: T,
  plan: AuthorialPlan,
): T {
  if (!plan.sourceBound) {
    throw new Error("El Director de Autoría solo acepta planes sourceBound.");
  }

  if (
    clean(input.productionCode) &&
    clean(input.productionCode) !== plan.productionCode
  ) {
    throw new Error("El plan de autoría pertenece a otra producción.");
  }

  const originalThesis = clean(input.centralThesis);
  const sourceSet = new Set(
    fragments(input).map((item) => item.toLocaleLowerCase("es")),
  );

  for (const item of [
    plan.authorialThesis,
    plan.counterThesis,
    plan.discovery,
    plan.utility,
    ...plan.reasoningChain,
  ]) {
    const key = clean(item).toLocaleLowerCase("es");
    if (key && !sourceSet.has(key)) {
      throw new Error(
        "El plan de autoría contiene una proposición no existente en la ficha jurídica fuente.",
      );
    }
  }

  return {
    ...input,
    centralThesis: plan.authorialThesis,
    reasoningChain: unique([
      ...plan.reasoningChain,
      ...(originalThesis ? [originalThesis] : []),
    ]),
  };
}

type FlexibleScene = Record<string, unknown>;

export function applyAuthorialScenes<T extends FlexibleScene>(
  scenes: T[],
  plan: AuthorialPlan,
): T[] {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return scenes;
  }

  return scenes.map((scene, index) => {
    const label =
      plan.sceneLabels[index % Math.max(1, plan.sceneLabels.length)];

    if (!label) return scene;

    const currentTitle =
      typeof scene.title === "string" ? scene.title.trim() : "";

    if (!currentTitle) return scene;

    const generic =
      /^(diagn[oó]stico|estrategia|decisi[oó]n|problema|an[aá]lisis|conclusi[oó]n|contexto|soluci[oó]n|riesgo)$/i.test(
        currentTitle,
      );

    if (!generic) return scene;

    return {
      ...scene,
      title: label,
    } as T;
  });
}
