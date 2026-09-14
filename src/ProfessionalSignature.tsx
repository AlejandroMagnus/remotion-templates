import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const ENTER_SECONDS = 0.45;
const STABLE_SECONDS = 3;
const SAFETY_SECONDS = 0.5;

export const ProfessionalSignature: React.FC = () => {
  const frame = useCurrentFrame();

  const {
    fps,
    durationInFrames,
  } = useVideoConfig();

  const enterFrames =
    Math.round(ENTER_SECONDS * fps);

  const stableFrames =
    Math.round(STABLE_SECONDS * fps);

  const safetyFrames =
    Math.round(SAFETY_SECONDS * fps);

  const totalFrames =
    enterFrames +
    stableFrames +
    safetyFrames;

  const startFrame =
    Math.max(
      0,
      durationInFrames - totalFrames,
    );

  const stableStart =
    startFrame + enterFrames;

  const stableEnd =
    stableStart + stableFrames;

  const endFrame =
    durationInFrames;

  const opacityIn =
    interpolate(
      frame,
      [startFrame, stableStart],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

  const opacityOut =
    interpolate(
      frame,
      [stableEnd, endFrame],
      [1, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

  const opacity =
    Math.min(
      opacityIn,
      opacityOut,
    );

  const translateY =
    interpolate(
      frame,
      [startFrame, stableStart],
      [18, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

  if (frame < startFrame) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        zIndex: 90,
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 96,
        paddingRight: 96,
        opacity,
        background:
          "linear-gradient(180deg, rgba(5,8,12,0.70) 0%, rgba(5,8,12,0.91) 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          textAlign: "center",
          transform:
            `translateY(${translateY}px)`,
          fontFamily:
            "Inter, Arial, Helvetica, sans-serif",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            fontSize: 52,
            lineHeight: 1.08,
            fontWeight: 700,
            letterSpacing: -1.1,
            textShadow:
              "0 3px 18px rgba(0,0,0,0.45)",
          }}
        >
          Francisco Alejandro
          <br />
          Riveros Düllmann
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 32,
            lineHeight: 1.15,
            fontWeight: 500,
            letterSpacing: 0.7,
            opacity: 0.94,
          }}
        >
          MSc., PhD.
        </div>

        <div
          style={{
            width: 110,
            height: 2,
            margin:
              "26px auto 24px auto",
            background:
              "rgba(255,255,255,0.48)",
          }}
        />

        <div
          style={{
            fontSize: 30,
            lineHeight: 1.28,
            fontWeight: 500,
            letterSpacing: 0.15,
            opacity: 0.96,
          }}
        >
          Estrategia Jurídica Integral
          <br />
          Constitucionalizada
        </div>

        <div
          style={{
            marginTop: 34,
            fontSize: 24,
            lineHeight: 1.35,
            fontWeight: 400,
            letterSpacing: 0.3,
            opacity: 0.82,
          }}
        >
          Diagnóstico estratégico
          antes de decidir.
        </div>
      </div>
    </AbsoluteFill>
  );
};
