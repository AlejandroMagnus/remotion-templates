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

const hash = (value: string) => {
  let result = 0;

  for (let i = 0; i < value.length; i++) {
    result = (result * 31 + value.charCodeAt(i)) >>> 0;
  }

  return result;
};

function CinematicPhoto({
  item,
  durationInFrames,
}: {
  item: AssetItem;
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();

  if (!item.asset) return null;

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

  const preset = hash(`${item.id}-${item.ruleId}`) % 6;

  // Curva suave: acelera y desacelera.
  const cadence =
    0.5 - Math.cos(progress * Math.PI) / 2;

  let foregroundScale = 1.06;
  let foregroundX = 0;
  let foregroundY = 0;
  let rotate = 0;

  if (preset === 0) {
    // PUSH-IN
    foregroundScale = 1.04 + cadence * 0.10;
    foregroundY = 1.2 - cadence * 2.4;
  }

  if (preset === 1) {
    // PAN IZQUIERDA → DERECHA
    foregroundScale = 1.13;
    foregroundX = -3.2 + cadence * 6.4;
    foregroundY = 0.8 - cadence * 1.6;
  }

  if (preset === 2) {
    // PAN DERECHA → IZQUIERDA
    foregroundScale = 1.13;
    foregroundX = 3.2 - cadence * 6.4;
    foregroundY = -0.7 + cadence * 1.4;
  }

  if (preset === 3) {
    // ASCENSO DE CÁMARA
    foregroundScale = 1.11;
    foregroundY = 3.2 - cadence * 6.4;
  }

  if (preset === 4) {
    // PULL-OUT
    foregroundScale = 1.15 - cadence * 0.09;
    foregroundX = 1.8 - cadence * 3.6;
  }

  if (preset === 5) {
    // DRIFT DIAGONAL MUY SUTIL
    foregroundScale = 1.09 + cadence * 0.035;
    foregroundX = -2 + cadence * 4;
    foregroundY = 1.8 - cadence * 3.6;
    rotate = -0.35 + cadence * 0.7;
  }

  // Fondo se mueve más lento que el primer plano:
  // crea percepción de profundidad.
  const backgroundScale = 1.22 + cadence * 0.025;

  const backgroundX = foregroundX * -0.22;
  const backgroundY = foregroundY * -0.18;

  const edgeFrames = Math.max(
    6,
    Math.min(
      12,
      Math.floor(durationInFrames * 0.18),
    ),
  );

  const opacity = interpolate(
    frame,
    [
      0,
      edgeFrames,
      Math.max(
        edgeFrames + 1,
        durationInFrames - edgeFrames,
      ),
      durationInFrames,
    ],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
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
      {/* CAPA DE PROFUNDIDAD / FONDO */}
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

          filter: "blur(18px) brightness(0.64)",
        }}
      />

      {/* CAPA PRINCIPAL */}
      <Img
        src={src}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",

          transform:
            `translate3d(${foregroundX}%, ${foregroundY}%, 0) ` +
            `scale(${foregroundScale}) ` +
            `rotate(${rotate}deg)`,

          transformOrigin: "center center",
        }}
      />

      {/* PROFUNDIDAD / LUZ SUAVE */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 45%, transparent 36%, rgba(0,0,0,0.08) 70%, rgba(0,0,0,0.32) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}

export function ResolvedAssetLayer() {
  const {fps} = useVideoConfig();

  const [items, setItems] =
    useState<AssetItem[]>([]);

  const [handle] = useState(() =>
    delayRender(
      "Loading V3.10-A cinematic 2.5D assets",
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
      .then((manifest: Manifest) => {
        setItems(
          (manifest.assets ?? []).filter(
            (item) =>
              item.status === "resolved" &&
              item.asset &&
              item.asset.mediaType === "image",
          ),
        );
      })
      .catch((error) => {
        console.warn(
          "V3.10-A assets unavailable:",
          error,
        );
      })
      .finally(() =>
        continueRender(handle),
      );
  }, [handle]);

  const overlap = Math.max(
    7,
    Math.round(fps * 0.32),
  );

  return (
    <AbsoluteFill
      style={{
        zIndex: 10,
        backgroundColor: "#000",
      }}
    >
      {items.map((item, index) => {
        const baseFrom = Math.max(
          0,
          Math.round(
            (item.startMs / 1000) * fps,
          ),
        );

        const baseDuration = Math.max(
          1,
          Math.round(
            ((item.endMs - item.startMs) /
              1000) *
              fps,
          ),
        );

        const lead =
          index === 0 ? 0 : overlap;

        const from = Math.max(
          0,
          baseFrom - lead,
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
            <CinematicPhoto
              item={item}
              durationInFrames={
                durationInFrames
              }
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
