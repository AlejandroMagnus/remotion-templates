import React from "react";

import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export function ProfessionalSignature() {
  const frame = useCurrentFrame();

  const {
    fps,
    durationInFrames,
  } = useVideoConfig();

  const signatureFrames =
    Math.round(fps * 1.8);

  const start =
    Math.max(
      0,
      durationInFrames -
        signatureFrames,
    );

  if (frame < start) {
    return null;
  }

  const localFrame =
    frame - start;

  const fadeInFrames =
    Math.round(fps * 0.45);

  const opacity =
    interpolate(
      localFrame,
      [
        0,
        fadeInFrames,
        signatureFrames,
      ],
      [0, 1, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

  const translateY =
    interpolate(
      localFrame,
      [0, fadeInFrames],
      [18, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

  return (
    <AbsoluteFill
      style={{
        zIndex: 80,
        justifyContent: "center",
        alignItems: "center",

        background:
          "rgba(0,0,0,0.54)",

        opacity,
      }}
    >
      <div
        style={{
          transform:
            `translateY(${translateY}px)`,

          width: "84%",

          textAlign: "center",

          fontFamily:
            "Arial, Helvetica, sans-serif",

          color: "#fff",
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.15,
          }}
        >
          Alejandro Riveros, MSc., PhD.
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 30,
            fontWeight: 500,
            opacity: 0.94,
          }}
        >
          Estrategia Jurídica Integral
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 25,
            fontWeight: 400,
            opacity: 0.78,
          }}
        >
          Diagnóstico antes de decidir.
        </div>
      </div>
    </AbsoluteFill>
  );
}
