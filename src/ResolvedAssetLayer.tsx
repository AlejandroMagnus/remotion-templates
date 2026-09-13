import React, {
  useEffect,
  useState,
} from "react";

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

import {
  getSemanticMotionProfile,
} from "./motion/semanticMotionDirector";

type AssetItem = {
  id: string;
  ruleId: string;

  startMs: number;
  endMs: number;
  durationMs: number;

  status: string;

  asset?: {
    mediaType:
      | "image"
      | "video";

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
  isFirst,
  isLast,
}: {
  item: AssetItem;
  sceneIndex: number;
  durationInFrames: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const frame =
    useCurrentFrame();

  const {fps} =
    useVideoConfig();

  if (!item.asset) {
    return null;
  }

  const src =
    staticFile(
      item.asset.localSrc,
    );

  const progress =
    interpolate(
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
        extrapolateLeft:
          "clamp",

        extrapolateRight:
          "clamp",
      },
    );

  // Movimiento con aceleración
  // y desaceleración natural.
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
    (
      motion.endScale -
      motion.startScale
    ) *
      cadence;

  const x =
    motion.startX +
    (
      motion.endX -
      motion.startX
    ) *
      cadence;

  const y =
    motion.startY +
    (
      motion.endY -
      motion.startY
    ) *
      cadence;

  const rotate =
    motion.startRotate +
    (
      motion.endRotate -
      motion.startRotate
    ) *
      cadence;

  // Fondo con desplazamiento
  // inverso para profundidad 2.5D.
  const backgroundScale =
    1.22 +
    cadence * 0.025;

  const backgroundX =
    x * -0.20;

  const backgroundY =
    y * -0.16;

  const enterFrames =
    isFirst
      ? Math.max(
          1,
          Math.round(
            fps * 0.10,
          ),
        )
      : Math.max(
          5,
          Math.round(
            fps * 0.22,
          ),
        );

  const exitFrames =
    isLast
      ? Math.max(
          12,
          Math.round(
            fps * 0.70,
          ),
        )
      : Math.max(
          6,
          Math.round(
            fps * 0.25,
          ),
        );

  const opacity =
    interpolate(
      frame,
      [
        0,

        enterFrames,

        Math.max(
          enterFrames + 1,
          durationInFrames -
            exitFrames,
        ),

        durationInFrames,
      ],
      [
        // La primera visual ya existe
        // desde el frame 0:
        // desaparece el hueco negro.
        isFirst ? 1 : 0,

        1,

        1,

        0,
      ],
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
        backgroundColor:
          "#000",

        overflow:
          "hidden",

        opacity,
      }}
    >
      {/* PROFUNDIDAD AMBIENTAL */}
      <Img
        src={src}
        style={{
          position:
            "absolute",

          width:
            "100%",

          height:
            "100%",

          objectFit:
            "cover",

          transform:
            `translate3d(${backgroundX}%, ${backgroundY}%, 0) ` +
            `scale(${backgroundScale})`,

          filter:
            "blur(18px) brightness(0.62)",
        }}
      />

      {/* IMAGEN PRINCIPAL */}
      <Img
        src={src}
        style={{
          position:
            "absolute",

          width:
            "100%",

          height:
            "100%",

          objectFit:
            "cover",

          transform:
            `translate3d(${x}%, ${y}%, 0) ` +
            `scale(${scale}) ` +
            `rotate(${rotate}deg)`,

          transformOrigin:
            "center center",
        }}
      />

      {/* VOLUMEN */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 44%, transparent 38%, rgba(0,0,0,0.07) 70%, rgba(0,0,0,0.28) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}

export function ResolvedAssetLayer({
  productionCode,
}: {
  productionCode: string;
}) {
  const {
    fps,

    durationInFrames:
      compositionDurationInFrames,
  } = useVideoConfig();

  const [items, setItems] =
    useState<AssetItem[]>([]);

  const [handle] =
    useState(() =>
      delayRender(
        "Loading adaptive audiovisual assets",
      ),
    );

  useEffect(() => {
    fetch(
      staticFile(
        `generated/${productionCode}-resolved-assets.json`,
      ),
    )
      .then(
        (response) => {
          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status}`,
            );
          }

          return response.json();
        },
      )
      .then(
        (
          manifest:
            Manifest,
        ) => {
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
      .catch(
        (error) => {
          console.warn(
            "Adaptive assets unavailable:",
            error,
          );
        },
      )
      .finally(
        () =>
          continueRender(
            handle,
          ),
      );
  }, [
    handle,
    productionCode,
  ]);

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
        backgroundColor:
          "#000",
      }}
    >
      {items.map(
        (
          item,
          index,
        ) => {
          const isFirst =
            index === 0;

          const isLast =
            index ===
            items.length - 1;

          const baseFrom =
            Math.max(
              0,
              Math.round(
                (
                  item.startMs /
                  1000
                ) *
                  fps,
              ),
            );

          const baseDuration =
            Math.max(
              1,
              Math.round(
                (
                  (
                    item.endMs -
                    item.startMs
                  ) /
                  1000
                ) *
                  fps,
              ),
            );

          const lead =
            isFirst
              ? 0
              : overlap;

          // PRIMERA IMAGEN:
          // comienza necesariamente
          // en el frame cero.
          const from =
            isFirst
              ? 0
              : Math.max(
                  0,
                  baseFrom -
                    lead,
                );

          const openingExtension =
            isFirst
              ? baseFrom
              : 0;

          const normalDuration =
            baseDuration +
            lead +
            overlap +
            openingExtension;

          // ÚLTIMA IMAGEN:
          // permanece hasta el final
          // adaptativo del video.
          const sequenceDuration =
            isLast
              ? Math.max(
                  normalDuration,

                  compositionDurationInFrames -
                    from,
                )
              : normalDuration;

          return (
            <Sequence
              key={
                `${item.id}-` +
                `${index}`
              }

              from={from}

              durationInFrames={
                sequenceDuration
              }

              premountFor={
                fps
              }
            >
              <SemanticCinematicPhoto
                item={item}

                sceneIndex={
                  index
                }

                durationInFrames={
                  sequenceDuration
                }

                isFirst={
                  isFirst
                }

                isLast={
                  isLast
                }
              />
            </Sequence>
          );
        },
      )}
    </AbsoluteFill>
  );
}
