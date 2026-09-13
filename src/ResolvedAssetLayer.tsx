import React, {useEffect, useState} from "react";

import {
  AbsoluteFill,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {getSemanticMotionProfile} from "./motion/semanticMotionDirector";

type AssetItem = {
  id: string;
  ruleId: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  status: string;

  asset?: {
    mediaType: "image" | "video";
    localSrc: string;
  };
};

type Manifest = {
  assets: AssetItem[];
};

function SemanticCinematicPhoto({
  item,
  sceneIndex,
  durationInFrames,
}: {
  item: AssetItem;
  sceneIndex: number;
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();

  if (!item.asset) {
    return null;
  }

  const src = staticFile(
    item.asset.localSrc,
  );

  const progress = interpolate(
    frame,
    [
      0,
      Math.max(
        1,
        durationInFrames - 1,
      ),
    ],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Movimiento cadencioso:
  // aceleración y desaceleración natural.
  const cadence =
    0.5 -
    Math.cos(
      progress * Math.PI,
    ) /
      2;

  const motion =
    getSemanticMotionProfile(
      item.ruleId,
      sceneIndex,
    );

  const scale =
    motion.startScale +
    (motion.endScale -
      motion.startScale) *
      cadence;

  const x =
    motion.startX +
    (motion.endX -
      motion.startX) *
      cadence;

  const y =
    motion.startY +
    (motion.endY -
      motion.startY) *
      cadence;

  const rotate =
    motion.startRotate +
    (motion.endRotate -
      motion.startRotate) *
      cadence;

  // Fondo con desplazamiento inverso:
  // crea sensación de profundidad sin IA externa.
  const backgroundScale =
    1.22 +
    cadence * 0.025;

  const backgroundX =
    x * -0.20;

  const backgroundY =
    y * -0.16;

  const edgeFrames =
    Math.max(
      6,
      Math.min(
        12,
        Math.floor(
          durationInFrames *
            0.18,
        ),
      ),
    );

  const opacity =
    interpolate(
      frame,
      [
        0,
        edgeFrames,
        Math.max(
          edgeFrames + 1,
          durationInFrames -
            edgeFrames,
        ),
        durationInFrames,
      ],
      [0, 1, 1, 0],
      {
        extrapolateLeft:
          "clamp",
        extrapolateRight:
          "clamp",
      },
    );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        overflow: "hidden",
        opacity,
      }}
    >
      {/* PROFUNDIDAD AMBIENTAL */}
      <Img
        src={src}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",

          transform:
            `translate3d(${backgroundX}%, ${backgroundY}%, 0) ` +
            `scale(${backgroundScale})`,

          filter:
            "blur(18px) brightness(0.62)",
        }}
      />

      {/* IMAGEN NARRATIVA PRINCIPAL */}
      <Img
        src={src}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",

          transform:
            `translate3d(${x}%, ${y}%, 0) ` +
            `scale(${scale}) ` +
            `rotate(${rotate}deg)`,

          transformOrigin:
            "center center",
        }}
      />

      {/* VOLUMEN CINEMATOGRÁFICO */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 44%, transparent 38%, rgba(0,0,0,0.07) 70%, rgba(0,0,0,0.28) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}

export function ResolvedAssetLayer() {
  const {fps} =
    useVideoConfig();

  const [items, setItems] =
    useState<AssetItem[]>([]);

  const [handle] =
    useState(() =>
      delayRender(
        "Loading V3.10-B Semantic Motion Director",
      ),
    );

  useEffect(() => {
    fetch(
      staticFile(
        "generated/video-juridico-001-resolved-assets.json",
      ),
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`,
          );
        }

        return response.json();
      })
      .then(
        (manifest: Manifest) => {
          setItems(
            (
              manifest.assets ??
              []
            ).filter(
              (item) =>
                item.status ===
                  "resolved" &&
                item.asset &&
                item.asset
                  .mediaType ===
                  "image",
            ),
          );
        },
      )
      .catch((error) => {
        console.warn(
          "Semantic Motion assets unavailable:",
          error,
        );
      })
      .finally(() =>
        continueRender(handle),
      );
  }, [handle]);

  const overlap =
    Math.max(
      7,
      Math.round(
        fps * 0.32,
      ),
    );

  return (
    <AbsoluteFill
      style={{
        zIndex: 10,
        backgroundColor: "#000",
      }}
    >
      {items.map(
        (item, index) => {
          const baseFrom =
            Math.max(
              0,
              Math.round(
                (item.startMs /
                  1000) *
                  fps,
              ),
            );

          const baseDuration =
            Math.max(
              1,
              Math.round(
                ((item.endMs -
                  item.startMs) /
                  1000) *
                  fps,
              ),
            );

          const lead =
            index === 0
              ? 0
              : overlap;

          const from =
            Math.max(
              0,
              baseFrom -
                lead,
            );

          const durationInFrames =
            baseDuration +
            lead +
            overlap;

          return (
            <Sequence
              key={`${item.id}-${index}`}
              from={from}
              durationInFrames={
                durationInFrames
              }
              premountFor={fps}
            >
              <SemanticCinematicPhoto
                item={item}
                sceneIndex={index}
                durationInFrames={
                  durationInFrames
                }
              />
            </Sequence>
          );
        },
      )}
    </AbsoluteFill>
  );
}
