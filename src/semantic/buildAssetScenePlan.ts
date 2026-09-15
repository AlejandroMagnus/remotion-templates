import type {SemanticEvent} from "../buildSemanticEvents";

export type VisualRoute =
  | "REALISTIC_SCENE"
  | "DOCUMENT_OBJECT"
  | "ONDA_GRAPHIC"
  | "CONTINUITY";

export type AssetScenePlanItem = {
  id: string;
  ruleId: string;
  concept: string;

  startMs: number;
  endMs: number;
  durationMs: number;

  route: VisualRoute;

  visualIntent: string;
  generationPrompt: string;

  motion: {
    camera: string;
    transition: string;
  };

  constraints: {
    vertical: true;
    safeFrame: true;
    noSlideshow: true;
  };
};

const chooseRoute = (
  event: SemanticEvent,
): VisualRoute => {
  switch (event.ruleId) {
    // ========================================
    // HIGH TICKET
    // ========================================

    case "controversia-alto-valor":
    case "arbitraje":
    case "conflicto-administrativo":
    case "patrimonio":
      return "REALISTIC_SCENE";

    case "contratos-high-ticket":
    case "control-constitucional":
      return "DOCUMENT_OBJECT";

    // ========================================
    // SILEC NATIVO
    // ========================================

    case "hechos":
    case "teoria-caso":
    case "estrategia-juridica":
    case "riesgos":
    case "diagnostico":
      return "REALISTIC_SCENE";

    case "norma":
    case "jurisprudencia":
      return "DOCUMENT_OBJECT";

    case "objetivo":
      return "ONDA_GRAPHIC";

    // ========================================
    // SEMÁNTICA GENERAL VALIDADA
    // ========================================

    case "autoridad":
      return "REALISTIC_SCENE";

    case "expediente":
    case "recurso":
    case "motivacion":
    case "decision":
      return "DOCUMENT_OBJECT";

    case "argumentos":
    case "prueba":
    case "debido-proceso":
    case "defensa":
    case "plazos":
    case "ignorar":
    case "vulneracion":
      return "ONDA_GRAPHIC";

    case "semantic-filler":
      return "CONTINUITY";

    default:
      return "ONDA_GRAPHIC";
  }
};

const visualIntentFor = (
  event: SemanticEvent,
  route: VisualRoute,
): string => {
  if (route === "REALISTIC_SCENE") {
    return (
      "Escena realista, cinematográfica y profesional " +
      `que represente directamente: ${event.concept}`
    );
  }

  if (route === "DOCUMENT_OBJECT") {
    return (
      "Documento, expediente, contrato u objeto jurídico " +
      `visualmente reconocible que represente: ${event.concept}`
    );
  }

  if (route === "CONTINUITY") {
    return (
      "Continuidad audiovisual coherente entre unidades " +
      "narrativas, sin introducir un sujeto irrelevante"
    );
  }

  return (
    "Motion graphic profesional y sobrio que explique " +
    `visualmente: ${event.concept}`

  );
};

    const generationPromptFor = (
  event: SemanticEvent,
  route: VisualRoute,
): string => {
  const base =
    "Premium cinematic legal visual, professional, credible, " +
    "high-end editorial aesthetic, realistic lighting, " +
    "strong composition, no cheap stock look, no slideshow, " +
    "no floating text, no irrelevant legal clichés.";

  if (route === "REALISTIC_SCENE") {
    return (
      `${base} Create a realistic professional scene representing: ` +
      `${event.concept}. Emphasize decision-making, seriousness, ` +
      "economic relevance and strategic legal analysis."
    );
  }

  if (route === "DOCUMENT_OBJECT") {
    return (
      `${base} Focus on a believable legal document, contract, ` +
      `case file or juridical object representing: ${event.concept}. ` +
      "Document must feel authentic, important and professionally handled."
    );
  }

  if (route === "CONTINUITY") {
    return (
      `${base} Create visual continuity connected to the previous ` +
      `narrative idea. Context: ${event.concept}. Preserve visual rhythm ` +
      "without repeating the previous asset."
    );
  }

  return (
    `${base} Create a restrained premium information graphic ` +
    `representing: ${event.concept}. Prioritize clarity, hierarchy ` +
    "and strategic meaning."
  );
};

const motionFor = (
  event: SemanticEvent,
  route: VisualRoute,
): {
  camera: string;
  transition: string;
} => {
  switch (event.ruleId) {
    case "controversia-alto-valor":
      return {
        camera: "slow-controlled-push-in",
        transition: "soft-crossfade",
      };

    case "contratos-high-ticket":
      return {
        camera: "document-detail-horizontal-pan",
        transition: "precision-dissolve",
      };

    case "arbitraje":
      return {
        camera: "strategic-lateral-drift",
        transition: "controlled-crossfade",
      };

    case "conflicto-administrativo":
      return {
        camera: "measured-right-to-left-pan",
        transition: "soft-dissolve",
      };

    case "patrimonio":
      return {
        camera: "slow-converging-push",
        transition: "premium-crossfade",
      };

    case "control-constitucional":
      return {
        camera: "subtle-vertical-rise",
        transition: "restrained-fade",
      };

    case "hechos":
      return {
        camera: "investigative-horizontal-scan",
        transition: "soft-crossfade",
      };

    case "prueba":
      return {
        camera: "evidence-detail-examination",
        transition: "precision-dissolve",
      };

    case "norma":
    case "jurisprudencia":
      return {
        camera: "slow-document-focus",
        transition: "soft-dissolve",
      };

    case "teoria-caso":
    case "estrategia-juridica":
      return {
        camera: "strategic-convergence",
        transition: "controlled-crossfade",
      };

    case "riesgos":
      return {
        camera: "slow-tension-push",
        transition: "dark-soft-dissolve",
      };

    case "decision":
      return {
        camera: "decision-convergence",
        transition: "stable-crossfade",
      };

    default:
      if (route === "REALISTIC_SCENE") {
        return {
          camera: "slow-cinematic-drift",
          transition: "soft-crossfade",
        };
      }

      if (route === "DOCUMENT_OBJECT") {
        return {
          camera: "controlled-detail-pan",
          transition: "precision-dissolve",
        };
      }

      if (route === "CONTINUITY") {
        return {
          camera: "minimal-continuity-drift",
          transition: "long-crossfade",
        };
      }

      return {
        camera: "restrained-motion",
        transition: "soft-dissolve",
      };
  }
};

export function buildAssetScenePlan(
  events: SemanticEvent[],
): AssetScenePlanItem[] {
  return events.map((event, index) => {
    const route =
      chooseRoute(event);

    const startMs =
      Math.max(
        0,
        Number(event.startMs),
      );

    const endMs =
      Math.max(
        startMs + 1,
        Number(event.endMs),
      );

    return {
      id:
        `scene-${String(index + 1).padStart(2, "0")}`,

      ruleId:
        event.ruleId,

      concept:
        event.concept,

      startMs,
      endMs,

      durationMs:
        endMs - startMs,

      route,

      visualIntent:
        visualIntentFor(
          event,
          route,
        ),

      generationPrompt:
        generationPromptFor(
          event,
          route,
        ),

      motion:
        motionFor(
          event,
          route,
        ),

      constraints: {
        vertical: true,
        safeFrame: true,
        noSlideshow: true,
      },
    };
  });
}
