import type {PexelsResolvedAsset} from "./providers/pexelsProvider";

import {
  getSilecContextTerms,
  getSilecVisualProfile,
} from "./silecVisualProfiles";

import {
  getHighTicketContextTerms,
  getHighTicketVisualProfile,
} from "./highTicketVisualProfiles";

export type DirectorScene = {
  ruleId: string;
  concept?: string;
  narrationContext?: string;
  visualIntent?: string;
  generationPrompt?: string;
};

type VisualProfile = {
  queries: string[];
  positive: string[];
  negative?: string[];
};

const PROFILES: Record<string, VisualProfile> = {
  autoridad: {
    queries: [
      "latin american public official reviewing documents office",
      "south american government professional documents",
      "public administration professional reviewing case file",
      "latin american professional government office",
      "official reviewing documents neutral office",
      "professional public administration meeting documents",
    ],
    positive: [
      "official",
      "government",
      "professional",
      "document",
      "office",
      "desk",
      "review",
      "paper",
      "latin",
      "south america",
    ],
    negative: [
      "police",
      "soldier",
      "protest",
      "celebration",
    ],
  },

  expediente: {
    queries: [
      "legal case file documents desk latin america",
      "professional case folder paperwork office",
      "legal dossier documents close up",
      "organized case files professional desk",
      "law office documents folders close up",
      "professional paperwork case file neutral office",
    ],
    positive: [
      "file",
      "folder",
      "document",
      "case",
      "paper",
      "paperwork",
      "desk",
      "archive",
    ],
    negative: [
      "food",
      "newspaper",
      "magazine",
    ],
  },

  argumentos: {
    queries: [
      "latin american lawyer analyzing documents office",
      "attorney reviewing case strategy notes neutral office",
      "lawyer writing strategy notes documents desk",
      "professional legal analysis meeting documents",
      "lawyer examining case documents close up",
      "legal strategy professional working at desk",
    ],
    positive: [
      "lawyer",
      "attorney",
      "document",
      "writing",
      "notes",
      "strategy",
      "review",
      "desk",
    ],
  },

  prueba: {
    queries: [
      "lawyer reviewing case evidence documents",
      "professional examining evidence file close up",
      "case evidence paperwork investigation desk",
      "legal evidence documents professional office",
      "hands examining documents evidence",
      "lawyer analyzing records and evidence",
    ],
    positive: [
      "evidence",
      "document",
      "file",
      "investigation",
      "lawyer",
      "attorney",
      "paper",
      "review",
    ],
  },

  motivacion: {
    queries: [
      "legal professional reviewing written decision documents",
      "lawyer analyzing legal reasoning papers",
      "professional reviewing formal decision document",
      "legal analysis documents desk close up",
      "serious professional reading official documents",
      "lawyer studying written resolution office",
    ],
    positive: [
      "lawyer",
      "decision",
      "document",
      "review",
      "writing",
      "legal",
      "paper",
    ],
  },

  recurso: {
    queries: [
      "latin american lawyer preparing appeal documents",
      "attorney preparing filing paperwork office",
      "professional submitting legal documents",
      "lawyer organizing appeal case documents",
      "legal filing paperwork close up",
      "professional preparing formal petition documents",
    ],
    positive: [
      "lawyer",
      "attorney",
      "appeal",
      "filing",
      "document",
      "paper",
    ],
  },

  decision: {
    queries: [
      "professional signing formal decision document",
      "legal professional reviewing written resolution",
      "official paperwork signature desk",
      "serious professional reading decision documents",
      "formal document approval professional office",
      "legal decision documents close up",
    ],
    positive: [
      "decision",
      "official",
      "signing",
      "document",
      "paper",
      "review",
    ],
  },

  "debido-proceso": {
    queries: [
      "latin american legal hearing professional",
      "lawyer formal hearing neutral courtroom",
      "justice hearing professional latin america",
      "legal professionals formal meeting",
      "lawyer presenting case professional setting",
      "justice process professional discussion",
    ],
    positive: [
      "lawyer",
      "justice",
      "hearing",
      "legal",
      "professional",
    ],
  },

  defensa: {
    queries: [
      "latin american lawyer client consultation office",
      "attorney preparing defense documents neutral office",
      "lawyer client meeting professional office",
      "legal consultation documents meeting",
      "professional lawyer advising client",
      "lawyer preparing case strategy with client",
    ],
    positive: [
      "lawyer",
      "attorney",
      "client",
      "meeting",
      "defense",
      "document",
      "office",
    ],
  },

  plazos: {
    queries: [
      "deadline calendar documents professional desk",
      "professional checking calendar documents",
      "calendar paperwork office deadline",
      "business calendar documents close up",
      "professional schedule paperwork desk",
      "date planning documents office",
    ],
    positive: [
      "calendar",
      "deadline",
      "schedule",
      "date",
      "clock",
      "document",
      "desk",
    ],
  },

  ignorar: {
    queries: [
      "unanswered documents professional desk",
      "paperwork waiting office desk",
      "documents waiting administration office",
      "unattended case documents desk",
      "pending paperwork professional office",
      "stack of documents waiting review",
    ],
    positive: [
      "document",
      "paper",
      "desk",
      "office",
      "waiting",
      "paperwork",
    ],
  },

  vulneracion: {
    queries: [
      "concerned latin american lawyer reviewing documents",
      "attorney analyzing rights case office",
      "serious lawyer examining case documents",
      "professional legal rights consultation",
      "lawyer reviewing difficult case documents",
      "legal professional concerned document analysis",
    ],
    positive: [
      "lawyer",
      "attorney",
      "rights",
      "document",
      "serious",
      "case",
      "review",
    ],
  },

  "accion-final": {
    queries: [
      "latin american lawyer submitting legal documents",
      "attorney filing formal documents",
      "lawyer delivering case paperwork",
      "professional submitting documents office",
      "legal filing documents close up",
      "lawyer completing formal paperwork",
    ],
    positive: [
      "lawyer",
      "attorney",
      "filing",
      "submit",
      "document",
      "paper",
    ],
  },

  "semantic-filler": {
    queries: [
      "professional hands reviewing documents desk",
      "legal office paperwork close up",
      "professional organizing documents desk",
      "hands taking notes beside documents",
      "professional meeting documents table",
      "business documents desk cinematic",
      "professional reading paperwork close up",
      "organized folders documents office",
      "serious professional working at desk",
      "document analysis professional workspace",
    ],
    positive: [
      "document",
      "paper",
      "desk",
      "office",
      "writing",
      "hands",
      "professional",
      "lawyer",
    ],
  },
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const CONTEXT_BRIDGES: Array<{
  spanish: string[];
  english: string[];
}> = [
  {
    spanish: ["autoridad", "funcionario"],
    english: [
      "official",
      "government",
      "professional",
    ],
  },
  {
    spanish: ["expediente"],
    english: [
      "file",
      "folder",
      "case",
      "document",
    ],
  },
  {
    spanish: ["argumento", "argumentos"],
    english: [
      "lawyer",
      "strategy",
      "notes",
      "document",
    ],
  },
  {
    spanish: ["prueba", "evidencia"],
    english: [
      "evidence",
      "document",
      "investigation",
    ],
  },
  {
    spanish: [
      "motivacion",
      "fundamentacion",
    ],
    english: [
      "decision",
      "review",
      "document",
    ],
  },
  {
    spanish: [
      "recurso",
      "impugnar",
    ],
    english: [
      "appeal",
      "filing",
      "lawyer",
    ],
  },
  {
    spanish: [
      "plazo",
      "dias",
    ],
    english: [
      "calendar",
      "deadline",
      "date",
      "schedule",
    ],
  },
  {
    spanish: ["defensa"],
    english: [
      "lawyer",
      "attorney",
      "client",
    ],
  },
  {
    spanish: ["debido proceso"],
    english: [
      "justice",
      "hearing",
      "lawyer",
    ],
  },
  {
    spanish: [
      "decision",
      "resolucion",
    ],
    english: [
      "decision",
      "document",
      "signing",
    ],
  },
];

const FOREIGN_CONTEXT_TERMS = [
  "united states",
  "usa",
  "u s flag",
  "american flag",
  "american court",
  "federal court",
  "supreme court of the united states",
  "washington dc",
  "white house",
  "capitol",
  "stars and stripes",
  "us congress",
  "american government",
];

const ENGLISH_VISIBLE_TEXT_TERMS = [
  "english text",
  "english document",
  "english contract",
  "english paperwork",
  "english sign",
  "english signage",
  "english language",
  "english words",
];

const BOLIVIA_POSITIVE_TERMS = [
  "bolivia",
  "bolivian",
  "la paz",
  "cochabamba",
  "santa cruz bolivia",
  "sucre bolivia",
];

const LATIN_CONTEXT_TERMS = [
  "latin america",
  "latin american",
  "south america",
  "south american",
];

function profileFor(
  scene: DirectorScene,
): VisualProfile {
  const silecProfile =
    getSilecVisualProfile(
      scene.ruleId,
    );

  if (silecProfile) {
    return silecProfile;
  }

  const highTicketProfile =
    getHighTicketVisualProfile(
      scene.ruleId,
    );

  if (highTicketProfile) {
    return highTicketProfile;
  }

  return (
    PROFILES[scene.ruleId] ??
    PROFILES["semantic-filler"]
  );
}

function contextTerms(
  scene: DirectorScene,
): string[] {
  const context = normalize(
    [
      scene.narrationContext ?? "",
      scene.concept ?? "",
      scene.visualIntent ?? "",
    ].join(" "),
  );

  const terms: string[] = [];

  for (
    const bridge of
    CONTEXT_BRIDGES
  ) {
    if (
      bridge.spanish.some(
        (term) =>
          context.includes(
            normalize(term),
          ),
      )
    ) {
      terms.push(
        ...bridge.english,
      );
    }
  }

  terms.push(
    ...getSilecContextTerms(
      context,
    ),
  );

  terms.push(
    ...getHighTicketContextTerms(
      context,
    ),
  );

  return [
    ...new Set(terms),
  ];
}

function expandQueries(
  profile: VisualProfile,
  sceneIndex: number,
): string[] {
  const base =
    profile.queries;

  if (base.length === 0) {
    return [];
  }

  const offset =
    sceneIndex %
    base.length;

  const rotated = [
    ...base.slice(offset),
    ...base.slice(0, offset),
  ];

  const variants: string[] = [];

  for (
    let index = 0;
    index < rotated.length;
    index++
  ) {
    const query =
      rotated[index];

    variants.push(query);

    /*
     * Variaciones contextuales.
     *
     * No obligamos a que cada recurso
     * sea explícitamente boliviano.
     * Ampliamos el universo hacia
     * Latinoamérica y escenas neutrales.
     */

    if (
      index < 3 &&
      !normalize(query).includes(
        "latin america",
      )
    ) {
      variants.push(
        `${query} latin america`,
      );
    }

    if (
      index < 2 &&
      !normalize(query).includes(
        "south america",
      )
    ) {
      variants.push(
        `${query} south america`,
      );
    }

    if (
      index === 0 &&
      !normalize(query).includes(
        "bolivia",
      )
    ) {
      variants.push(
        `${query} bolivia`,
      );
    }
  }

  return [
    ...new Set(variants),
  ];
}

export function semanticQueries(
  scene: DirectorScene,
  sceneIndex: number,
): string[] {
  const profile =
    profileFor(scene);

  return expandQueries(
    profile,
    sceneIndex,
  );
}

export type DirectorScore = {
  total: number;

  semantic: number;
  queryMatch: number;
  searchRank: number;
  composition: number;
  quality: number;

  localizationBonus: number;

  diversityPenalty: number;
  negativePenalty: number;
  foreignContextPenalty: number;
  englishTextPenalty: number;
  genericPenalty: number;

  semanticHits: string[];
  localizationHits: string[];
  rejectionReasons: string[];
};

export function rankVisualCandidate(
  scene: DirectorScene,
  asset: PexelsResolvedAsset,
  query: string,
  searchPosition: number,
  creatorUseCount: number,
): DirectorScore {
  const profile =
    profileFor(scene);

  const desired = [
    ...profile.positive,
    ...contextTerms(scene),
  ];

  /*
   * IMPORTANTE:
   *
   * Para las penalizaciones culturales
   * usamos principalmente metadata del
   * asset. No castigamos una fotografía
   * simplemente porque la consulta
   * interna del buscador esté en inglés.
   */

  const assetMetadata =
    normalize(
      asset.altText ?? "",
    );

  const queryMetadata =
    normalize(query);

  const semanticHaystack =
    normalize(
      [
        asset.altText ?? "",
        query,
      ].join(" "),
    );

  const semanticHits = [
    ...new Set(
      desired.filter(
        (term) =>
          semanticHaystack.includes(
            normalize(term),
          ),
      ),
    ),
  ];

  const semantic =
    Math.min(
      48,
      semanticHits.length * 7,
    );

  const queryWords =
    queryMetadata
      .split(" ")
      .filter(
        (word) =>
          word.length >= 4 &&
          ![
            "with",
            "office",
            "legal",
            "professional",
            "latin",
            "america",
            "south",
            "bolivia",
          ].includes(word),
      );

  const queryHits =
    queryWords.filter(
      (word) =>
        semanticHaystack.includes(
          word,
        ),
    ).length;

  const queryMatch =
    Math.min(
      18,
      queryHits * 3,
    );

  const searchRank =
    Math.max(
      0,
      12 -
        searchPosition * 0.6,
    );

  const ratio =
    asset.width /
    asset.height;

  const ratioDistance =
    Math.abs(
      ratio - 9 / 16,
    );

  const composition =
    Math.max(
      0,
      10 -
        ratioDistance * 8,
    );

  const pixels =
    asset.width *
    asset.height;

  const quality =
    Math.min(
      10,
      (
        pixels /
        4_000_000
      ) * 10,
    );

  const diversityPenalty =
    Math.min(
      16,
      creatorUseCount * 6,
    );

  const negativeHits =
    (
      profile.negative ?? []
    ).filter(
      (term) =>
        assetMetadata.includes(
          normalize(term),
        ),
    );

  const negativePenalty =
    negativeHits.length * 8;

  const foreignHits =
    FOREIGN_CONTEXT_TERMS.filter(
      (term) =>
        assetMetadata.includes(
          normalize(term),
        ),
    );

  /*
   * Contexto extranjero contradictorio:
   * castigo deliberadamente alto.
   */

  const foreignContextPenalty =
    foreignHits.length > 0
      ? Math.min(
          80,
          40 +
            (
              foreignHits.length -
              1
            ) *
              12,
        )
      : 0;

  const englishTextHits =
    ENGLISH_VISIBLE_TEXT_TERMS.filter(
      (term) =>
        assetMetadata.includes(
          normalize(term),
        ),
    );

  const englishTextPenalty =
    englishTextHits.length > 0
      ? Math.min(
          70,
          35 +
            (
              englishTextHits.length -
              1
            ) *
              10,
        )
      : 0;

  const boliviaHits =
    BOLIVIA_POSITIVE_TERMS.filter(
      (term) =>
        assetMetadata.includes(
          normalize(term),
        ),
    );

  const latinHits =
    LATIN_CONTEXT_TERMS.filter(
      (term) =>
        assetMetadata.includes(
          normalize(term),
        ),
    );

  const localizationHits = [
    ...new Set([
      ...boliviaHits,
      ...latinHits,
    ]),
  ];

  /*
   * Bolivia recibe mayor preferencia.
   * Latinoamérica recibe una preferencia
   * moderada.
   *
   * Los recursos neutrales siguen siendo
   * perfectamente utilizables.
   */

  const localizationBonus =
    Math.min(
      18,
      boliviaHits.length * 10 +
        latinHits.length * 4,
    );

  const genericPenalty =
    semanticHits.length === 0
      ? 22
      : 0;

  const rejectionReasons: string[] =
    [];

  if (
    foreignHits.length > 0
  ) {
    rejectionReasons.push(
      `foreign-context:${foreignHits.join(
        ",",
      )}`,
    );
  }

  if (
    englishTextHits.length > 0
  ) {
    rejectionReasons.push(
      `english-visible-text:${englishTextHits.join(
        ",",
      )}`,
    );
  }

  if (
    negativeHits.length > 0
  ) {
    rejectionReasons.push(
      `negative-profile:${negativeHits.join(
        ",",
      )}`,
    );
  }

  const total =
    semantic +
    queryMatch +
    searchRank +
    composition +
    quality +
    localizationBonus -
    diversityPenalty -
    negativePenalty -
    foreignContextPenalty -
    englishTextPenalty -
    genericPenalty;

  return {
    total:
      Math.round(
        total * 10,
      ) / 10,

    semantic,

    queryMatch,

    searchRank:
      Math.round(
        searchRank * 10,
      ) / 10,

    composition:
      Math.round(
        composition * 10,
      ) / 10,

    quality:
      Math.round(
        quality * 10,
      ) / 10,

    localizationBonus,

    diversityPenalty,

    negativePenalty,

    foreignContextPenalty,

    englishTextPenalty,

    genericPenalty,

    semanticHits,

    localizationHits,

    rejectionReasons,
  };
      }
