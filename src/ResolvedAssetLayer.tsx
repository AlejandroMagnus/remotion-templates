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

/* =========================================================
   TYPES
   ========================================================= */

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

/* =========================================================
   CINEMATIC RHYTHM
   ========================================================= */

/**
 * Esto es una RED DE SEGURIDAD, no el Director artístico.
 *
 * El ritmo verdadero debe venir del MasterAudiovisualDirector.
 * El renderer únicamente impide que una fotografía defectuosa
 * permanezca accidentalmente durante decenas de segundos.
 */
const MAX_STATIC_SHOT_SECONDS = 6;
const MIN_STATIC_SHOT_SECONDS = 1.4;
const OVERLAP_SECONDS = 0.28;

/* =========================================================
   CINEMATIC PHOTO
   ========================================================= */

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

  /**
   * Curva cinematográfica suave.
   */
  const cadence =
    0.5 -
    Math.cos(progress * Math.PI) / 2;

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

  /**
   * Fondo 2.5D.
   */
  const backgroundScale =
    1.22 + cadence * 0.025;

  const backgroundX =
    x * -0.2;

  const backgroundY =
    y * -0.16;

  const enterFrames = isFirst
    ? Math.max(
        1,
        Math.round(fps * 0.1),
      )
    : Math.max(
        5,
        Math.round(fps * 0.2),
      );

  const exitFrames = isLast
    ? Math.max(
        10,
        Math.round(fps * 0.45),
      )
    : Math.max(
        6,
        Math.round(fps * 0.22),
      );

  const opacity = interpolate(
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
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  /**
   * Micromovimiento orgánico.
   */
  const breathing =
    1 +
    Math.sin(
      progress *
        Math.PI *
        2,
    ) *
      0.0025;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        overflow: "hidden",
        opacity,
      }}
    >
      {/* BACKGROUND DEPTH */}
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

      {/* FOREGROUND */}
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

          transformOrigin:
            "center center",
        }}
      />

      {/* CINEMATIC VIGNETTE */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 44%, transparent 38%, rgba(0,0,0,0.07) 70%, rgba(0,0,0,0.28) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}

/* =========================================================
   RESOLVED ASSET LAYER
   ========================================================= */

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

  /* =======================================================
     LOAD MANIFEST
     ======================================================= */

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

      .then(
        (manifest: Manifest) => {
          const resolved =
            (manifest.assets ?? [])
              .filter(
                (item) =>
                  item.status ===
                    "resolved" &&
                  item.asset &&
                  item.asset
                    .mediaType ===
                    "image",
              )
              .sort(
                (a, b) =>
                  a.startMs -
                  b.startMs,
              );

          /**
           * Diagnóstico visible en Actions/Remotion.
           *
           * Si el Director genera 15 escenas pero solamente
           * llegan 3 assets, ahora podremos demostrarlo.
           */
          console.log(
            `[ResolvedAssetLayer] ${productionCode}: ${resolved.length} resolved visual assets`,
          );

          setItems(resolved);
        },
      )

      .catch((error) => {
        console.warn(
          "Adaptive assets unavailable:",
          error,
        );
      })

      .finally(() => {
        continueRender(handle);
      });
  }, [
    handle,
    productionCode,
  ]);

  /* =======================================================
     TIMING CONSTANTS
     ======================================================= */

  const overlap =
    Math.max(
      6,
      Math.round(
        fps *
          OVERLAP_SECONDS,
      ),
    );

  const maxShotFrames =
    Math.max(
      1,
      Math.round(
        fps *
          MAX_STATIC_SHOT_SECONDS,
      ),
    );

  const minShotFrames =
    Math.max(
      1,
      Math.round(
        fps *
          MIN_STATIC_SHOT_SECONDS,
      ),
    );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <AbsoluteFill
      style={{
        zIndex: 10,
        backgroundColor: "#000",
      }}
    >
      {items.map(
        (item, index) => {
          const isFirst =
            index === 0;

          const isLast =
            index ===
            items.length - 1;

          /* -----------------------------------------------
             START
             ----------------------------------------------- */

          const nominalFrom =
            Math.max(
              0,
              Math.round(
                (item.startMs /
                  1000) *
                  fps,
              ),
            );

          const from =
            isFirst
              ? 0
              : Math.max(
                  0,
                  nominalFrom -
                    overlap,
                );

          /* -----------------------------------------------
             NEXT VISUAL
             ----------------------------------------------- */

          const nextItem =
            index <
            items.length - 1
              ? items[
                  index + 1
                ]
              : null;

          const nextFrom =
            nextItem
              ? Math.max(
                  0,
                  Math.round(
                    (nextItem.startMs /
                      1000) *
                      fps,
                  ),
                )
              : null;

          /* -----------------------------------------------
             SEMANTIC DURATION
             ----------------------------------------------- */

          const semanticFrames =
            Math.max(
              minShotFrames,

              Math.round(
                (Math.max(
                  0,
                  item.endMs -
                    item.startMs,
                ) /
                  1000) *
                  fps,
              ),
            );

          /**
           * Duración deseada por semántica,
           * siempre limitada por la red de seguridad.
           */
          let durationInFrames =
            Math.min(
              semanticFrames +
                overlap,
              maxShotFrames +
                overlap,
            );

          /* -----------------------------------------------
             NATURAL CUT
             ----------------------------------------------- */

          if (
            nextFrom !== null
          ) {
            /**
             * Nunca atravesamos el comienzo del siguiente
             * recurso más allá del crossfade permitido.
             */
            const framesUntilNext =
              nextFrom -
              from +
              overlap;

            durationInFrames =
              Math.min(
                durationInFrames,
                Math.max(
                  minShotFrames,
                  framesUntilNext,
                ),
              );
          }

          /* -----------------------------------------------
             COMPOSITION BOUNDARY
             ----------------------------------------------- */

          const availableFrames =
            compositionDurationInFrames -
            from;

          durationInFrames =
            Math.max(
              1,
              Math.min(
                durationInFrames,
                availableFrames,
              ),
            );

          /* -----------------------------------------------
             RENDER SHOT
             ----------------------------------------------- */

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
                sceneIndex={
                  index
                }
                durationInFrames={
                  durationInFrames
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
