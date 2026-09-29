import { createHash } from "node:crypto";
import { z } from "zod";
import {
  legalReviewIssue,
  reviewedContentHash,
} from "../strategy/EditorialCatalog";
import type { SilecKnowledgeInput } from "./SilecContentAdapter";

export const HUMAN_VALUE_VERSION = "human-value-1";
export const HumanValueIntentSchema = z
  .object({
    benefit: z
      .enum([
        "ayudar",
        "enseñar",
        "resolver",
        "aclarar",
        "inspirar",
        "motivar",
        "entretener",
        "hacer-reír",
        "reflexionar",
      ])
      .optional(),
    // Optional direction from the request, never a required form for the user.
    ctaMode: z.enum(["auto", "source", "none"]).optional(),
  })
  .strict();
export type HumanValueIntent = z.infer<typeof HumanValueIntentSchema>;

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/** Plans with existing source text. It neither invents legal claims nor approves them. */
export function buildHumanValuePlan(input: SilecKnowledgeInput) {
  const intent = HumanValueIntentSchema.parse(input.humanValue ?? {});
  const steps = input.reasoningChain.map(clean).filter(Boolean);
  const benefit = intent.benefit ?? "aclarar";
  const ctaMode = intent.ctaMode ?? "auto";
  const useSourceCta =
    ctaMode === "source" ||
    (ctaMode === "auto" && input.editorial?.category === "HT");
  const cta = useSourceCta ? clean(input.cta) : "";
  const sourceHash = createHash("sha256")
    .update(
      JSON.stringify({
        content: reviewedContentHash(input),
        intent,
      }),
    )
    .digest("hex");
  return {
    version: HUMAN_VALUE_VERSION,
    productionCode: input.productionCode,
    sourceHash,
    benefit,
    benefitOrigin: intent.benefit ? "request" : "legal-explanation-default",
    audience: input.targetAudience.map(clean).filter(Boolean),
    need: clean(input.problem),
    attentionReturn: {
      question: "¿Qué obtiene esta persona a cambio de su atención?",
      answer: clean(input.conclusion),
      support: steps.map((text, index) => ({
        source: `reasoningChain[${index}]`,
        text,
      })),
    },
    opening: clean(input.hook),
    takeaway: clean(input.conclusion),
    closing: {
      idea: clean(input.closingIdea),
      cta,
      ctaMode,
      reason:
        ctaMode !== "auto"
          ? "request"
          : useSourceCta
            ? "commercial-category-HT"
            : "close-with-useful-conclusion",
    },
    delivery: {
      voice:
        "Explicar el razonamiento sin exagerar su certeza ni sus resultados.",
      images:
        "Mostrar el hecho, relación o paso explicado; identificar las ilustraciones como tales.",
      editing:
        "Conservar la arquitectura creativa elegida y dar tiempo para entender cada idea.",
      sound:
        "Mantener la voz inteligible y usar música y efectos al servicio del significado.",
      subtitles:
        "Conservar el texto pronunciado y la sincronización por palabra.",
    },
    sharingReason:
      "La claridad o utilidad de lo explicado; nunca una promesa de viralidad.",
  };
}

export type HumanValuePlan = ReturnType<typeof buildHumanValuePlan>;
export type HumanValueVideo = {
  id: string;
  audio?: { narrationText?: string };
  scenes: Array<{ id: string; content: unknown }>;
};

/** Mechanical checks only. Passing them is not editorial or legal certification. */
export function reviewHumanValue(
  input: SilecKnowledgeInput,
  plan: HumanValuePlan,
  video: HumanValueVideo,
) {
  const blockers: string[] = [];
  const narration = clean(video.audio?.narrationText ?? "");
  const expected = buildHumanValuePlan(input);
  if (JSON.stringify(plan) !== JSON.stringify(expected))
    blockers.push(
      "El plan está desactualizado o fue alterado: vuelva a construir el VideoSpec.",
    );
  if (
    video.id !== input.productionCode ||
    plan.productionCode !== input.productionCode
  )
    blockers.push(
      "La ficha, el plan y el VideoSpec pertenecen a producciones distintas.",
    );
  if (
    !plan.audience.length ||
    !plan.need ||
    !plan.takeaway ||
    !plan.opening ||
    !plan.closing.idea
  )
    blockers.push(
      "Faltan destinatario, necesidad, apertura o conclusión en la fuente.",
    );
  if (new Set(plan.attentionReturn.support.map((item) => item.text)).size < 2)
    blockers.push(
      "El desarrollo requiere al menos dos explicaciones o pasos distintos.",
    );
  const required = [
    plan.opening,
    ...plan.attentionReturn.support.map((item) => item.text),
    plan.takeaway,
    plan.closing.idea,
    plan.closing.cta,
  ].filter(Boolean);
  if (!narration || required.some((text) => !narration.includes(text)))
    blockers.push(
      "El guion no contiene la apertura, desarrollo o cierre previstos.",
    );
  if (!video.scenes.length)
    blockers.push("No hay escenas para comunicar el contenido.");

  // Signals are requests for contextual review, not semantic verdicts.
  const publicText = `${narration} ${JSON.stringify(video.scenes.map((scene) => scene.content))}`;
  const signals: string[] = [];
  if (
    /viral|viralidad|garantiz|infalible|éxito asegurado|likes|seguidores|spam/i.test(
      publicText,
    )
  )
    signals.push(
      "Revisar en contexto las referencias a resultados garantizados, viralidad o interacción.",
    );
  if (
    plan.attentionReturn.support.some(
      (item) => item.text.split(/\s+/).length > 45,
    )
  )
    signals.push(
      "Hay explicaciones largas: revisar claridad y carga de información.",
    );

  const legalIssue = legalReviewIssue(input);
  return {
    version: HUMAN_VALUE_VERSION,
    productionCode: input.productionCode,
    sourceHash: plan.sourceHash,
    automatedStatus: blockers.length ? "blocked" : "structural-checks-passed",
    blockers,
    signals,
    specialistReview: {
      status: legalIssue ? "pending" : "recorded-for-source",
      detail:
        legalIssue ??
        "Existe una revisión vinculada a la ficha fuente; revisar también su puesta en escena.",
    },
    reviewBeforePublication: [
      "Beneficio: ¿el público obtiene algo concreto y pertinente a su necesidad?",
      "Claridad: ¿lenguaje, ejemplo o explicación permiten comprenderlo?",
      "Promesa: ¿la apertura es honesta y el desarrollo la cumple?",
      "Exactitud: revisar hechos, fuentes, vigencia y límites; revisión jurídica especializada cuando corresponda.",
      "Originalidad: contrastar con la memoria editorial y comprobar que aporta una diferencia sustancial.",
      "Experiencia: revisar juntos voz, imágenes, montaje, sonido y subtítulos.",
      "Difusión: sin engaño, spam, interacción artificial ni promesas de viralidad.",
      "Pertinencia: autoridad, comunidad y oferta comercial solo cuando aporten al propósito de la pieza.",
      "Derechos y coherencia: comprobar permisos, licencias, contexto e identidad del proyecto.",
    ],
    publicationApproval: "not-granted-by-this-check",
  };
}
