import React, {
  useEffect,
  useState,
} from "react";

import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
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

type MediaType =
  | "image"
  | "video";

type AssetItem = {
  id: string;
  ruleId: string;

  startMs: number;
  endMs: number;
  durationMs: number;

  status: string;

  asset?: {
    mediaType: MediaType;
    localSrc: string;
  };
};

type Manifest = {
  assets: AssetItem[];
};

type CinematicAssetProps = {
  item: AssetItem;
  sceneIndex: number;
  durationInFrames: number;
  isFirst: boolean;
  isLast: boolean;
};

function useCinematicOpacity({
  durationInFrames,
  isFirst,
  isLast,
}: {
  durationInFrames: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const frame =
    useCurrentFrame();

  const {fps} =
    useVideoConfig();

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

  return interpolate(
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
}

function SemanticCinematicPhoto({
  item,
  sceneIndex,
  durationInFrames,
  isFirst,
  isLast,
}: CinematicAssetProps) {
  const frame =
    useCurrentFrame();

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

  const backgroundScale =
    1.22 +
    cadence * 0.025;

  const backgroundX =
    x * -0.20;

  const backgroundY =
    y * -0.16;

  const opacity =
    useCinematicOpacity({
      durationInFrames,
      isFirst,
      isLast,
    });

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

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 44%, transparent 38%, rgba(0,0,0,0.07) 70%, rgba(0,0,0,0.28) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}

function SemanticCinematicVideo({
  item,
  sceneIndex,
  durationInFrames,
  isFirst,
  isLast,
}: CinematicAssetProps) {
  const frame =
    useCurrentFrame();

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

  /*
   * El video ya contiene movimiento real.
   * Aplicamos solamente una deriva de cámara
   * muy contenida para evitar sobreanimación.
   */
  const videoScale =
    1.035 +
    (
      motion.endScale -
      motion.startScale
    ) *
      cadence *
      0.18;

  const videoX =
    (
      motion.startX +
      (
        motion.endX -
        motion.startX
      ) *
        cadence
    ) *
    0.12;

  const videoY =
    (
      motion.startY +
      (
        motion.endY -
        motion.startY
      ) *
        cadence
    ) *
    0.10;

  const opacity =
    useCinematicOpacity({
      durationInFrames,
      isFirst,
      isLast,
    });

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
      {/*
       * Fondo ambiental del mismo clip.
       * Permite trabajar con fuentes que
       * no coincidan exactamente con 9:16.
       */}
      <OffthreadVideo
        src={src}
        muted
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
            "scale(1.18)",

          filter:
            "blur(22px) brightness(0.50)",
        }}
      />

      {/*
       * Plano principal.
       * El audio del clip permanece silenciado:
       * la narración y el sound design
       * gobiernan la producción.
       */}
      <OffthreadVideo
        src={src}
        muted
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
            `translate3d(${videoX}%, ${videoY}%, 0) ` +
            `scale(${videoScale})`,

          transformOrigin:
            "center center",
        }}
      />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 44%, transparent 40%, rgba(0,0,0,0.06) 72%, rgba(0,0,0,0.25) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}

function SemanticCinematicAsset(
  props: CinematicAssetProps,
) {
  const mediaType =
    props.item.asset?.mediaType;

  if (mediaType === "video") {
    return (
      <SemanticCinematicVideo
        {...props}
      />
    );
  }

  if (mediaType === "image") {
    return (
      <SemanticCinematicPhoto
        {...props}
      />
    );
  }

  return null;
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
                Boolean(
                  item.asset,
                ) &&
                (
                  item.asset
                    ?.mediaType ===
                    "image" ||
                  item.asset
                    ?.mediaType ===
                    "video"
                ),
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
              <SemanticCinematicAsset
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
