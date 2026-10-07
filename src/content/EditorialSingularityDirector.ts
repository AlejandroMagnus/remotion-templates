import type { SilecKnowledgeInput } from "./SilecContentAdapter";
import type { NarrativeArchitecture } from "../strategy/CreativeDiversityDirector";

export const EDITORIAL_SINGULARITY_VERSION = "V2-CRITERIO-Y-NOVEDAD-REAL";

export type EditorialLens =
  | "ruta-operativa"
  | "prueba-decisiva"
  | "riesgo-prevencion"
  | "conflicto-adversarial"
  | "decision-consecuencia"
  | "error-contraintuitivo"
  | "criterio-doctrinal";

export type NarrativeGenome =
  | "ruta-paso-a-paso"
  | "expediente-en-marcha"
  | "decision-bifurcada"
  | "checklist-forense"
  | "prueba-y-fallo"
  | "caso-y-quiebre"
  | "pregunta-decisiva"
  | "diagnostico-preventivo"
  | "error-y-correccion"
  | "resultado-inverso"
  | "duelo-adversarial"
  | "regla-y-limite";

type SourceCandidate = {
  source:
    | "problem"
    | "centralThesis"
    | "conclusion"
    | `reasoningChain[${number}]`;
  text: string;
  index: number;
};

export type EditorialSingularityPlan = {
  version: typeof EDITORIAL_SINGULARITY_VERSION;
  productionCode: string;
  attempt: number;
  lens: EditorialLens;
  genome: NarrativeGenome;
  criterionReason: string;
  dominantClaim: SourceCandidate;
  opening: SourceCandidate;
  effectiveArchitecture: NarrativeArchitecture;
  reasoningOrder: number[];
  genericMethodologyRejected: string[];
  publicNarrativeSignature: string;
  sourceIntegrity: {
    legalClaimsInvented: false;
    openingComesFromSource: true;
    dominantClaimComesFromSource: true;
    substantiveReasoningPreserved: true;
  };
};

const clean = (value: string | null | undefined) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const normalize = (value: string) =>
  clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const unique = (values: string[]) => [
  ...new Set(values.map(clean).filter(Boolean)),
];

const ensureSentence = (value: string) => {
  const text = clean(value);
  if (!text) return "";
  return /[.!?…]$/.test(text) ? text : `${text}.`;
};

const countMatches = (text: string, patterns: RegExp[]) =>
  patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);

const stableNumber = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export function isGenericMethodologicalFormula(value: string): boolean {
  const text = normalize(value);
  const families = [
    /\bhech(?:o|os)\b/,
    /\bprueb(?:a|as)\b|\bevidenc/,
    /\bnorm(?:a|as)\b|\bregla(?:s)?\b/,
    /\bjurisprud|\bprecedent/,
    /\bestrateg|\bdecision/,
  ];
  const hits = countMatches(text, families);
  const connector = /\bconect|\bintegr|\banaliz|\bsecuencia|\bcadena/.test(
    text,
  );
  const ordered = /hech(?:o|os).{0,90}prueb(?:a|as).{0,90}norm(?:a|as)/.test(
    text,
  );
  return ordered || (hits >= 4 && connector);
}

const LENS_PATTERNS: Record<EditorialLens, RegExp[]> = {
  "ruta-operativa": [
    /\btramite|\bprocedim|\bpaso|\betapa|\binscri|\bregistr|\bsanean|\bsolicit|\bpresent|\bplazo|\bcompetenc|\bautoridad/,
    /\bprimero|\bdespues|\bluego|\bcontinu|\bsiguiente|\bsubsan|\brequisit/,
  ],
  "prueba-decisiva": [
    /\bprueb|\bevidenc|\bacredit|\bdemostr|\bperici|\btestig|\bdocument|\bcarga probatoria|\bvaloracion/,
    /\bindicio|\bconviccion|\bprobar|\bcorrobor/,
  ],
  "riesgo-prevencion": [
    /\briesg|\bpreven|\bperder|\bnulidad|\bcaducid|\bprescrip|\bpreclusion|\bvencim|\bobserv|\bincumpl/,
    /\berror|\bdebilidad|\bcontingenc|\bexponer|\bsancion/,
  ],
  "conflicto-adversarial": [
    /\bcontraparte|\bdefensa|\bdemandad|\bactor|\boposicion|\bobjec|\bexcepcion|\bimpugn|\brecurso|\bataque|\bcontrovert/,
    /\blitig|\baudiencia|\bpretension|\bresponder|\bneutraliz/,
  ],
  "decision-consecuencia": [
    /\bdecision|\balternativa|\bopcion|\bconsecuenc|\bresultado|\belegir|\bconviene|\bdefine|\bcambia el escenario/,
    /\bsi .* entonces|\bdepende|\bbifurc/,
  ],
  "error-contraintuitivo": [
    /\berror|\bno basta|\bno significa|\bno equivale|\bcreer que|\baunque|\bparece|\bconfundir|\bmito/,
    /\bpero|\bsin embargo|\bcontrario|\bdiferencia entre/,
  ],
  "criterio-doctrinal": [
    /\bcriterio|\bprincipio|\bconcept|\bnaturaleza|\belemento|\brequisito|\bregla|\binterpret|\bdoctrin/,
    /\bjuridic|\bconstitucional|\bjurisprud/,
  ],
};

const LENS_ARCHITECTURES: Record<EditorialLens, NarrativeArchitecture[]> = {
  "ruta-operativa": [
    "chronological-reconstruction",
    "system-map",
    "decision-consequence",
  ],
  "prueba-decisiva": [
    "context-evidence-meaning",
    "question-demonstration-conclusion",
  ],
  "riesgo-prevencion": [
    "decision-consequence",
    "case-tension-resolution",
    "before-after",
  ],
  "conflicto-adversarial": ["case-tension-resolution", "decision-consequence"],
  "decision-consecuencia": [
    "decision-consequence",
    "before-after",
    "case-tension-resolution",
  ],
  "error-contraintuitivo": [
    "before-after",
    "question-demonstration-conclusion",
  ],
  "criterio-doctrinal": [
    "question-demonstration-conclusion",
    "system-map",
    "problem-analysis-solution",
  ],
};

const GENOMES: Record<EditorialLens, NarrativeGenome[]> = {
  "ruta-operativa": [
    "ruta-paso-a-paso",
    "expediente-en-marcha",
    "decision-bifurcada",
    "checklist-forense",
  ],
  "prueba-decisiva": ["prueba-y-fallo", "caso-y-quiebre", "pregunta-decisiva"],
  "riesgo-prevencion": [
    "diagnostico-preventivo",
    "error-y-correccion",
    "resultado-inverso",
  ],
  "conflicto-adversarial": [
    "duelo-adversarial",
    "caso-y-quiebre",
    "decision-bifurcada",
  ],
  "decision-consecuencia": [
    "decision-bifurcada",
    "resultado-inverso",
    "caso-y-quiebre",
  ],
  "error-contraintuitivo": [
    "error-y-correccion",
    "resultado-inverso",
    "pregunta-decisiva",
  ],
  "criterio-doctrinal": [
    "pregunta-decisiva",
    "regla-y-limite",
    "caso-y-quiebre",
  ],
};

const CRITERION_REASON: Record<EditorialLens, string> = {
  "ruta-operativa":
    "El contenido exige mostrar una secuencia de actuación y sus puntos de paso.",
  "prueba-decisiva":
    "El valor del tema depende de qué puede demostrarse y con qué soporte.",
  "riesgo-prevencion":
    "La utilidad principal está en anticipar una pérdida, defecto o contingencia.",
  "conflicto-adversarial":
    "El tema se entiende mejor desde posiciones contrapuestas, respuesta e impugnación.",
  "decision-consecuencia":
    "La pieza gira alrededor de una elección y de lo que cambia después de tomarla.",
  "error-contraintuitivo":
    "La pieza debe corregir una intuición o error frecuente antes de desarrollar la regla.",
  "criterio-doctrinal":
    "El tema pide una distinción o criterio jurídico rector antes que una ruta o conflicto.",
};

const GENOME_SCENE_TITLES: Record<NarrativeGenome, string[]> = {
  "ruta-paso-a-paso": [
    "Punto de partida",
    "Primer paso",
    "Segundo paso",
    "La bifurcación",
    "Control antes de avanzar",
    "Resultado",
  ],
  "expediente-en-marcha": [
    "Así empieza el expediente",
    "Primera actuación",
    "Lo que llega después",
    "Dónde puede trabarse",
    "Cómo continúa",
    "Cierre del recorrido",
  ],
  "decision-bifurcada": [
    "La decisión crítica",
    "Camino A",
    "Camino B",
    "Qué cambia",
    "Criterio para elegir",
    "Consecuencia",
  ],
  "checklist-forense": [
    "Antes de actuar",
    "Primer control",
    "Segundo control",
    "Tercer control",
    "Punto de riesgo",
    "Verificación final",
  ],
  "prueba-y-fallo": [
    "Qué debe sostenerse",
    "La prueba que pesa",
    "Lo que no basta",
    "Dónde se discute",
    "Cómo se fortalece",
    "Conclusión probatoria",
  ],
  "caso-y-quiebre": [
    "El caso",
    "El primer dato",
    "El punto de quiebre",
    "Lo que cambia",
    "La decisión jurídica",
    "Resultado",
  ],
  "pregunta-decisiva": [
    "La pregunta",
    "Primera respuesta",
    "La distinción",
    "La consecuencia",
    "El criterio",
    "Respuesta final",
  ],
  "diagnostico-preventivo": [
    "La señal de alerta",
    "Dónde está el riesgo",
    "Qué lo agrava",
    "Cómo contenerlo",
    "La decisión preventiva",
    "Resultado protegido",
  ],
  "error-y-correccion": [
    "La intuición",
    "Dónde falla",
    "La corrección",
    "Qué cambia",
    "Cómo actuar",
    "La regla útil",
  ],
  "resultado-inverso": [
    "El resultado",
    "Cómo se llega ahí",
    "El punto decisivo",
    "Lo que suele omitirse",
    "La explicación",
    "Conclusión",
  ],
  "duelo-adversarial": [
    "La disputa",
    "La posición contraria",
    "El ataque",
    "La respuesta",
    "La contramedida",
    "Qué decide el conflicto",
  ],
  "regla-y-limite": [
    "El criterio rector",
    "La regla",
    "Su límite",
    "Dónde se aplica",
    "Dónde deja de servir",
    "Conclusión",
  ],
};

function sourceCandidates(input: SilecKnowledgeInput): SourceCandidate[] {
  return [
    { source: "problem" as const, text: clean(input.problem), index: -3 },
    {
      source: "centralThesis" as const,
      text: clean(input.centralThesis),
      index: -2,
    },
    ...input.reasoningChain.map((text, index) => ({
      source: `reasoningChain[${index}]` as const,
      text: clean(text),
      index,
    })),
    { source: "conclusion" as const, text: clean(input.conclusion), index: -1 },
  ].filter((candidate) => Boolean(candidate.text));
}

function scoreLens(input: SilecKnowledgeInput, lens: EditorialLens): number {
  const fields = [
    input.topic,
    input.problem,
    input.centralThesis,
    ...input.reasoningChain,
    input.conclusion,
  ].map(normalize);

  let score = 0;
  for (const field of fields)
    score += countMatches(field, LENS_PATTERNS[lens]) * 3;
  if (lens === "ruta-operativa" && input.reasoningChain.length >= 3) score += 2;
  if (
    lens === "conflicto-adversarial" &&
    /contraparte|defensa|impugn|recurso/i.test(fields.join(" "))
  )
    score += 3;
  if (
    lens === "prueba-decisiva" &&
    /prueb|acredit|demostr/i.test(fields.join(" "))
  )
    score += 3;
  return score;
}

function rankedLenses(
  input: SilecKnowledgeInput,
): Array<{ lens: EditorialLens; score: number }> {
  return (Object.keys(LENS_PATTERNS) as EditorialLens[])
    .map((lens) => ({ lens, score: scoreLens(input, lens) }))
    .sort((a, b) => b.score - a.score || a.lens.localeCompare(b.lens));
}

function chooseLens(
  input: SilecKnowledgeInput,
  attempt: number,
): EditorialLens {
  const ranked = rankedLenses(input);
  if ((ranked[0]?.score ?? 0) <= 2) return "criterio-doctrinal";
  const meaningful = ranked.filter(
    (item) => item.score >= Math.max(3, (ranked[0]?.score ?? 0) * 0.55),
  );
  const pool = meaningful.length ? meaningful.slice(0, 3) : ranked.slice(0, 1);
  return pool[Math.abs(attempt) % pool.length].lens;
}

function scoreCandidate(
  candidate: SourceCandidate,
  lens: EditorialLens,
): number {
  const text = normalize(candidate.text);
  let score = countMatches(text, LENS_PATTERNS[lens]) * 6;
  if (isGenericMethodologicalFormula(candidate.text)) score -= 100;
  if (candidate.source === "centralThesis") score += 4;
  if (candidate.source === "conclusion") score += 2;
  if (text.length >= 55 && text.length <= 260) score += 3;
  if (
    /\b(?:debe|puede|impide|exige|define|determina|cambia|protege|pierde|acredita|demuestra)\b/.test(
      text,
    )
  )
    score += 2;
  if (/\b(?:siempre|nunca|garantiza|infalible)\b/.test(text)) score -= 2;
  return score;
}

function rankedCandidates(
  candidates: SourceCandidate[],
  lens: EditorialLens,
): SourceCandidate[] {
  const acceptable = candidates.filter(
    (candidate) => !isGenericMethodologicalFormula(candidate.text),
  );
  const pool = acceptable.length ? acceptable : candidates;
  return [...pool].sort(
    (a, b) =>
      scoreCandidate(b, lens) - scoreCandidate(a, lens) || a.index - b.index,
  );
}

function chooseCandidate(
  candidates: SourceCandidate[],
  lens: EditorialLens,
  attempt: number,
  offset = 0,
): SourceCandidate {
  const ranked = rankedCandidates(candidates, lens);
  return (
    ranked[
      (Math.abs(attempt) + offset) % Math.min(Math.max(ranked.length, 1), 4)
    ] ?? ranked[0]
  );
}

function chooseArchitecture(
  input: SilecKnowledgeInput,
  lens: EditorialLens,
  current: NarrativeArchitecture,
  attempt: number,
): NarrativeArchitecture {
  const supported = LENS_ARCHITECTURES[lens];
  if (attempt === 0 && supported.includes(current)) return current;
  return supported[
    (stableNumber(`${input.productionCode}:${lens}`) + Math.abs(attempt)) %
      supported.length
  ];
}

function chooseGenome(
  input: SilecKnowledgeInput,
  lens: EditorialLens,
  attempt: number,
): NarrativeGenome {
  const genomes = GENOMES[lens];
  return genomes[
    (stableNumber(`${input.productionCode}:${input.topic}:${lens}`) +
      Math.abs(attempt)) %
      genomes.length
  ];
}

function reasoningOrder(
  input: SilecKnowledgeInput,
  lens: EditorialLens,
  genome: NarrativeGenome,
  attempt: number,
): number[] {
  const ranked = input.reasoningChain
    .map((text, index) => ({
      index,
      score: scoreCandidate(
        { source: `reasoningChain[${index}]`, text, index },
        lens,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.index);

  if (
    genome === "ruta-paso-a-paso" ||
    genome === "expediente-en-marcha" ||
    genome === "checklist-forense"
  ) {
    return input.reasoningChain.map((_, index) => index);
  }
  if (genome === "resultado-inverso") return [...ranked].reverse();
  if (genome === "duelo-adversarial") return ranked;
  if (ranked.length <= 1) return ranked;
  const shift = Math.abs(attempt) % ranked.length;
  return [...ranked.slice(shift), ...ranked.slice(0, shift)];
}

export function buildEditorialSingularityPlan(
  input: SilecKnowledgeInput,
  currentArchitecture: NarrativeArchitecture,
): EditorialSingularityPlan {
  const attempt = Math.max(
    0,
    Number.parseInt(process.env.SINGULARITY_ATTEMPT ?? "0", 10) || 0,
  );
  const candidates = sourceCandidates(input);
  if (!candidates.length)
    throw new Error(
      "No existen afirmaciones fuente para construir criterio editorial.",
    );

  const lens = chooseLens(input, attempt);
  const genome = chooseGenome(input, lens, attempt);
  const dominantClaim = chooseCandidate(candidates, lens, attempt, 0);
  let opening = chooseCandidate(candidates, lens, attempt, 1);
  if (opening.text === dominantClaim.text && candidates.length > 1) {
    opening = chooseCandidate(candidates, lens, attempt, 2);
  }

  const genericMethodologyRejected = candidates
    .filter((candidate) => isGenericMethodologicalFormula(candidate.text))
    .map((candidate) => candidate.text);

  const order = reasoningOrder(input, lens, genome, attempt);
  const effectiveArchitecture = chooseArchitecture(
    input,
    lens,
    currentArchitecture,
    attempt,
  );
  const publicNarrativeSignature = [
    lens,
    genome,
    effectiveArchitecture,
    opening.source,
    dominantClaim.source,
    order.join("-"),
  ].join(":");

  return {
    version: EDITORIAL_SINGULARITY_VERSION,
    productionCode: input.productionCode,
    attempt,
    lens,
    genome,
    criterionReason: CRITERION_REASON[lens],
    dominantClaim,
    opening,
    effectiveArchitecture,
    reasoningOrder: order,
    genericMethodologyRejected,
    publicNarrativeSignature,
    sourceIntegrity: {
      legalClaimsInvented: false,
      openingComesFromSource: true,
      dominantClaimComesFromSource: true,
      substantiveReasoningPreserved: true,
    },
  };
}

export function applyEditorialSingularity(
  input: SilecKnowledgeInput,
  plan: EditorialSingularityPlan,
): SilecKnowledgeInput {
  if (plan.productionCode !== input.productionCode) {
    throw new Error("El plan de singularidad corresponde a otra producción.");
  }

  const reordered = plan.reasoningOrder
    .map((index) => input.reasoningChain[index])
    .filter(
      (value): value is string =>
        typeof value === "string" && Boolean(clean(value)),
    )
    .filter((value) => !isGenericMethodologicalFormula(value));

  const reasoningChain = unique([
    ...reordered,
    input.centralThesis === plan.dominantClaim.text ||
    isGenericMethodologicalFormula(input.centralThesis)
      ? ""
      : input.centralThesis,
  ]);

  return {
    ...input,
    hook: plan.opening.text,
    centralThesis: plan.dominantClaim.text,
    reasoningChain,
  };
}

function appendDistinct(target: string[], value: string) {
  const text = ensureSentence(value);
  if (!text) return;
  const normalized = normalize(text);
  if (!target.some((item) => normalize(item) === normalized)) target.push(text);
}

function stripSequencer(value: string): string {
  return clean(value).replace(
    /^(?:primero|primera(?:mente)?|despu[eé]s|luego|a continuaci[oó]n|finalmente)\s*[:,.-]?\s*/i,
    "",
  );
}

function topicQuestion(input: SilecKnowledgeInput): string {
  const topic = clean(input.topic);
  if (!topic)
    return "¿Cuál es el punto jurídico que realmente cambia este asunto?";
  if (/[?？]$/.test(topic) || topic.startsWith("¿"))
    return ensureSentence(topic);
  return `¿Qué cambia realmente cuando el problema es ${topic.toLowerCase()}?`;
}

export function composeNarrationWithEditorialGenome(
  input: SilecKnowledgeInput,
  plan: EditorialSingularityPlan,
): string {
  const represented = new Set(
    [input.hook, input.centralThesis, input.problem, input.conclusion]
      .map((value) => normalize(clean(value)))
      .filter(Boolean),
  );
  const reasoning = input.reasoningChain
    .map(clean)
    .filter(Boolean)
    .filter((value) => !isGenericMethodologicalFormula(value))
    .filter((value) => !represented.has(normalize(value)));
  const lines: string[] = [];
  const add = (value: string) => appendDistinct(lines, value);
  const indexed = (index: number) => reasoning[index] ?? "";
  const rest = (start = 0) => reasoning.slice(start).forEach(add);

  switch (plan.genome) {
    case "ruta-paso-a-paso":
      add(input.hook);
      reasoning.forEach((item, index) =>
        add(
          `${index === 0 ? "Primero" : index === 1 ? "Después" : "A continuación"}: ${stripSequencer(item)}`,
        ),
      );
      add(input.centralThesis);
      add(input.conclusion);
      break;

    case "expediente-en-marcha":
      add(input.problem);
      add(input.hook);
      if (indexed(0))
        add(
          `La primera actuación relevante es esta: ${stripSequencer(indexed(0))}`,
        );
      if (indexed(1))
        add(
          `El expediente cambia en el siguiente punto: ${stripSequencer(indexed(1))}`,
        );
      rest(2);
      add(input.centralThesis);
      add(input.conclusion);
      break;

    case "decision-bifurcada":
      add(input.hook);
      add(input.centralThesis);
      if (indexed(0))
        add(`Una posibilidad parte de aquí: ${stripSequencer(indexed(0))}`);
      if (indexed(1))
        add(
          `La alternativa aparece cuando ocurre esto: ${stripSequencer(indexed(1))}`,
        );
      rest(2);
      add(input.conclusion);
      break;

    case "checklist-forense":
      add(input.hook);
      if (indexed(0)) add(`Primer control: ${stripSequencer(indexed(0))}`);
      if (indexed(1)) add(`Segundo control: ${stripSequencer(indexed(1))}`);
      if (indexed(2)) add(`Tercer control: ${stripSequencer(indexed(2))}`);
      rest(3);
      add(input.centralThesis);
      add(input.conclusion);
      break;

    case "prueba-y-fallo":
      add(input.hook);
      if (indexed(0))
        add(`La primera cuestión probatoria es esta: ${indexed(0)}`);
      if (indexed(1))
        add(`Lo que puede debilitar la posición aparece aquí: ${indexed(1)}`);
      rest(2);
      add(input.centralThesis);
      add(input.conclusion);
      break;

    case "caso-y-quiebre":
      add(input.problem);
      add(input.hook);
      if (indexed(0)) add(indexed(0));
      if (indexed(1)) add(`El punto de quiebre aparece después: ${indexed(1)}`);
      rest(2);
      add(input.centralThesis);
      add(input.conclusion);
      break;

    case "pregunta-decisiva":
      add(topicQuestion(input));
      add(input.hook);
      add(input.centralThesis);
      rest(0);
      add(input.conclusion);
      break;

    case "diagnostico-preventivo":
      add(input.problem);
      if (indexed(0)) add(`La primera señal de alerta es esta: ${indexed(0)}`);
      add(input.hook);
      rest(1);
      add(input.centralThesis);
      add(input.conclusion);
      break;

    case "error-y-correccion":
      add(input.hook);
      add(input.problem);
      if (indexed(0)) add(`La corrección empieza aquí: ${indexed(0)}`);
      rest(1);
      add(input.centralThesis);
      add(input.conclusion);
      break;

    case "resultado-inverso":
      add(input.conclusion);
      add(
        `Para entender cómo se llega a ese resultado, hay que volver al problema concreto.`,
      );
      add(input.problem);
      rest(0);
      add(input.centralThesis);
      break;

    case "duelo-adversarial":
      add(input.problem);
      add(input.hook);
      if (indexed(0))
        add(`Desde una posición, el conflicto se plantea así: ${indexed(0)}`);
      if (indexed(1))
        add(`La respuesta puede desplazarse hacia este punto: ${indexed(1)}`);
      rest(2);
      add(input.centralThesis);
      add(input.conclusion);
      break;

    case "regla-y-limite":
      add(input.centralThesis);
      add(input.hook);
      if (indexed(0)) add(indexed(0));
      if (indexed(1)) add(`El límite aparece aquí: ${indexed(1)}`);
      rest(2);
      add(input.conclusion);
      break;
  }

  add(input.closingIdea);
  add(input.cta);

  const narration = lines.join(" ").replace(/\s+/g, " ").trim();
  if (!narration)
    throw new Error("Narración vacía tras construir el genoma editorial.");
  return narration;
}

export function retitleScenesForSingularity<
  T extends { id: string; content: unknown },
>(scenes: T[], plan: EditorialSingularityPlan): T[] {
  const labels = GENOME_SCENE_TITLES[plan.genome];
  let cursor = 0;
  return scenes.map((scene, index) => {
    if (
      scene.id === "cta" ||
      index === 0 ||
      !scene.content ||
      typeof scene.content !== "object" ||
      !("title" in scene.content) ||
      typeof scene.content.title !== "string"
    ) {
      return scene;
    }
    const title = labels[Math.min(cursor, labels.length - 1)];
    cursor += 1;
    return {
      ...scene,
      content: {
        ...scene.content,
        title,
      },
    } as T;
  });
}
