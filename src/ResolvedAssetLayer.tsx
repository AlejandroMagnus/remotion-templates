import React, {useEffect, useState} from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";

type AssetItem = {
  id: string;
  ruleId: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  status: string;
  asset?: {
    mediaType: "video" | "image";
    localSrc: string;
  };
};

type Manifest = {
  assets: AssetItem[];
};

function CleanVisual({item}: {item: AssetItem}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  if (!item.asset) return null;

  const frames = Math.max(
    1,
    Math.round(
      (item.durationMs / 1000) * fps,
    ),
  );

  // Movimiento cinematográfico muy suave.
  const scale = interpolate(
    frame,
    [0, frames],
    [1.015, 1.075],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const src = staticFile(item.asset.localSrc);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        overflow: "hidden",
      }}
    >
      {item.asset.mediaType === "video" ? (
        <OffthreadVideo
          src={src}
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
      ) : (
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
      )}
    </AbsoluteFill>
  );
}

export function ResolvedAssetLayer() {
  const {fps} = useVideoConfig();

  const [items, setItems] =
    useState<AssetItem[]>([]);

  const [handle] = useState(() =>
    delayRender("Loading PHOTO-FIRST assets"),
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
              item.asset,
          ),
        );
      })
      .catch((error) => {
        console.warn(
          "PHOTO-FIRST assets unavailable:",
          error,
        );
      })
      .finally(() => continueRender(handle));
  }, [handle]);

  return (
    <AbsoluteFill
      style={{
        zIndex: 10,
        backgroundColor: "#000",
      }}
    >
      {items.map((item) => {
        const from = Math.max(
          0,
          Math.round(
            (item.startMs / 1000) * fps,
          ),
        );

        const durationInFrames = Math.max(
          1,
          Math.round(
            ((item.endMs - item.startMs) /
              1000) *
              fps,
          ),
        );

        return (
          <Sequence
            key={`${item.id}-${item.startMs}`}
            from={from}
            durationInFrames={durationInFrames}
            premountFor={fps}
          >
            <CleanVisual item={item} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
