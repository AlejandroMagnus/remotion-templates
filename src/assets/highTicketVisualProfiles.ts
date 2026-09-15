export type HighTicketVisualProfile = {
  queries: string[];
  positive: string[];
  negative?: string[];
};

const PROFILES: Record<string, HighTicketVisualProfile> = {
  "controversia-alto-valor": {
    queries: [
      "executive legal strategy meeting high stakes",
      "business lawyer serious client consultation",
      "corporate dispute legal documents executive",
    ],
    positive: [
      "executive",
      "lawyer",
      "business",
      "strategy",
      "documents",
      "serious",
      "professional",
    ],
    negative: ["celebration", "party", "casual"],
  },

  "contratos-high-ticket": {
    queries: [
      "executive signing important business contract",
      "lawyer reviewing corporate contract close up",
      "business agreement legal documents premium office",
    ],
    positive: [
      "contract",
      "agreement",
      "lawyer",
      "business",
      "document",
      "executive",
    ],
  },

  arbitraje: {
    queries: [
      "international arbitration legal meeting",
      "business dispute lawyers conference room",
      "corporate legal negotiation serious executives",
    ],
    positive: [
      "arbitration",
      "lawyer",
      "business",
      "meeting",
      "dispute",
      "negotiation",
    ],
  },

  "conflicto-administrativo": {
    queries: [
      "lawyer government regulatory documents office",
      "administrative law legal document review",
      "regulatory compliance lawyer business",
    ],
    positive: [
      "lawyer",
      "regulatory",
      "government",
      "documents",
      "compliance",
      "business",
    ],
  },

  patrimonio: {
    queries: [
      "business owner assets legal planning",
      "wealth protection lawyer client meeting",
      "corporate assets legal strategy",
    ],
    positive: [
      "assets",
      "wealth",
      "business",
      "lawyer",
      "strategy",
      "client",
    ],
  },

  "control-constitucional": {
    queries: [
      "constitutional law court legal research",
      "lawyer reviewing constitution legal documents",
      "court justice constitutional legal analysis",
    ],
    positive: [
      "constitution",
      "court",
      "lawyer",
      "justice",
      "legal",
      "research",
    ],
  },
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function getHighTicketVisualProfile(
  ruleId: string,
): HighTicketVisualProfile | null {
  return PROFILES[ruleId] ?? null;
}

export function getHighTicketContextTerms(
  context: string,
): string[] {
  const text = normalize(context);
  const terms: string[] = [];

  if (
    text.includes("alto valor") ||
    text.includes("alto impacto")
  ) {
    terms.push(
      "executive",
      "business",
      "high stakes",
      "strategy",
    );
  }

  if (text.includes("contrato")) {
    terms.push(
      "contract",
      "agreement",
      "documents",
      "executive",
    );
  }

  if (text.includes("arbitraj")) {
    terms.push(
      "arbitration",
      "business dispute",
      "lawyer",
    );
  }

  if (text.includes("administrativ")) {
    terms.push(
      "regulatory",
      "government",
      "legal",
      "documents",
    );
  }

  if (
    text.includes("patrimonio") ||
    text.includes("patrimonial")
  ) {
    terms.push(
      "assets",
      "wealth",
      "business",
      "protection",
    );
  }

  if (text.includes("constitucional")) {
    terms.push(
      "constitution",
      "court",
      "justice",
      "lawyer",
    );
  }

  return [...new Set(terms)];
}
