import type {SemanticEvent} from "../buildSemanticEvents";

export type OndaResource = {
  name: string;
  title: string;
  description: string;
  category: string;
};

export type RankedSemanticResource = {
  resource: OndaResource;
  score: number;
  reasons: string[];
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const tokenize = (value: string) =>
  new Set(
    normalize(value)
      .split(/\s+/)
      .filter((word) => word.length >= 3),
  );

const categoryAffinity: Record<
  SemanticEvent["visualType"],
  Record<string, number>
> = {
  document: {
    scenes: 8,
    graphics: 7,
    interface: 6,
    media: 4,
    entrances: 2,
    transitions: 1,
  },

  keyword: {
    graphics: 8,
    entrances: 7,
    scenes: 5,
    interface: 4,
    transitions: 3,
  },

  evidence: {
    graphics: 8,
    scenes: 7,
    charts: 6,
    interface: 6,
    media: 4,
  },

  process: {
    scenes: 8,
    graphics: 7,
    interface: 6,
    charts: 5,
    transitions: 2,
  },

  warning: {
    graphics: 8,
    entrances: 6,
    scenes: 6,
    interface: 4,
    transitions: 3,
  },

  cta: {
    scenes: 8,
    graphics: 7,
    entrances: 6,
    interface: 5,
    transitions: 3,
  },
};

const semanticHints: Record<
  SemanticEvent["visualType"],
  string[]
> = {
  document: [
    "document",
    "paper",
    "text",
    "card",
    "quote",
    "panel",
    "editorial",
  ],

  keyword: [
    "text",
    "type",
    "kinetic",
    "title",
    "headline",
    "word",
  ],

  evidence: [
    "data",
    "chart",
    "comparison",
    "proof",
    "cards",
    "steps",
    "diagram",
  ],

  process: [
    "timeline",
    "steps",
    "flow",
    "process",
    "sequence",
    "diagram",
    "progress",
  ],

  warning: [
    "alert",
    "warning",
    "impact",
    "flash",
    "highlight",
    "signal",
  ],

  cta: [
    "cta",
    "call",
    "action",
    "title",
    "ending",
    "outro",
    "button",
  ],
};

const scoreResource = (
  event: SemanticEvent,
  resource: OndaResource,
): RankedSemanticResource => {
  let score = 0;

  const reasons: string[] = [];

  const searchable = normalize(
    `${resource.name} ${resource.title} ${resource.description}`,
  );

  const resourceTokens = tokenize(searchable);

  const semanticTokens = tokenize(
    `${event.concept} ${event.matchedKeyword}`,
  );

  const categoryScore =
    categoryAffinity[event.visualType]?.[
      resource.category
    ] ?? 0;

  if (categoryScore > 0) {
    score += categoryScore;

    reasons.push(
      `category:${resource.category}+${categoryScore}`,
    );
  }

  let directMatches = 0;

  for (const token of semanticTokens) {
    if (resourceTokens.has(token)) {
      directMatches += 1;
    }
  }

  if (directMatches > 0) {
    const value = directMatches * 5;

    score += value;

    reasons.push(
      `semantic-overlap:${directMatches}+${value}`,
    );
  }

  const hints =
    semanticHints[event.visualType] ?? [];

  let hintMatches = 0;

  for (const hint of hints) {
    if (searchable.includes(normalize(hint))) {
      hintMatches += 1;
    }
  }

  if (hintMatches > 0) {
    const value = hintMatches * 3;

    score += value;

    reasons.push(
      `visual-fit:${hintMatches}+${value}`,
    );
  }

  if (resource.category === "transitions") {
    score -= 4;

    reasons.push(
      "transition-not-primary:-4",
    );
  }

  if (resource.category === "scenes") {
    score += 2;

    reasons.push(
      "scene-richness:+2",
    );
  }

  return {
    resource,
    score,
    reasons,
  };
};

export const rankSemanticResources = (
  event: SemanticEvent,
  catalog: OndaResource[],
  limit = 3,
): RankedSemanticResource[] => {
  return catalog
    .map((resource) =>
      scoreResource(event, resource),
    )
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      return a.resource.name.localeCompare(
        b.resource.name,
      );
    })
    .slice(0, limit);
};

export const selectSemanticResource = (
  event: SemanticEvent,
  catalog: OndaResource[],
): RankedSemanticResource | null => {
  const [winner] = rankSemanticResources(
    event,
    catalog,
    1,
  );

  return winner ?? null;
};
