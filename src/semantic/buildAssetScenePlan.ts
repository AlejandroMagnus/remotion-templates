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
    return `Escena realista y cinematográfica que represente: ${event.concept}`;
  }

  if (route === "DOCUMENT_OBJECT") {
    return `Documento u objeto jurídico visualmente reconocible que represente: ${event.concept}`;
  }

  if (route === "CONTINUITY") {
    return `Continuidad audiovisual coherente entre unidades narrativas, sin pantalla vacía`;
  }

  return `Motion graphic profesional que explique visualmente: ${event.concept}`;
};

const promptFor = (
  event: SemanticEvent,
  route: VisualRoute,
): string => {
  const base =
    "vertical 9:16, cinematic lighting, realistic depth, premium legal visual language, clean composition, safe frame, no stock-photo look, no slideshow";

  switch (route) {
    case "REALISTIC_SCENE":
      return `${base}. Professional institutional office. Authority carefully reviewing a legal case file before making a decision. Natural hands, realistic desk, subtle camera movement, documentary realism. Concept: ${event.concept}.`;

    case "DOCUMENT_OBJECT":
      return `${base}. Create a believable Bolivian legal document/object relevant to: ${event.concept}. Clear physical paper or digital dossier, legible semantic title when useful, elegant close-up, subtle parallax and camera movement.`;

    case "ONDA_GRAPHIC":
      return `${base}. Design a restrained premium motion-graphic treatment for: ${event.concept}. Use hierarchy, diagrams, highlights or timeline only when they improve comprehension.`;

    case "CONTINUITY":
      return `${base}. Create calm visual continuity between adjacent legal concepts. Maintain narrative context and visual identity; avoid introducing a new unrelated subject.`;
  }
};

export const buildAssetScenePlan = (
  events: SemanticEvent[],
): AssetScenePlanItem[] =>
  events.map((event) => {
    const route =
      chooseRoute(event);

    return {
      id: `asset-plan-${event.id}`,
      ruleId: event.ruleId,
      concept: event.concept,
      startMs: event.startMs,
      endMs: event.endMs,
      durationMs: event.durationMs,

      route,

      visualIntent:
        visualIntentFor(
          event,
          route,
        ),

      generationPrompt:
        promptFor(
          event,
          route,
        ),

      motion: {
        camera:
          route === "REALISTIC_SCENE"
            ? "slow push-in / subtle handheld realism"
            : route === "DOCUMENT_OBJECT"
              ? "slow parallax / controlled close-up"
              : "controlled graphic motion",

        transition:
          "semantic continuity; no arbitrary cut",
      },

      constraints: {
        vertical: true,
        safeFrame: true,
        noSlideshow: true,
      },
    };
  });
