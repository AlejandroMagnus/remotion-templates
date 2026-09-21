import type { PexelsResolvedAsset } from "./providers/pexelsProvider";

/**
 * V3.15-D2 — VISUAL CONTEXT QA DIRECTOR
 *
 * Responsabilidad:
 * Evaluar coherencia contextual de un asset visual antes de aprobarlo
 * para una producción.
 *
 * Principios:
 * - La estética judicial internacional/estadounidense NO se rechaza.
 * - Una bandera extranjera identificable se penaliza o rechaza cuando
 *   contradice el contexto de una producción boliviana.
 * - Las banderas extranjeras pueden ser válidas cuando el contenido
 *   es internacional, comparado, arbitral o transnacional.
 * - Bolivia recibe preferencia cuando es contextualmente pertinente,
 *   pero no se fuerza artificialmente.
 * - Un recurso neutral es perfectamente válido.
 */

export type VisualContextScene = {
  ruleId?: string;
  concept?: string;
  narrationContext?: string;
  visualIntent?: string;
  generationPrompt?: string;
};

export type VisualContextQAResult = {
  approved: boolean;

  scoreAdjustment: number;

  classification:
    | "bolivia"
    | "latin-america"
    | "neutral"
    | "international-valid"
    | "foreign-flag-conflict"
    | "context-risk";

  internationalContext: boolean;

  foreignFlagDetected: boolean;
  boliviaDetected: boolean;
  latinContextDetected: boolean;

  positiveSignals: string[];
  warningSignals: string[];
  rejectionReasons: string[];

  directorDecision:
    | "approve"
    | "approve-with-warning"
    | "penalize"
    | "reject";
};

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Señales que permiten contexto internacional.
 *
 * La presencia de estas señales NO obliga a mostrar una bandera.
 * Simplemente evita rechazar automáticamente un recurso extranjero
 * cuando existe una justificación narrativa real.
 */
const INTERNATIONAL_CONTEXT_TERMS = [
  "arbitraje internacional",
  "international arbitration",
  "arbitraje comercial internacional",
  "international commercial arbitration",

  "comercio internacional",
  "international trade",
  "comercio exterior",
  "foreign trade",

  "inversion extranjera",
  "foreign investment",
  "inversion internacional",
  "international investment",

  "derecho internacional",
  "international law",

  "derecho comparado",
  "comparative law",

  "tratado internacional",
  "international treaty",

  "controversia internacional",
  "international dispute",

  "controversia transnacional",
  "transnational dispute",

  "operacion internacional",
  "international transaction",

  "contrato internacional",
  "international contract",

  "empresa extranjera",
  "foreign company",

  "jurisdiccion extranjera",
  "foreign jurisdiction",

  "multiples jurisdicciones",
  "multiple jurisdictions",

  "transfronterizo",
  "cross border",
  "cross border transaction",

  "estado extranjero",
  "foreign state",

  "corte internacional",
  "international court",

  "tribunal internacional",
  "international tribunal",

  "ciadi",
  "icsid",

  "corte interamericana",
  "inter american court",

  "derechos humanos internacional",
  "international human rights",
];

/**
 * Señales explícitas de bandera extranjera.
 *
 * IMPORTANTE:
 * Esto trabaja con metadata textual disponible.
 * No afirmamos que detecte visualmente todas las banderas.
 */
const FOREIGN_FLAG_TERMS = [
  "american flag",
  "united states flag",
  "us flag",
  "u s flag",
  "stars and stripes",

  "argentina flag",
  "argentinian flag",

  "brazil flag",
  "brazilian flag",

  "chile flag",
  "chilean flag",

  "peru flag",
  "peruvian flag",

  "paraguay flag",
  "paraguayan flag",

  "uruguay flag",
  "uruguayan flag",

  "mexico flag",
  "mexican flag",

  "colombia flag",
  "colombian flag",

  "ecuador flag",
  "ecuadorian flag",

  "venezuela flag",
  "venezuelan flag",

  "spain flag",
  "spanish flag",

  "france flag",
  "french flag",

  "germany flag",
  "german flag",

  "uk flag",
  "british flag",
  "united kingdom flag",

  "china flag",
  "chinese flag",

  "russia flag",
  "russian flag",

  "canada flag",
  "canadian flag",

  "foreign flag",
];

/**
 * Bolivia.
 */
const BOLIVIA_TERMS = [
  "bolivia",
  "bolivian",
  "boliviano",
  "boliviana",
  "bolivian flag",
  "bandera boliviana",
  "la paz bolivia",
  "cochabamba bolivia",
  "santa cruz bolivia",
  "sucre bolivia",
];

/**
 * Contexto latinoamericano general.
 */
const LATIN_CONTEXT_TERMS = [
  "latin america",
  "latin american",
  "latinoamerica",
  "latinoamericano",
  "latinoamericana",
  "south america",
  "south american",
  "sudamerica",
  "sudamericano",
  "sudamericana",
];

/**
 * Contextos que son internacionales o extranjeros,
 * pero que NO constituyen por sí mismos un defecto.
 *
 * Ejemplo:
 * - courtroom
 * - federal court
 * - american lawyer
 * - international office
 *
 * Una estética extranjera puede ser útil para representar conceptos
 * universales. No debe confundirse con una bandera contradictoria.
 */
const ALLOWED_INTERNATIONAL_AESTHETIC_TERMS = [
  "courtroom",
  "court",
  "judge",
  "lawyer",
  "attorney",
  "hearing",
  "justice",
  "tribunal",
  "legal office",
  "law office",

  "american court",
  "federal court",
  "american lawyer",
  "american attorney",

  "international office",
  "international business",
  "international lawyer",
  "international meeting",
];

/**
 * Devuelve coincidencias únicas.
 */
function findHits(
  haystack: string,
  terms: string[],
): string[] {
  return [
    ...new Set(
      terms.filter((term) =>
        haystack.includes(normalize(term)),
      ),
    ),
  ];
}

/**
 * Construye el contexto semántico de la escena.
 */
function sceneContext(
  scene: VisualContextScene,
): string {
  return normalize(
    [
      scene.ruleId ?? "",
      scene.concept ?? "",
      scene.narrationContext ?? "",
      scene.visualIntent ?? "",
      scene.generationPrompt ?? "",
    ].join(" "),
  );
}

/**
 * Metadata disponible del recurso.
 *
 * No utilizamos la query interna como prueba de que algo aparece
 * realmente en pantalla.
 */
function assetContext(
  asset: PexelsResolvedAsset,
): string {
  return normalize(
    [
      asset.altText ?? "",
      asset.creator ?? "",
    ].join(" "),
  );
}

export function evaluateVisualContext(
  scene: VisualContextScene,
  asset: PexelsResolvedAsset,
): VisualContextQAResult {
  const sceneText = sceneContext(scene);
  const assetText = assetContext(asset);

  const internationalHits = findHits(
    sceneText,
    INTERNATIONAL_CONTEXT_TERMS,
  );

  const foreignFlagHits = findHits(
    assetText,
    FOREIGN_FLAG_TERMS,
  );

  const boliviaHits = findHits(
    assetText,
    BOLIVIA_TERMS,
  );

  const latinHits = findHits(
    assetText,
    LATIN_CONTEXT_TERMS,
  );

  const internationalAestheticHits = findHits(
    assetText,
    ALLOWED_INTERNATIONAL_AESTHETIC_TERMS,
  );

  const internationalContext =
    internationalHits.length > 0;

  const foreignFlagDetected =
    foreignFlagHits.length > 0;

  const boliviaDetected =
    boliviaHits.length > 0;

  const latinContextDetected =
    latinHits.length > 0;

  const positiveSignals: string[] = [];
  const warningSignals: string[] = [];
  const rejectionReasons: string[] = [];

  let scoreAdjustment = 0;

  /*
   * PRIORIDAD 1:
   * Bolivia explícita y pertinente recibe preferencia.
   */
  if (boliviaDetected) {
    scoreAdjustment += 12;

    positiveSignals.push(
      `bolivia-context:${boliviaHits.join(",")}`,
    );
  }

  /*
   * PRIORIDAD 2:
   * Latinoamérica recibe preferencia moderada.
   */
  if (
    latinContextDetected &&
    !boliviaDetected
  ) {
    scoreAdjustment += 5;

    positiveSignals.push(
      `latin-context:${latinHits.join(",")}`,
    );
  }

  /*
   * PRIORIDAD 3:
   * La estética internacional NO es un defecto.
   */
  if (
    internationalAestheticHits.length > 0
  ) {
    positiveSignals.push(
      `international-aesthetic-allowed:${internationalAestheticHits.join(
        ",",
      )}`,
    );
  }

  /*
   * PRIORIDAD 4:
   * Bandera extranjera + contexto internacional:
   * permitida.
   *
   * No recibe una bonificación automática porque su pertinencia
   * depende de la escena, pero tampoco se penaliza.
   */
  if (
    foreignFlagDetected &&
    internationalContext
  ) {
    positiveSignals.push(
      `foreign-flag-contextually-valid:${foreignFlagHits.join(
        ",",
      )}`,
    );

    positiveSignals.push(
      `international-context:${internationalHits.join(
        ",",
      )}`,
    );

    return {
      approved: true,

      scoreAdjustment,

      classification:
        "international-valid",

      internationalContext,

      foreignFlagDetected,

      boliviaDetected,

      latinContextDetected,

      positiveSignals,

      warningSignals,

      rejectionReasons,

      directorDecision:
        "approve",
    };
  }

  /*
   * PRIORIDAD 5:
   * Bandera extranjera sin justificación narrativa:
   * rechazo.
   *
   * No rechazamos el tribunal, abogado, edificio o estética.
   * Rechazamos específicamente la bandera contradictoria.
   */
  if (
    foreignFlagDetected &&
    !internationalContext
  ) {
    scoreAdjustment -= 100;

    rejectionReasons.push(
      `foreign-flag-without-context:${foreignFlagHits.join(
        ",",
      )}`,
    );

    return {
      approved: false,

      scoreAdjustment,

      classification:
        "foreign-flag-conflict",

      internationalContext,

      foreignFlagDetected,

      boliviaDetected,

      latinContextDetected,

      positiveSignals,

      warningSignals,

      rejectionReasons,

      directorDecision:
        "reject",
    };
  }

  /*
   * Asset neutral:
   * perfectamente válido.
   */
  if (
    !boliviaDetected &&
    !latinContextDetected
  ) {
    positiveSignals.push(
      "neutral-visual-context",
    );
  }

  /*
   * Contexto internacional narrativo sin bandera:
   * también es válido.
   */
  if (internationalContext) {
    positiveSignals.push(
      `international-context:${internationalHits.join(
        ",",
      )}`,
    );
  }

  let classification:
    VisualContextQAResult["classification"];

  if (boliviaDetected) {
    classification = "bolivia";
  } else if (latinContextDetected) {
    classification = "latin-america";
  } else if (internationalContext) {
    classification =
      "international-valid";
  } else {
    classification = "neutral";
  }

  return {
    approved: true,

    scoreAdjustment,

    classification,

    internationalContext,

    foreignFlagDetected,

    boliviaDetected,

    latinContextDetected,

    positiveSignals,

    warningSignals,

    rejectionReasons,

    directorDecision:
      warningSignals.length > 0
        ? "approve-with-warning"
        : "approve",
  };
               }
