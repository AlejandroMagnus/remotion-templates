import { createHash } from "node:crypto";
import { z } from "zod";
import type { HighTicketOpportunity } from "./AutonomousHighTicketContentDirector";

export const EDITORIAL_CATALOG_VERSION = "QINFINITY-EDITORIAL-CATALOG-1";
export type EditorialCategory = "FI" | "DT" | "HT";
export const EDITORIAL_TARGETS = { FI: 9, DT: 6, HT: 5 } as const;

const text = z.string().trim().min(1);
const category = z.enum(["FI", "DT", "HT"]);
const texts = z.array(text).min(1);
const value = z.number().finite().min(0).max(100);

export const EditorialMetadataSchema = z
  .object({
    opportunityId: text.optional(),
    category,
    secondaryCategory: category.optional(),
    dimension: z
      .enum(["doctrinal", "sustantiva", "procesal", "forense"])
      .optional(),
    domains: texts,
    intellectualContribution: text,
    newAngle: z
      .object({
        comparedWith: texts,
        contribution: text,
      })
      .optional(),
    legalReview: z
      .object({
        status: z.enum(["pending", "approved", "revoked"]),
        authority: z.literal("PhD 12"),
        jurisdiction: text.optional(),
        reviewedBy: text.optional(),
        reviewedAt: text.optional(),
        reviewReference: text.optional(),
        sources: z.array(z.object({ reference: text, locator: text })),
        contentHash: text.optional(),
        validUntil: text.optional(),
      })
      .optional(),
  })
  .strict();

export type EditorialMetadata = z.infer<typeof EditorialMetadataSchema>;

export const EditorialScoresSchema = z.object({
  intellectualAuthority: value,
  legalBreadth: value,
  commercialPotential: value,
  retention: value,
  seo: value,
  differentiation: value,
  timeliness: value,
});

const OpportunitySchema = z
  .object({
    id: text.regex(/^[a-z0-9][a-z0-9-]*$/),
    domain: text,
    topic: text,
    centralThesis: text,
    problem: text,
    reasoningChain: texts,
    conclusion: text,
    targetAudience: texts,
    capabilityDemonstrated: texts,
    commercialObjective: text,
    offerPath: texts,
    hook: text,
    closingIdea: text,
    cta: text,
    strategicValue: value,
    authorityValue: value,
    commercialPotential: value,
    urgencyValue: value,
    reusability: value,
    scalability: value,
    editorial: EditorialMetadataSchema,
    editorialScores: EditorialScoresSchema,
  })
  .strict()
  .superRefine((opportunity, ctx) => {
    if (
      !opportunity.editorial.dimension ||
      !opportunity.editorial.legalReview
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Una ficha de catálogo requiere dimensión jurídica y estado de revisión.",
      });
    }
    if (
      opportunity.editorial.category === "DT" &&
      new Set(opportunity.editorial.domains).size < 2
    ) {
      ctx.addIssue({
        code: "custom",
        message: "DT requiere identificar las ramas que se integran.",
      });
    }
    if (
      opportunity.editorial.opportunityId &&
      opportunity.editorial.opportunityId !== opportunity.id
    ) {
      ctx.addIssue({
        code: "custom",
        message: "opportunityId no coincide con id.",
      });
    }
  });

export const EditorialCatalogSchema = z
  .object({
    version: z.literal(EDITORIAL_CATALOG_VERSION),
    opportunities: z.array(OpportunitySchema),
  })
  .strict();

type ReviewableContent = {
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
  editorial?: EditorialMetadata;
};

/** Bind a recorded legal review to the exact text, including its proposed new angle.
 * A hash proves that text was not changed after review; it does not validate law.
 */
export function reviewedContentHash(content: ReviewableContent): string {
  const { editorial } = content;
  const canonical = {
    topic: content.topic,
    centralThesis: content.centralThesis,
    problem: content.problem,
    reasoningChain: content.reasoningChain,
    conclusion: content.conclusion,
    targetAudience: content.targetAudience,
    capabilityDemonstrated: content.capabilityDemonstrated,
    commercialObjective: content.commercialObjective,
    offerPath: content.offerPath,
    hook: content.hook,
    closingIdea: content.closingIdea,
    cta: content.cta,
    category: editorial?.category ?? null,
    secondaryCategory: editorial?.secondaryCategory ?? null,
    dimension: editorial?.dimension ?? null,
    domains: editorial?.domains ?? [],
    intellectualContribution: editorial?.intellectualContribution ?? null,
    newAngle: editorial?.newAngle
      ? {
          comparedWith: [...editorial.newAngle.comparedWith].sort(),
          contribution: editorial.newAngle.contribution,
        }
      : null,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function legalReviewIssue(
  content: ReviewableContent,
  now = new Date(),
): string | null {
  const review = content.editorial?.legalReview;
  if (!review || review.status !== "approved")
    return "Revisión jurídica pendiente o revocada.";
  if (
    review.authority !== "PhD 12" ||
    !review.jurisdiction?.trim() ||
    !review.reviewedBy?.trim() ||
    !review.reviewReference?.trim() ||
    !review.sources.length
  ) {
    return "Faltan jurisdicción, responsable, referencia de revisión o fuentes jurídicas.";
  }
  const reviewedAt = Date.parse(review.reviewedAt ?? "");
  if (!Number.isFinite(reviewedAt) || reviewedAt > now.getTime())
    return "Fecha de revisión inválida.";
  if (review.validUntil) {
    const until = Date.parse(review.validUntil);
    if (
      !Number.isFinite(until) ||
      until <= reviewedAt ||
      until <= now.getTime()
    )
      return "Revisión vencida o vigencia inválida.";
  }
  if (review.contentHash !== reviewedContentHash(content))
    return "El contenido cambió después de la revisión registrada.";
  return null;
}

export function inspectEditorialCatalog(raw: unknown, now = new Date()) {
  const catalog = EditorialCatalogSchema.parse(raw);
  const ids = new Set<string>();
  const available: HighTicketOpportunity[] = [];
  const excluded: Array<{ id: string; reason: string }> = [];
  for (const opportunity of catalog.opportunities) {
    if (ids.has(opportunity.id))
      throw new Error(`ID duplicado en catálogo: ${opportunity.id}`);
    ids.add(opportunity.id);
    const reason = legalReviewIssue(opportunity, now);
    if (reason) excluded.push({ id: opportunity.id, reason });
    else available.push(opportunity);
  }
  return { catalog, available, excluded };
}

/** Current source: append reviewed cards instead of editing the selector. */
export function mergeEditorialOpportunities(
  legacy: HighTicketOpportunity[],
  incoming: HighTicketOpportunity[],
) {
  const ids = new Set(legacy.map((item) => item.id));
  for (const item of incoming) {
    if (ids.has(item.id))
      throw new Error(
        `La ficha ${item.id} ya existe. Un ángulo nuevo requiere una identidad propia.`,
      );
    ids.add(item.id);
  }
  return [...legacy, ...incoming];
}
