import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
  useVideoConfig,
} from "remotion";

import {
  CompositionRenderer,
} from "./lib/onda/composition-renderer";

import type {
  Composition as OndaComposition,
} from "./lib/onda/composition";

import {
  ondaRegistry,
} from "./components/onda";

type DecisionStatus =
  | "ACCEPT"
  | "REVIEW"
  | "REJECT";

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

const ONDA_COMPONENTS: Record<
  string,
  string
> = {
  "quote-card": "QuoteCard",
  "progress-steps": "ProgressSteps",
  "chapter-card": "ChapterCard",
  "end-card": "EndCard",
};

const LABELS: Record<
  string,
  string
> = {
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

const STAGE_INDEX: Record<
  string,
  number
> = {
  autoridad: 0,
  expediente: 1,
  argumentos: 2,
  prueba: 2,
  motivacion: 2,
  "debido-proceso": 2,
  defensa: 2,
  decision: 3,
  recurso: 3,
  plazos: 3,
  "accion-final": 3,
};

const labelFor = (
  ruleId: string,
) =>
  LABELS[ruleId] ??
  ruleId
    .replace(/-/g, " ")
    .toUpperCase();

const shorten = (
  value: string,
  max = 110,
) => {
  const clean =
    value
      .replace(/\s+/g, " ")
      .trim();

  if (
    clean.length <= max
  ) {
    return clean;
  }

  return `${clean.slice(
    0,
    max - 1,
  )}…`;
};

const buildProps = (
  decision: DirectorDecision,
  index: number,
): Record<
  string,
  unknown
> => {
  const slug =
    decision.selected
      ?.resource.name;

  const label =
    labelFor(
      decision.event.ruleId,
    );

  const concept =
    shorten(
      decision.event.concept,
    );

  if (
    slug === "quote-card"
  ) {
    return {
      quote:
        concept ||
        label,

      author:
        label,

      role:
        "ANÁLISIS JURÍDICO",

      accent: true,

      quoteFontSize: 50,

      authorFontSize: 21,

      color:
        "#f5efe3",

      authorColor:
        "#abb7ae",

      accentColor:
        "#a8cfb8",

      placement:
        "center",
    };
  }

  if (
    slug ===
    "progress-steps"
  ) {
    return {
      steps: [
        "AUTORIDAD",
        "EXPEDIENTE",
        "ANÁLISIS",
        "DECISIÓN",
      ],

      current:
        STAGE_INDEX[
          decision.event.ruleId
        ] ?? 2,

      accentColor:
        "#a8cfb8",

      dimColor:
        "#30483e",

      labelColor:
        "#f5efe3",

      fontSize: 25,

      width: 800,

      placement:
        "center",
    };
  }

  if (
    slug ===
    "chapter-card"
  ) {
    return {
      chapter:
        label,

      number:
        String(
          index + 1,
        ).padStart(
          2,
          "0",
        ),

      accent: true,

      numberColor:
        "#a8cfb8",

      color:
        "#f5efe3",

      subtitleColor:
        "#abb7ae",

      numberFontSize: 27,

      titleFontSize: 76,

      placement:
        "center",
    };
  }

  if (
    slug === "end-card"
  ) {
    return {
      cta:
        decision.event
          .ruleId ===
        "accion-final"
          ? "ANALIZA TU CASO"
          : label,

      handles:
        [
          "HECHOS · PRUEBA",
          "NORMA · ESTRATEGIA",
        ],

      accent: true,

      ctaFontSize: 74,

      handlesFontSize: 21,

      color:
        "#f5efe3",

      handlesColor:
        "#abb7ae",

      accentColor:
        "#a8cfb8",

      placement:
        "center",
    };
  }

  return {};
};

export function SemanticExecutionEngine() {
  const {
    fps,
    width,
    height,
  } =
    useVideoConfig();

  const [
    manifest,
    setManifest,
  ] =
    useState<
      DecisionManifest | null
    >(null);

  const [
    renderHandle,
  ] =
    useState(() =>
      delayRender(
        "Cargando decisiones del Director V3.8",
      ),
    );

  useEffect(() => {
    fetch(
      staticFile(
        "generated/video-juridico-001-semantic-decisions.json",
      ),
    )
      .then(
        async (
          response,
        ) => {
          if (
            !response.ok
          ) {
            throw new Error(
              `Semantic decisions HTTP ${response.status}`,
            );
          }

          return response.json();
        },
      )
      .then(
        (
          data:
            DecisionManifest,
        ) => {
          if (
            !Array.isArray(
              data.decisions,
            )
          ) {
            throw new Error(
              "Semantic decisions manifest inválido",
            );
          }

          setManifest(
            data,
          );

          continueRender(
            renderHandle,
          );
        },
      )
      .catch(
        (
          error:
            unknown,
        ) => {
          cancelRender(
            error instanceof
              Error
              ? error
              : new Error(
                  String(
                    error,
                  ),
                ),
          );
        },
      );
  }, [renderHandle]);

  const composition =
    useMemo<
      OndaComposition | null
    >(() => {
      if (!manifest) {
        return null;
      }

      const usable =
        manifest.decisions.filter(
          (decision) => {
            const slug =
              decision.selected
                ?.resource.name;

            return (
              decision.decision
                .status !==
                "REJECT" &&
              typeof slug ===
                "string" &&
              Boolean(
                ONDA_COMPONENTS[
                  slug
                ],
              ) &&
              decision.event
                .durationMs >
                0
            );
          },
        );

      const entries =
        usable.map(
          (
            decision,
            index,
          ) => {
            const slug =
              decision.selected!
                .resource.name;

            return {
              at:
                `${Math.max(
                  0,
                  Math.round(
                    decision.event
                      .startMs,
                  ),
                )}ms`,

              for:
                `${Math.max(
                  900,
                  Math.round(
                    decision.event
                      .durationMs,
                  ),
                )}ms`,

              component:
                ONDA_COMPONENTS[
                  slug
                ],

              props:
                buildProps(
                  decision,
                  index,
                ),
            };
          },
        );

      return {
        fps,
        width,
        height,

        tracks: [
          {
            entries,
          },
        ],
      } as OndaComposition;
    }, [
      manifest,
      fps,
      width,
      height,
    ]);

  if (!composition) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        pointerEvents:
          "none",

        zIndex: 42,
      }}
    >
      <CompositionRenderer
        composition={
          composition
        }
        registry={
          ondaRegistry
        }
      />
    </AbsoluteFill>
  );
}
