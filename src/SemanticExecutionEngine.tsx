import React, {useEffect, useMemo, useState} from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
  useVideoConfig,
} from "remotion";

import {CompositionRenderer} from "./lib/onda/composition-renderer";
import type {Composition as OndaComposition} from "./lib/onda/composition";
import {ondaRegistry} from "./components/onda";

type DecisionStatus = "ACCEPT" | "REVIEW" | "REJECT";

type DirectorDecision = {
  event: {
    id: string;
    ruleId: string;
    concept: string;
    startMs: number;
    endMs: number;
    durationMs: number;
  };
  selected: {
    resource: {
      name: string;
      title: string;
      category: string;
    };
    score: number;
  } | null;
  decision: {
    status: DecisionStatus;
    score: number;
  };
};

type DecisionManifest = {
  summary?: {
    productionCode?: string;
    directorVersion?: string;
  };
  decisions: DirectorDecision[];
};

type OndaEntry = {
  at: string;
  for: string;
  component: string;
  props: Record<string, unknown>;
};

const LABELS: Record<string, string> = {
  autoridad: "AUTORIDAD",
  expediente: "EXPEDIENTE",
  argumentos: "ARGUMENTOS",
  prueba: "PRUEBA",
  motivacion: "MOTIVACIÓN",
  "debido-proceso": "DEBIDO PROCESO",
  defensa: "DERECHO A LA DEFENSA",
  decision: "DECISIÓN",
  recurso: "RECURSO",
  plazos: "PLAZOS",
  ignorar: "OMISIÓN",
  vulneracion: "VULNERACIÓN",
  "accion-final": "ACCIÓN JURÍDICA",
  "semantic-filler": "CONTINUIDAD",
};

const PROCESS_STEPS = [
  "AUTORIDAD",
  "EXPEDIENTE",
  "ANÁLISIS",
  "DECISIÓN",
];

const labelFor = (ruleId: string) =>
  LABELS[ruleId] ?? ruleId.replace(/-/g, " ").toUpperCase();

const shorten = (value: string, max = 105) => {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
};

const stageFor = (ruleId: string) => {
  if (ruleId === "autoridad") return 0;
  if (ruleId === "expediente") return 1;

  if (
    ["argumentos", "prueba", "motivacion", "debido-proceso", "defensa"].includes(
      ruleId,
    )
  ) {
    return 2;
  }

  return 3;
};

const slugToComponent: Record<string, string> = {
  "quote-card": "QuoteCard",
  "progress-steps": "ProgressSteps",
  "chapter-card": "ChapterCard",
  "end-card": "EndCard",
  "title-card": "TitleCard",
  timeline: "Timeline",
  callout: "Callout",
  highlight: "Highlight",
  "node-graph": "NodeGraph",
  "spotlight-card": "SpotlightCard",
  "dynamic-grid": "DynamicGrid",
  "mesh-gradient": "MeshGradient",
  spotlight: "Spotlight",
  vignette: "Vignette",
};

const candidateProps = (
  component: string,
  decision: DirectorDecision,
  index: number,
): Record<string, unknown>[] => {
  const label = labelFor(decision.event.ruleId);
  const concept = shorten(decision.event.concept);

  switch (component) {
    case "TitleCard":
      return [
        {title: label, subtitle: concept},
        {title: label},
      ];

    case "QuoteCard":
      return [
        {quote: concept, author: label},
        {quote: label, author: "ANÁLISIS JURÍDICO"},
      ];

    case "ProgressSteps":
      return [
        {
          steps: PROCESS_STEPS,
          current: stageFor(decision.event.ruleId),
        },
      ];

    case "ChapterCard":
      return [
        {
          chapter: label,
          number: String(index + 1).padStart(2, "0"),
        },
        {title: label, number: String(index + 1).padStart(2, "0")},
      ];

    case "EndCard":
      return [
        {
          cta:
            decision.event.ruleId === "accion-final"
              ? "ANALIZA TU CASO"
              : label,
          handles: ["HECHOS · PRUEBA", "NORMA · ESTRATEGIA"],
        },
      ];

    case "Highlight":
      return [
        {text: label},
        {text: concept},
      ];

    case "SpotlightCard":
      return [
        {title: label, subtitle: concept},
        {title: label, body: concept},
        {title: label},
      ];

    case "Callout":
      return [
        {label, text: concept},
        {label},
        {text: label},
      ];

    case "Timeline":
      return [
        {
          items: [
            {label: "AUTORIDAD"},
            {label: "EXPEDIENTE"},
            {label: "ANÁLISIS"},
            {label: "DECISIÓN"},
          ],
        },
        {
          events: [
            {label: "AUTORIDAD"},
            {label: "EXPEDIENTE"},
            {label: "ANÁLISIS"},
            {label: "DECISIÓN"},
          ],
        },
      ];

    case "NodeGraph":
      return [
        {
          hub: label,
          nodes: [
            {label: "HECHOS"},
            {label: "PRUEBA"},
            {label: "NORMA"},
            {label: "DECISIÓN"},
          ],
        },
        {
          center: label,
          nodes: ["HECHOS", "PRUEBA", "NORMA", "DECISIÓN"],
        },
      ];

    case "DynamicGrid":
    case "MeshGradient":
    case "Spotlight":
    case "Vignette":
      return [{}];

    default:
      return [{}];
  }
};

const validProps = (
  component: string,
  variants: Record<string, unknown>[],
): Record<string, unknown> | null => {
  const registered =
    ondaRegistry[component as keyof typeof ondaRegistry];

  if (!registered) {
    return null;
  }

  for (const props of variants) {
    const result = registered.schema.safeParse(props);

    if (result.success) {
      return result.data as Record<string, unknown>;
    }
  }

  return null;
};

const preferredComponents = (
  decision: DirectorDecision,
): string[] => {
  const ruleId = decision.event.ruleId;

  const original =
    decision.selected?.resource.name &&
    slugToComponent[decision.selected.resource.name]
      ? slugToComponent[decision.selected.resource.name]
      : null;

  const semantic =
    ruleId === "expediente"
      ? ["TitleCard", "SpotlightCard", "Highlight"]
      : ruleId === "autoridad"
        ? ["SpotlightCard", "TitleCard", "QuoteCard"]
        : ["argumentos", "prueba"].includes(ruleId)
          ? ["NodeGraph", "Highlight", "QuoteCard"]
          : ["recurso", "plazos"].includes(ruleId)
            ? ["Timeline", "ProgressSteps", "TitleCard"]
            : ["motivacion", "debido-proceso", "defensa"].includes(ruleId)
              ? ["Highlight", "SpotlightCard", "QuoteCard"]
              : ruleId === "decision"
                ? ["Timeline", "TitleCard", "SpotlightCard"]
                : ruleId === "accion-final"
                  ? ["EndCard", "TitleCard"]
                  : ruleId === "semantic-filler"
                    ? []
                    : ["TitleCard", "QuoteCard"];

  return original
    ? [original, ...semantic.filter((name) => name !== original)]
    : semantic;
};

const buildForegroundEntry = (
  decision: DirectorDecision,
  index: number,
): OndaEntry | null => {
  if (decision.decision.status === "REJECT") {
    return null;
  }

  for (const component of preferredComponents(decision)) {
    const props = validProps(
      component,
      candidateProps(component, decision, index),
    );

    if (!props) {
      continue;
    }

    return {
      at: `${Math.max(0, Math.round(decision.event.startMs))}ms`,
      for: `${Math.max(1000, Math.round(decision.event.durationMs))}ms`,
      component,
      props,
    };
  }

  return null;
};

const buildAtmosphereEntry = (
  decision: DirectorDecision,
  index: number,
): OndaEntry | null => {
  const choices =
    index % 2 === 0
      ? ["MeshGradient", "DynamicGrid"]
      : ["DynamicGrid", "MeshGradient"];

  for (const component of choices) {
    const props = validProps(component, [{}]);

    if (!props) {
      continue;
    }

    return {
      at: `${Math.max(0, Math.round(decision.event.startMs))}ms`,
      for: `${Math.max(1000, Math.round(decision.event.durationMs))}ms`,
      component,
      props,
    };
  }

  return null;
};

const buildFinishingEntry = (
  decision: DirectorDecision,
  index: number,
): OndaEntry | null => {
  const component =
    index % 2 === 0 ? "Vignette" : "Spotlight";

  const props = validProps(component, [{}]);

  if (!props) {
    return null;
  }

  return {
    at: `${Math.max(0, Math.round(decision.event.startMs))}ms`,
    for: `${Math.max(1000, Math.round(decision.event.durationMs))}ms`,
    component,
    props,
  };
};

export function SemanticExecutionEngine({
  productionCode,
}: {
  productionCode: string;
}) {
  const {fps, width, height} = useVideoConfig();

  const [manifest, setManifest] =
    useState<DecisionManifest | null>(null);

  const [renderHandle] = useState(() =>
    delayRender("Cargando Director V3.8.2"),
  );

  useEffect(() => {
    fetch(
      staticFile(
        `generated/${productionCode}-semantic-decisions.json`,
      ),
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Semantic decisions HTTP ${response.status}`,
          );
        }

        return response.json();
      })
      .then((data: DecisionManifest) => {
        if (!Array.isArray(data.decisions)) {
          throw new Error(
            "Semantic decisions manifest inválido",
          );
        }

        setManifest(data);
        continueRender(renderHandle);
      })
      .catch((error: unknown) => {
        cancelRender(
          error instanceof Error
            ? error
            : new Error(String(error)),
        );
      });
  }, [renderHandle, productionCode]);

  const composition = useMemo<OndaComposition | null>(() => {
    if (!manifest) {
      return null;
    }

    const usable = manifest.decisions.filter(
      (decision) =>
        decision.decision.status !== "REJECT" &&
        decision.event.durationMs > 0,
    );

    const atmosphere = usable
      .map(buildAtmosphereEntry)
      .filter((entry): entry is OndaEntry => entry !== null);

    const foreground = usable
      .map(buildForegroundEntry)
      .filter((entry): entry is OndaEntry => entry !== null);

    const finishing = usable
      .map(buildFinishingEntry)
      .filter((entry): entry is OndaEntry => entry !== null);

    void atmosphere;
    void finishing;

    return {
      fps,
      width,
      height,
      tracks: [
        {entries: foreground},
      ],
    } as OndaComposition;
  }, [manifest, fps, width, height]);

  if (!composition) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 42,
      }}
    >
      <CompositionRenderer
        composition={composition}
        registry={ondaRegistry}
      />
    </AbsoluteFill>
  );
}
