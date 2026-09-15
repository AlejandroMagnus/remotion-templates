import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const END_CARD_TOTAL_SECONDS =
  0.45 + 3 + 0.5;

export const OwnershipMark: React.FC = () => {
  const frame = useCurrentFrame();

  const {
    fps,
    durationInFrames,
  } = useVideoConfig();

  const endCardFrames =
    Math.round(
      END_CARD_TOTAL_SECONDS * fps,
    );

  const hideFromFrame =
    Math.max(
      0,
      durationInFrames - endCardFrames,
    );

  if (frame >= hideFromFrame) {
    return null;
  }

  const cycleFrames =
    Math.max(
      fps * 12,
      1,
    );

  const phase =
    frame % cycleFrames;

  const x =
    interpolate(
      phase,
      [0, cycleFrames],
      [0, 14],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

  const opacity =
    interpolate(
      frame,
      [0, Math.max(1, fps)],
      [0, 0.105],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

  return (
    <AbsoluteFill
      style={{
        zIndex: 70,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 92 + x,
          top: 126,
          maxWidth: 760,

          fontFamily:
            "Inter, Arial, Helvetica, sans-serif",

          fontSize: 22,
          fontWeight: 500,
          letterSpacing: 0.35,

          color: "#ffffff",
          opacity,

          textShadow:
            "0 2px 8px rgba(0,0,0,0.55)",
        }}
      >
        Francisco A. Riveros Düllmann ·
        Estrategia Jurídica
      </div>
    </AbsoluteFill>
  );
};
