export const AUTHORIAL_HUMAN_VALUE_BRIDGE_VERSION =
  "AUTHORIAL-HUMAN-VALUE-BRIDGE-V1";

export type AuthorialHumanValuePlan = {
  productionCode: string;
  sourceBound: boolean;
  authorialThesis: string;
  discovery?: string;
  reasoningChain: string[];
  sourceFragments?: string[];
};

type HumanValuePlanLike = {
  productionCode: string;
  opening: string;
  takeaway: string;
  closing: {
    idea: string;
    cta: string;
  };
};

type HumanValueVideoLike = {
  audio?: {
    narrationText?: string;
  };
};

type ReviewLike = {
  blockers: string[];
  [key: string]: unknown;
};

const GENERIC_BLOCKER =
  "El guion no contiene la apertura, desarrollo o cierre previstos.";

const clean = (value: unknown): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const unique = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values.map(clean).filter(Boolean)) {
    const key = value.toLocaleLowerCase("es");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }

  return out;
};

function containsText(haystack: string, needle: string): boolean {
  const h = clean(haystack);
  const n = clean(needle);
  return Boolean(n) && h.includes(n);
}

function sourceBoundOpeningCandidates(
  plan: HumanValuePlanLike,
  authorial: AuthorialHumanValuePlan,
): string[] {
  return unique([
    plan.opening,
    authorial.authorialThesis,
    authorial.discovery ?? "",
    ...(authorial.sourceFragments ?? []),
  ]);
}

export function reconcileAuthorialHumanValueReview<T extends ReviewLike>(
  review: T,
  plan: HumanValuePlanLike,
  video: HumanValueVideoLike,
  authorial: AuthorialHumanValuePlan,
): T & {
  authorialCompatibility: {
    version: string;
    applied: boolean;
    openingOk: boolean;
    matchedDevelopment: number;
    requiredDevelopment: number;
    closingOk: boolean;
    sourceBound: boolean;
  };
} {
  const narration = clean(video.audio?.narrationText ?? "");

  const base = {
    ...review,
    blockers: [...review.blockers],
  };

  if (
    !authorial.sourceBound ||
    authorial.productionCode !== plan.productionCode
  ) {
    const message =
      "El plan de autoría no corresponde a la producción o no está marcado como sourceBound.";

    if (!base.blockers.includes(message)) {
      base.blockers.push(message);
    }

    return {
      ...base,
      authorialCompatibility: {
        version: AUTHORIAL_HUMAN_VALUE_BRIDGE_VERSION,
        applied: false,
        openingOk: false,
        matchedDevelopment: 0,
        requiredDevelopment: 0,
        closingOk: false,
        sourceBound: false,
      },
    };
  }

  const openingWindow = narration.slice(
    0,
    Math.max(650, Math.floor(narration.length * 0.28)),
  );

  const openingCandidates = sourceBoundOpeningCandidates(plan, authorial);

  const openingOk = openingCandidates.some((candidate) =>
    containsText(openingWindow, candidate),
  );

  const support = unique(authorial.reasoningChain);

  const matched = support.filter((item) => containsText(narration, item));

  const requiredDevelopment = Math.min(2, support.length);

  const developmentOk =
    requiredDevelopment > 0 && matched.length >= requiredDevelopment;

  const closingRequired = unique([
    plan.takeaway,
    plan.closing.idea,
    plan.closing.cta,
  ]);

  const closingWindow = narration.slice(
    Math.max(
      0,
      narration.length - Math.max(900, Math.floor(narration.length * 0.4)),
    ),
  );

  const closingOk =
    closingRequired.length > 0 &&
    closingRequired.every(
      (item) =>
        containsText(closingWindow, item) || containsText(narration, item),
    );

  const compatible = openingOk && developmentOk && closingOk;

  if (compatible) {
    base.blockers = base.blockers.filter((item) => item !== GENERIC_BLOCKER);
  } else {
    const replacement = [
      "El guion autoral no conserva la estructura mínima de valor humano:",
      `apertura source-bound=${openingOk ? "sí" : "no"}`,
      `desarrollo=${matched.length}/${requiredDevelopment}`,
      `cierre=${closingOk ? "sí" : "no"}.`,
    ].join(" ");

    base.blockers = base.blockers.map((item) =>
      item === GENERIC_BLOCKER ? replacement : item,
    );

    if (
      !base.blockers.includes(replacement) &&
      !review.blockers.includes(GENERIC_BLOCKER)
    ) {
      base.blockers.push(replacement);
    }
  }

  return {
    ...base,
    authorialCompatibility: {
      version: AUTHORIAL_HUMAN_VALUE_BRIDGE_VERSION,
      applied: true,
      openingOk,
      matchedDevelopment: matched.length,
      requiredDevelopment,
      closingOk,
      sourceBound: true,
    },
  };
}
