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
    mediaType: "image" | "video";
    localSrc: string;
  };
};

type Manifest = {
  assets: AssetItem[];
};

/**
 * V3.14 — CINEMATIC RHYTHM GUARD
 *
 * No sustituye al Director Maestro.
 * Protege el montaje frente a duraciones anómalas
 * provenientes del manifiesto.
 */
const MAX_STATIC_SHOT_SECONDS = 7.0;
const MIN_STATIC_SHOT_SECONDS = 1.8;
const OVERLAP_SECONDS = 0.28;

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
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  if (!item.asset) {
    return null;
  }

  const src = staticFile(item.asset.localSrc);

  const progress = interpolate(
    frame,
    [0, Math.max(1, durationInFrames - 1)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const cadence =
    0.5 - Math.cos(progress * Math.PI) / 2;

  const motion =
    getSemanticMotionProfile(
      item.ruleId,
      sceneIndex,
    );

  const scale =
    motion.startScale +
    (motion.endScale - motion.startScale) *
      cadence;

  const x =
    motion.startX +
    (motion.endX - motion.startX) *
      cadence;

  const y =
    motion.startY +
    (motion.endY - motion.startY) *
      cadence;

  const rotate =
    motion.startRotate +
    (motion.endRotate -
      motion.startRotate) *
      cadence;

  const backgroundScale =
    1.22 + cadence * 0.025;

  const backgroundX = x * -0.2;
  const backgroundY = y * -0.16;

  const enterFrames = isFirst
    ? Math.max(1, Math.round(fps * 0.1))
    : Math.max(5, Math.round(fps * 0.2));

  const exitFrames = isLast
    ? Math.max(10, Math.round(fps * 0.45))
    : Math.max(6, Math.round(fps * 0.22));

  const opacity = interpolate(
    frame,
    [
      0,
      enterFrames,
      Math.max(
        enterFrames + 1,
        durationInFrames - exitFrames,
      ),
      durationInFrames,
    ],
    [isFirst ? 1 : 0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  /**
   * Microvariación secundaria.
   * Evita sensación completamente mecánica incluso
   * dentro de un plano relativamente largo.
   */
  const breathing =
    1 +
    Math.sin(progress * Math.PI * 2) *
      0.0025;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        overflow: "hidden",
        opacity,
      }}
    >
      <Img
        src={src}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform:
            `translate3d(${backgroundX}%, ${backgroundY}%, 0) ` +
            `scale(${backgroundScale * breathing})`,
          filter:
            "blur(18px) brightness(0.62)",
        }}
      />

      <Img
        src={src}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform:
            `translate3d(${x}%, ${y}%, 0) ` +
            `scale(${scale * breathing}) ` +
            `rotate(${rotate}deg)`,
          transformOrigin: "center center",
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

  const [handle] = useState(() =>
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
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`,
          );
        }

        return response.json();
      })
      .then((manifest: Manifest) => {
        const resolved =
          (manifest.assets ?? [])
            .filter(
              (item) =>
                item.status === "resolved" &&
                item.asset &&
                item.asset.mediaType === "image",
            )
            .sort(
              (a, b) =>
                a.startMs - b.startMs,
            );

        setItems(resolved);
      })
      .catch((error) => {
        console.warn(
          "Adaptive assets unavailable:",
          error,
        );
      })
      .finally(() =>
        continueRender(handle),
      );
  }, [handle, productionCode]);

  const overlap = Math.max(
    6,
    Math.round(
      fps * OVERLAP_SECONDS,
    ),
  );

  const maxShotFrames = Math.round(
    fps * MAX_STATIC_SHOT_SECONDS,
  );

  const minShotFrames = Math.round(
    fps * MIN_STATIC_SHOT_SECONDS,
  );

  return (
    <AbsoluteFill
      style={{
        zIndex: 10,
        backgroundColor: "#000",
      }}
    >
      {items.map((item, index) => {
        const isFirst = index === 0;
        const isLast =
          index === items.length - 1;

        const baseFrom = Math.max(
          0,
          Math.round(
            (item.startMs / 1000) * fps,
          ),
        );

        const semanticDuration =
          Math.max(
            minShotFrames,
            Math.round(
              ((item.endMs -
                item.startMs) /
                1000) *
                fps,
            ),
          );

        /**
         * El siguiente recurso define el límite natural
         * del plano actual cuando existe.
         */
        const nextBaseFrom =
          index < items.length - 1
            ? Math.max(
                0,
                Math.round(
                  (items[index + 1].startMs /
                    1000) *
                    fps,
                ),
              )
            : null;

        const from = isFirst
          ? 0
          : Math.max(
              0,
              baseFrom - overlap,
            );

        let sequenceDuration =
          semanticDuration + overlap;

        if (nextBaseFrom !== null) {
          const untilNext =
            nextBaseFrom - from + overlap;

          sequenceDuration = Math.min(
            sequenceDuration,
            Math.max(
              minShotFrames,
              untilNext,
            ),
          );
        }

        /**
         * Guardia cinematográfica:
         * ninguna fotografía estática puede monopolizar
         * accidentalmente decenas de segundos.
         */
        sequenceDuration = Math.min(
          sequenceDuration,
          maxShotFrames + overlap,
        );

        /**
         * La última imagen puede cubrir únicamente
         * el hueco final razonable.
         *
         * No se extiende automáticamente durante
         * decenas de segundos.
         */
        if (isLast) {
          const remaining =
            compositionDurationInFrames -
            from;

          sequenceDuration = Math.min(
            remaining,
            Math.max(
              sequenceDuration,
              Math.min(
                remaining,
                maxShotFrames + overlap,
              ),
            ),
          );
        }

        return (
          <Sequence
            key={`${item.id}-${index}`}
            from={from}
            durationInFrames={Math.max(
              1,
              sequenceDuration,
            )}
            premountFor={fps}
          >
            <SemanticCinematicPhoto
              item={item}
              sceneIndex={index}
              durationInFrames={Math.max(
                1,
                sequenceDuration,
              )}
              isFirst={isFirst}
              isLast={isLast}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
          }
