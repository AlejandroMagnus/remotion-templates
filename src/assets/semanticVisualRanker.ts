import type {PexelsResolvedAsset} from "./providers/pexelsProvider";
import {
  getSilecContextTerms,
  getSilecVisualProfile,
} from "./silecVisualProfiles";

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
      "government official reviewing legal documents office",
      "public administration professional reading documents",
      "official reviewing case file desk",
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
      "legal case file folder documents desk",
      "law office case file paperwork",
      "court dossier documents close up",
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
      "lawyer analyzing legal arguments documents",
      "attorney reviewing case strategy notes",
      "lawyer writing legal notes desk",
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
      "lawyer reviewing legal evidence documents",
      "case evidence paperwork investigation",
      "attorney examining evidence file",
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
      "judge reviewing written legal decision",
      "lawyer analyzing legal reasoning documents",
      "legal decision review office",
    ],
    positive: [
      "judge",
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
      "lawyer preparing legal appeal documents",
      "attorney filing court appeal paperwork",
      "legal appeal documents office",
    ],
    positive: [
      "lawyer",
      "attorney",
      "appeal",
      "court",
      "filing",
      "document",
      "paper",
    ],
  },

  decision: {
    queries: [
      "official signing legal decision document",
      "judge reviewing court ruling",
      "legal decision paperwork desk",
    ],
    positive: [
      "decision",
      "judge",
      "official",
      "signing",
      "document",
      "court",
      "paper",
    ],
  },

  "debido-proceso": {
    queries: [
      "court hearing lawyer justice process",
      "lawyer courtroom legal hearing",
      "judge courtroom justice",
    ],
    positive: [
      "court",
      "courtroom",
      "lawyer",
      "judge",
      "justice",
      "hearing",
      "legal",
    ],
  },

  defensa: {
    queries: [
      "defense lawyer client consultation office",
      "attorney preparing legal defense documents",
      "lawyer client meeting legal office",
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
      "legal deadline calendar documents desk",
      "lawyer checking calendar deadline",
      "calendar paperwork office deadline",
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
      "unanswered legal documents desk",
      "ignored paperwork office desk",
      "documents waiting bureaucracy office",
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
      "concerned lawyer reviewing legal rights documents",
      "attorney legal rights case office",
      "serious lawyer examining case documents",
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
      "lawyer filing legal action documents",
      "attorney submitting court documents",
      "lawyer courthouse paperwork",
    ],
    positive: [
      "lawyer",
      "attorney",
      "filing",
      "submit",
      "court",
      "document",
      "paper",
    ],
  },

  "semantic-filler": {
    queries: [
      "lawyer hands legal documents desk",
      "law office paperwork close up",
      "professional organizing documents desk",
    ],
    positive: [
      "document",
      "paper",
      "desk",
      "office",
      "writing",
      "hands",
      "lawyer",
    ],
  },
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9áéíóúñ ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const CONTEXT_BRIDGES: Array<{
  spanish: string[];
  english: string[];
}> = [
  {
    spanish: ["autoridad", "funcionario"],
    english: ["official", "government", "professional"],
  },
  {
    spanish: ["expediente"],
    english: ["file", "folder", "case", "document"],
  },
  {
    spanish: ["argumento", "argumentos"],
    english: ["lawyer", "strategy", "notes", "document"],
  },
  {
    spanish: ["prueba", "evidencia"],
    english: ["evidence", "document", "investigation"],
  },
  {
    spanish: ["motivacion", "fundamentacion"],
    english: ["decision", "review", "judge", "document"],
  },
  {
    spanish: ["recurso", "impugnar"],
    english: ["appeal", "filing", "court", "lawyer"],
  },
  {
    spanish: ["plazo", "dias"],
    english: ["calendar", "deadline", "date", "schedule"],
  },
  {
    spanish: ["defensa"],
    english: ["lawyer", "attorney", "client"],
  },
  {
    spanish: ["debido proceso"],
    english: ["court", "justice", "hearing", "lawyer"],
  },
  {
    spanish: ["decision", "resolucion"],
    english: ["decision", "judge", "document", "signing"],
  },
];

function profileFor(scene: DirectorScene): VisualProfile {
  const silecProfile =
    getSilecVisualProfile(scene.ruleId);

  if (silecProfile) {
    return silecProfile;
  }

  return (
    PROFILES[scene.ruleId] ??
    PROFILES["semantic-filler"]
  );
}

function contextTerms(scene: DirectorScene): string[] {
  const context = normalize(
    [
      scene.narrationContext ?? "",
      scene.concept ?? "",
      scene.visualIntent ?? "",
    ].join(" "),
  );

  const terms: string[] = [];

  for (const bridge of CONTEXT_BRIDGES) {
    if (
      bridge.spanish.some((term) =>
        context.includes(normalize(term)),
      )
    ) {
      terms.push(...bridge.english);
    }
  }

  terms.push(
    ...getSilecContextTerms(context),
  );

  return [...new Set(terms)];
}

export function semanticQueries(
  scene: DirectorScene,
  sceneIndex: number,
): string[] {
  const profile = profileFor(scene);

  const offset =
    sceneIndex % profile.queries.length;

  return [
    ...profile.queries.slice(offset),
    ...profile.queries.slice(0, offset),
  ];
}

export type DirectorScore = {
  total: number;
  semantic: number;
  queryMatch: number;
  searchRank: number;
  composition: number;
  quality: number;
  diversityPenalty: number;
  negativePenalty: number;
  semanticHits: string[];
};

export function rankVisualCandidate(
  scene: DirectorScene,
  asset: PexelsResolvedAsset,
  query: string,
  searchPosition: number,
  creatorUseCount: number,
): DirectorScore {
  const profile = profileFor(scene);

  const desired = [
    ...profile.positive,
    ...contextTerms(scene),
  ];

  const haystack = normalize(
    [
      asset.altText ?? "",
      query,
    ].join(" "),
  );

  const semanticHits = [
    ...new Set(
      desired.filter((term) =>
        haystack.includes(normalize(term)),
      ),
    ),
  ];

  const semantic =
    Math.min(
      48,
      semanticHits.length * 7,
    );

  const queryWords = normalize(query)
    .split(" ")
    .filter(
      (word) =>
        word.length >= 4 &&
        ![
          "with",
          "office",
          "legal",
          "professional",
        ].includes(word),
    );

  const queryHits =
    queryWords.filter((word) =>
      haystack.includes(word),
    ).length;

  const queryMatch =
    Math.min(18, queryHits * 3);

  const searchRank =
    Math.max(
      0,
      12 - searchPosition * 0.6,
    );

  const ratio =
    asset.width / asset.height;

  // Favor actual 9:16 output without rejecting
  // assets useful for future responsive crops.
  const ratioDistance =
    Math.abs(ratio - 9 / 16);

  const composition =
    Math.max(
      0,
      10 - ratioDistance * 8,
    );

  const pixels =
    asset.width * asset.height;

  const quality =
    Math.min(
      10,
      (pixels / 4_000_000) * 10,
    );

  const diversityPenalty =
    Math.min(
      12,
      creatorUseCount * 5,
    );

  const negativePenalty =
    (profile.negative ?? []).filter(
      (term) =>
        haystack.includes(
          normalize(term),
        ),
    ).length * 8;

  // Una fotografía genérica sin ninguna
  // coincidencia semántica recibe castigo fuerte.
  const genericPenalty =
    semanticHits.length === 0
      ? 22
      : 0;

  const total =
    semantic +
    queryMatch +
    searchRank +
    composition +
    quality -
    diversityPenalty -
    negativePenalty -
    genericPenalty;

  return {
    total:
      Math.round(total * 10) / 10,

    semantic,
    queryMatch,
    searchRank:
      Math.round(searchRank * 10) / 10,

    composition:
      Math.round(composition * 10) / 10,

    quality:
      Math.round(quality * 10) / 10,

    diversityPenalty,
    negativePenalty,
    semanticHits,
  };
}
