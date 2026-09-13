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

type AssetItem = {
  id: string;
  ruleId: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  status: string;

  asset?: {
    mediaType:
      | "video"
      | "image";

    localSrc: string;
  };
};

type Manifest = {
  assets: AssetItem[];
};

function hash(
  value: string,
): number {
  let result = 0;

  for (
    let i = 0;
    i < value.length;
    i++
  ) {
    result =
      (result * 31 +
        value.charCodeAt(i)) >>>
      0;
  }

  return result;
}

function CinematicVisual({
  item,
  durationInFrames,
}: {
  item: AssetItem;
  durationInFrames: number;
}) {
  const frame =
    useCurrentFrame();

  const preset =
    hash(
      `${item.id}-${item.ruleId}`,
    ) % 5;

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
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

  let scale = 1.06;
  let x = 0;
  let y = 0;

  // 1. PUSH-IN
  if (preset === 0) {
    scale =
      1.035 +
      progress * 0.085;
  }

  // 2. PAN LEFT -> RIGHT
  if (preset === 1) {
    scale = 1.12;
    x = -2.8 + progress * 5.6;
  }

  // 3. PAN RIGHT -> LEFT
  if (preset === 2) {
    scale = 1.12;
    x = 2.8 - progress * 5.6;
  }

  // 4. VERTICAL DRIFT
  if (preset === 3) {
    scale = 1.11;
    y = 2.3 - progress * 4.6;
  }

  // 5. SLOW PULL-OUT
  if (preset === 4) {
    scale =
      1.12 -
      progress * 0.075;
  }

  const edge =
    Math.min(
      10,
      Math.max(
        4,
        Math.floor(
          durationInFrames / 4,
        ),
      ),
    );

  const opacity =
    interpolate(
      frame,
      [
        0,
        edge,
        Math.max(
          edge + 1,
          durationInFrames -
            edge,
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

  if (!item.asset) {
    return null;
  }

  const src =
    staticFile(
      item.asset.localSrc,
    );

  const style: React.CSSProperties =
    {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      opacity,

      transform:
        `translate3d(${x}%, ${y}%, 0) ` +
        `scale(${scale})`,

      transformOrigin:
        "center center",
    };

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      {item.asset.mediaType ===
      "video" ? (
        <OffthreadVideo
          src={src}
          muted
          style={style}
        />
      ) : (
        <Img
          src={src}
          style={style}
        />
      )}
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
        "Loading V3.9.4 diversified assets",
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
                item.asset,
            ),
          );
        },
      )
      .catch((error) => {
        console.warn(
          "Diversified assets unavailable:",
          error,
        );
      })
      .finally(() =>
        continueRender(handle),
      );
  }, [handle]);

  const overlap =
    Math.max(
      6,
      Math.round(
        fps * 0.28,
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
              key={
                `${item.id}-` +
                `${item.startMs}-` +
                `${index}`
              }
              from={from}
              durationInFrames={
                durationInFrames
              }
              premountFor={fps}
            >
              <CinematicVisual
                item={item}
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
