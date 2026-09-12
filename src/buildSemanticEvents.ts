import {
  semanticRules,
  type SemanticRule,
  type SemanticVisualType,
} from "./semantic/semanticRules";

export type WordTiming = {
  text: string;
  startMs: number;
  endMs: number;
};

export type SemanticEvent = {
  id: string;
  ruleId: string;
  visualType: SemanticVisualType;
  concept: string;
  matchedKeyword: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  priority: number;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

const tokenizeKeyword = (keyword: string) =>
  keyword
    .trim()
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);

const matchesKeywordAt = (
  words: WordTiming[],
  startIndex: number,
  keyword: string,
): boolean => {
  const keywordTokens = tokenizeKeyword(keyword);

  if (keywordTokens.length === 0) {
    return false;
  }

  if (startIndex + keywordTokens.length > words.length) {
    return false;
  }

  return keywordTokens.every((token, offset) => {
    return normalize(words[startIndex + offset].text) === token;
  });
};

const createEvent = (
  rule: SemanticRule,
  keyword: string,
  words: WordTiming[],
  startIndex: number,
): SemanticEvent => {
  const keywordTokens = tokenizeKeyword(keyword);

  const firstWord = words[startIndex];
  const lastWord = words[startIndex + keywordTokens.length - 1];

  const startMs = firstWord.startMs;
  const minimumEndMs = lastWord.endMs;
  const plannedEndMs = startMs + rule.durationMs;

  return {
    id: `${rule.id}-${startMs}`,
    ruleId: rule.id,
    visualType: rule.visualType,
    concept: rule.concept,
    matchedKeyword: keyword,
    startMs,
    endMs: Math.max(minimumEndMs, plannedEndMs),
    durationMs: Math.max(
      minimumEndMs - startMs,
      rule.durationMs,
    ),
    priority: rule.priority,
  };
};

export const buildSemanticEvents = (
  words: WordTiming[],
  rules: SemanticRule[] = semanticRules,
): SemanticEvent[] => {
  const events: SemanticEvent[] = [];

  for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
    for (const rule of rules) {
      for (const keyword of rule.keywords) {
        if (!matchesKeywordAt(words, wordIndex, keyword)) {
          continue;
        }

        events.push(
          createEvent(
            rule,
            keyword,
            words,
            wordIndex,
          ),
        );
      }
    }
  }

  const deduplicated = new Map<string, SemanticEvent>();

  for (const event of events) {
    const key = `${event.ruleId}-${event.startMs}`;

    const existing = deduplicated.get(key);

    if (!existing || event.priority > existing.priority) {
      deduplicated.set(key, event);
    }
  }

  return Array.from(deduplicated.values()).sort((a, b) => {
    if (a.startMs !== b.startMs) {
      return a.startMs - b.startMs;
    }

    return b.priority - a.priority;
  });
};
