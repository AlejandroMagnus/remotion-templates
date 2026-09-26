import type {
  QInfinityStrategicContentPacket,
} from "../strategy/QInfinityStrategicContentPacket";
import { EditorialMetadataSchema, legalReviewIssue, type EditorialMetadata } from "../strategy/EditorialCatalog";

export type SilecKnowledgeInput = {
  editorial?: EditorialMetadata;
  productionCode: string;

  topic: string;
  centralThesis: string;
  problem: string;

  reasoningChain: string[];

  conclusion: string;

  targetAudience: string[];
  capabilityDemonstrated: string[];

  commercialObjective: string;
  offerPath: string[];

  hook: string;
  closingIdea: string;
  cta: string;
};

export function buildSilecStrategicPacket(
  input: SilecKnowledgeInput,
): QInfinityStrategicContentPacket {
  if (input.editorial) {
    input = { ...input, editorial: EditorialMetadataSchema.parse(input.editorial) };
    if (input.editorial?.legalReview) {
      const issue = legalReviewIssue(input);
      if (issue) throw new Error(`REVISIÓN JURÍDICA: ${issue}`);
    }
  }
  return {
    editorial: input.editorial,
    productionCode: input.productionCode,

    version:
      "V3.11-A-SILEC-KNOWLEDGE-TO-OPPORTUNITY",

    source: {
      ecosystem: "ECOSISTEMA SILEC",
      module: "PhD 12 — Integración Total SILEC Operativo",
      domain: "juridico",
      sourceType: "internal-knowledge",

      // Antes de publicar afirmaciones normativas,
      // jurisprudenciales o sobre casos concretos,
      // deben verificarse sus fuentes.
      legalVerificationRequired: legalReviewIssue(input) !== null,
    },

    strategicObjective: {
      primaryGoal:
        "Demostrar capacidad jurídica estratégica mediante contenido audiovisual de alto valor.",

      targetAudience:
        input.targetAudience,

      capabilityDemonstrated:
        input.capabilityDemonstrated,

      commercialObjective:
        input.commercialObjective,

      offerPath:
        input.offerPath,
    },

    knowledge: {
      topic:
        input.topic,

      centralThesis:
        input.centralThesis,

      problem:
        input.problem,

      reasoningChain:
        input.reasoningChain,

      conclusion:
        input.conclusion,
    },

    audiovisual: {
      hook:
        input.hook,

      narrativePromise:
        "Transformar un problema jurídico aparentemente complejo en una secuencia lógica y estratégica comprensible.",

      tone:
        "jurídico premium, claro, estratégico, seguro y pedagógico",

      desiredDurationSeconds: 60,

      visualPrinciples: [
        "una idea dominante por unidad narrativa",
        "imagen semánticamente vinculada a la narración",
        "evitar visuales jurídicos genéricos cuando exista una representación más precisa",
        "movimiento cinematográfico cadencioso",
        "continuidad narrativa",
        "sin slideshow",
        "sin saturación gráfica",
      ],

      closingIdea:
        input.closingIdea,

      cta:
        input.cta,
    },

    qInfinity: {
      strategicValue: 95,
      authorityValue: 96,
      commercialPotential: 90,
      reusability: 94,
      scalability: 96,

      rationale:
        "El contenido demuestra método y capacidad profesional, puede atraer problemas reales de alto valor y reutilizarse en múltiples canales, servicios y activos.",
    },
  };
}
