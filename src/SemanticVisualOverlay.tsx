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
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  buildSemanticEvents,
  type SemanticEvent,
  type WordTiming,
} from "./buildSemanticEvents";

type Timeline = {
  words: WordTiming[];
};

const panelStyle: React.CSSProperties = {
  width: 790,
  minHeight: 610,
  borderRadius: 46,
  background: "rgba(24,31,28,0.94)",
  border: "2px solid rgba(168,207,184,0.34)",
  boxShadow: "0 30px 100px rgba(0,0,0,0.36)",
  padding: 58,
  color: "#f5efe3",
  fontFamily: "Inter, Arial, sans-serif",
  boxSizing: "border-box",
};

function RecursoVisual() {
  return (
    <div style={panelStyle}>
      <div
        style={{
          fontSize: 28,
          color: "#abb7ae",
          marginBottom: 36,
          letterSpacing: 2,
        }}
      >
        PROCEDIMIENTO ADMINISTRATIVO
      </div>

      <div
        style={{
          background: "#f5efe3",
          color: "#18241f",
          borderRadius: 28,
          padding: "44px 42px",
          minHeight: 360,
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          RECURSO ADMINISTRATIVO
        </div>

        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            style={{
              height: 12,
              width: `${86 - item * 8}%`,
              background: "#c9d0cb",
              borderRadius: 8,
              marginTop: 28,
            }}
          />
        ))}

        <div
          style={{
            position: "absolute",
            right: 34,
            bottom: 40,
            transform: "rotate(-10deg)",
            border: "8px solid #c96f58",
            borderRadius: 18,
            padding: "14px 24px",
            color: "#c96f58",
            fontWeight: 900,
            fontSize: 40,
          }}
        >
          RECHAZADO
        </div>
      </div>
    </div>
  );
}

function MotivacionVisual() {
  return (
    <div style={panelStyle}>
      <div
        style={{
          fontSize: 54,
          fontWeight: 800,
        }}
      >
        MOTIVACIÓN
      </div>

      <div
        style={{
          fontSize: 28,
          color: "#abb7ae",
          marginTop: 14,
          marginBottom: 46,
        }}
      >
        La decisión debe permitir comprender sus razones.
      </div>

      <div
        style={{
          background: "#f5efe3",
          borderRadius: 28,
          padding: 40,
        }}
      >
        {[80, 92, 68, 88, 76].map(
          (width, index) => (
            <div
              key={index}
              style={{
                height:
                  index === 2 ? 28 : 13,
                width: `${width}%`,
                borderRadius: 8,
                marginBottom: 24,
                background:
                  index === 2
                    ? "#ec967d"
                    : "#bdc7c0",
              }}
            />
          ),
        )}
      </div>

      <div
        style={{
          marginTop: 38,
          fontSize: 30,
          color: "#a8cfb8",
          fontWeight: 700,
        }}
      >
        ARGUMENTO → RAZÓN → DECISIÓN
      </div>
    </div>
  );
}

function EvidenciaVisual() {
  const nodes = [
    ["ARGUMENTOS", "#ec967d"],
    ["PRUEBA", "#a8cfb8"],
    ["DECISIÓN", "#f5efe3"],
  ];

  return (
    <div style={panelStyle}>
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
        }}
      >
        ANÁLISIS JURÍDICO
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 94,
        }}
      >
        {nodes.map(
          ([label, color], index) => (
            <React.Fragment key={label}>
              <div
                style={{
                  width: 188,
                  height: 188,
                  borderRadius: "50%",
                  border: `6px solid ${color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: 18,
                  fontSize: 26,
                  fontWeight: 800,
                  boxSizing: "border-box",
                }}
              >
                {label}
              </div>

              {index <
              nodes.length - 1 ? (
                <div
                  style={{
                    color: "#a8cfb8",
                    fontSize: 52,
                    fontWeight: 800,
                  }}
                >
                  →
                </div>
              ) : null}
            </React.Fragment>
          ),
        )}
      </div>

      <div
        style={{
          marginTop: 82,
          padding: 28,
          borderRadius: 24,
          background:
            "rgba(168,207,184,0.10)",
          fontSize: 29,
          textAlign: "center",
        }}
      >
        Una conclusión sólida debe poder reconstruirse.
      </div>
    </div>
  );
}

function DebidoProcesoVisual() {
  return (
    <div
      style={{
        ...panelStyle,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 220,
          height: 250,
          margin: "10px auto 42px",
          border:
            "10px solid #a8cfb8",
          borderRadius:
            "48% 48% 54% 54%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 82,
          fontWeight: 900,
          color: "#a8cfb8",
        }}
      >
        §
      </div>

      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
        }}
      >
        DEBIDO PROCESO
      </div>

      <div
        style={{
          marginTop: 30,
          fontSize: 30,
          lineHeight: 1.4,
          color: "#abb7ae",
        }}
      >
        Una omisión relevante puede afectar la validez de la
        decisión.
      </div>
    </div>
  );
}

function ExpedienteVisual() {
  return (
    <div style={panelStyle}>
      <div
        style={{
          fontSize: 50,
          fontWeight: 800,
        }}
      >
        REVISAR EL EXPEDIENTE
      </div>

      <div
        style={{
          position: "relative",
          height: 390,
          marginTop: 54,
        }}
      >
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              width: 560,
              height: 300,
              left: 55 + index * 34,
              top: index * 30,
              borderRadius: 26,
              background:
                index === 2
                  ? "#f5efe3"
                  : "#cbd6cf",
              border:
                "2px solid rgba(24,36,31,0.16)",
              padding: 34,
              boxSizing:
                "border-box",
            }}
          >
            {index === 2 ? (
              <>
                <div
                  style={{
                    color:
                      "#18241f",
                    fontSize: 28,
                    fontWeight: 800,
                  }}
                >
                  EXPEDIENTE
                </div>

                {[90, 72, 84, 62].map(
                  (width, line) => (
                    <div
                      key={line}
                      style={{
                        width:
                          `${width}%`,
                        height: 11,
                        background:
                          "#bbc4be",
                        marginTop: 22,
                        borderRadius: 8,
                      }}
                    />
                  ),
                )}
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlazosVisual({
  frame,
  fps,
}: {
  frame: number;
  fps: number;
}) {
  const rotation = interpolate(
    frame,
    [0, fps * 2],
    [0, 130],
    {
      extrapolateRight: "clamp",
    },
  );

  return (
    <div style={panelStyle}>
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
        }}
      >
        LOS PLAZOS CORREN
      </div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-around",
          alignItems: "center",
          marginTop: 72,
        }}
      >
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: "50%",
            border:
              "10px solid #ec967d",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 8,
              height: 90,
              background:
                "#f5efe3",
              left: 121,
              top: 40,
              transformOrigin:
                "bottom center",
              transform:
                `rotate(${rotation}deg)`,
              borderRadius: 8,
            }}
          />

          <div
            style={{
              position: "absolute",
              width: 12,
              height: 12,
              borderRadius:
                "50%",
              background:
                "#f5efe3",
              left: 119,
              top: 124,
            }}
          />
        </div>

        <div
          style={{
            width: 280,
            borderRadius: 30,
            overflow: "hidden",
            background:
              "#f5efe3",
            color: "#18241f",
          }}
        >
          <div
            style={{
              padding:
                "18px 20px",
              background:
                "#ec967d",
              color: "#171c1a",
              fontSize: 26,
              fontWeight: 800,
              textAlign:
                "center",
            }}
          >
            PLAZO
          </div>

          <div
            style={{
              fontSize: 100,
              fontWeight: 900,
              textAlign:
                "center",
              padding: 40,
            }}
          >
            !
          </div>
        </div>
      </div>
    </div>
  );
}

function CtaVisual() {
  return (
    <div
      style={{
        ...panelStyle,
        textAlign: "center",
        background:
          "linear-gradient(145deg, rgba(34,42,39,0.98), rgba(48,72,62,0.98))",
      }}
    >
      <div
        style={{
          fontSize: 26,
          color: "#a8cfb8",
          letterSpacing: 3,
          fontWeight: 800,
        }}
      >
        ANÁLISIS ESTRATÉGICO
      </div>

      <div
        style={{
          fontSize: 64,
          lineHeight: 1.05,
          fontWeight: 900,
          marginTop: 50,
        }}
      >
        No dejes vencer tus plazos
      </div>

      <div
        style={{
          marginTop: 48,
          fontSize: 31,
          color: "#abb7ae",
          lineHeight: 1.45,
        }}
      >
        Cada expediente exige revisar hechos, argumentos,
        prueba y resolución.
      </div>

      <div
        style={{
          display:
            "inline-block",
          marginTop: 60,
          padding:
            "22px 38px",
          borderRadius: 24,
          background:
            "#ec967d",
          color: "#171c1a",
          fontSize: 30,
          fontWeight: 900,
        }}
      >
        ANALIZA TU CASO
      </div>
    </div>
  );
}

function SemanticEventVisual({
  event,
  eventFrame,
  fps,
}: {
  event: SemanticEvent;
  eventFrame: number;
  fps: number;
}) {
  if (
    event.ruleId === "recurso" ||
    event.ruleId === "ignorar" ||
    event.ruleId === "vulneracion"
  ) {
    return <RecursoVisual />;
  }

  if (
    event.ruleId === "motivacion" ||
    event.ruleId === "decision"
  ) {
    return <MotivacionVisual />;
  }

  if (
    event.ruleId === "argumentos" ||
    event.ruleId === "prueba"
  ) {
    return <EvidenciaVisual />;
  }

  if (
    event.ruleId === "debido-proceso" ||
    event.ruleId === "defensa"
  ) {
    return <DebidoProcesoVisual />;
  }

  if (
    event.ruleId === "expediente" ||
    event.ruleId === "autoridad"
  ) {
    return <ExpedienteVisual />;
  }

  if (event.ruleId === "plazos") {
    return (
      <PlazosVisual
        frame={eventFrame}
        fps={fps}
      />
    );
  }

  if (
    event.ruleId ===
      "accion-final" ||
    event.visualType === "cta"
  ) {
    return <CtaVisual />;
  }

  if (
    event.visualType ===
    "evidence"
  ) {
    return <EvidenciaVisual />;
  }

  if (
    event.visualType ===
    "process"
  ) {
    return <DebidoProcesoVisual />;
  }

  if (
    event.visualType ===
    "warning"
  ) {
    return <RecursoVisual />;
  }

  if (
    event.visualType ===
    "document"
  ) {
    return <MotivacionVisual />;
  }

  return <ExpedienteVisual />;
}

export function SemanticVisualOverlay() {
  const frame =
    useCurrentFrame();

  const {fps} =
    useVideoConfig();

  const [
    timeline,
    setTimeline,
  ] =
    useState<Timeline | null>(
      null,
    );

  const [renderHandle] =
    useState(() =>
      delayRender(
        "Cargando timeline semantico V3",
      ),
    );

  useEffect(() => {
    fetch(
      staticFile(
        "generated/video-juridico-001-timeline.json",
      ),
    )
      .then(
        async (response) => {
          if (!response.ok) {
            throw new Error(
              `Timeline V3 HTTP ${response.status}`,
            );
          }

          return response.json();
        },
      )
      .then(
        (data: Timeline) => {
          if (
            !Array.isArray(
              data.words,
            ) ||
            data.words.length ===
              0
          ) {
            throw new Error(
              "Timeline V3 sin palabras",
            );
          }

          setTimeline(data);

          continueRender(
            renderHandle,
          );
        },
      )
      .catch(
        (error: unknown) => {
          cancelRender(
            error instanceof Error
              ? error
              : new Error(
                  String(error),
                ),
          );
        },
      );
  }, [renderHandle]);

  const semanticEvents =
    useMemo(() => {
      if (!timeline) {
        return [];
      }

      return buildSemanticEvents(
        timeline.words,
      );
    }, [timeline]);

  const nowMs =
    (frame / fps) * 1000;

  const activeEvent =
    useMemo<
      SemanticEvent | null
    >(() => {
      const candidates =
        semanticEvents
          .filter(
            (event) =>
              nowMs >=
                event.startMs &&
              nowMs <
                event.endMs,
          )
          .sort((a, b) => {
            if (
              a.priority !==
              b.priority
            ) {
              return (
                b.priority -
                a.priority
              );
            }

            return (
              b.startMs -
              a.startMs
            );
          });

      return (
        candidates[0] ??
        null
      );
    }, [
      semanticEvents,
      nowMs,
    ]);

  if (!activeEvent) {
    return null;
  }

  const eventFrame =
    Math.max(
      0,
      Math.round(
        ((nowMs -
          activeEvent.startMs) /
          1000) *
          fps,
      ),
    );

  const entrance =
    spring({
      frame: eventFrame,
      fps,
      config: {
        damping: 18,
        stiffness: 120,
        mass: 0.9,
      },
    });

  const opacity =
    interpolate(
      entrance,
      [0, 1],
      [0, 1],
    );

  const translateY =
    interpolate(
      entrance,
      [0, 1],
      [55, 0],
    );

  const scale =
    interpolate(
      entrance,
      [0, 1],
      [0.94, 1],
    );

  return (
    <AbsoluteFill
      style={{
        pointerEvents:
          "none",
        zIndex: 40,
        alignItems:
          "center",
        justifyContent:
          "center",
        paddingBottom: 280,
      }}
    >
      <div
        style={{
          opacity,
          transform:
            `translateY(${translateY}px) scale(${scale})`,
        }}
      >
        <SemanticEventVisual
          event={activeEvent}
          eventFrame={
            eventFrame
          }
          fps={fps}
        />
      </div>
    </AbsoluteFill>
  );
      }
