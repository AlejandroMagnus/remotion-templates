import React, {useEffect, useState} from "react";
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

type ResolvedAsset = {
  id: string;
  ruleId: string;
  route: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  status: string;
  asset?: {
    mediaType: "video" | "image";
    localSrc: string;
    creator?: string;
    sourceUrl?: string;
  };
};

type Manifest = {
  assets: ResolvedAsset[];
};

const labelFor = (ruleId: string) =>
  ruleId.replaceAll("-", " ").toUpperCase();

function AssetVisual({item}: {item: ResolvedAsset}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  if (!item.asset) return null;

  const duration = Math.max(
    1,
    Math.round((item.durationMs / 1000) * fps),
  );

  const fade = interpolate(
    frame,
    [0, Math.min(7, duration / 4), Math.max(duration - 7, duration / 2), duration],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const scale = interpolate(
    frame,
    [0, duration],
    item.route === "DOCUMENT_OBJECT" ? [1.03, 1.09] : [1, 1.05],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const src = staticFile(item.asset.localSrc);

  return (
    <AbsoluteFill style={{opacity: fade, overflow: "hidden"}}>
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

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,.12) 0%, rgba(0,0,0,.04) 50%, rgba(0,0,0,.48) 100%)",
        }}
      />

      {item.route === "DOCUMENT_OBJECT" ? (
        <div
          style={{
            position: "absolute",
            left: "6%",
            top: "7%",
            padding: "12px 20px",
            borderRadius: 14,
            background: "rgba(10,15,14,.70)",
            color: "white",
            fontFamily: "Arial, sans-serif",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 1.2,
          }}
        >
          {labelFor(item.ruleId)}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

export function ResolvedAssetLayer() {
  const {fps} = useVideoConfig();
  const [items, setItems] = useState<ResolvedAsset[]>([]);
  const [handle] = useState(() =>
    delayRender("Loading resolved audiovisual assets"),
  );

  useEffect(() => {
    fetch(staticFile("generated/video-juridico-001-resolved-assets.json"))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((manifest: Manifest) => {
        setItems(
          (manifest.assets ?? []).filter(
            (item) => item.status === "resolved" && item.asset,
          ),
        );
      })
      .catch((error) => {
        console.warn("Resolved assets unavailable:", error);
      })
      .finally(() => continueRender(handle));
  }, [handle]);

  return (
    <AbsoluteFill
      style={{
        zIndex: 60,
        pointerEvents: "none",
      }}
    >
      {items.map((item) => {
        const from = Math.max(
          0,
          Math.round((item.startMs / 1000) * fps),
        );

        const durationInFrames = Math.max(
          1,
          Math.round(((item.endMs - item.startMs) / 1000) * fps),
        );

        return (
          <Sequence
            key={item.id}
            from={from}
            durationInFrames={durationInFrames}
            premountFor={fps}
          >
            <AssetVisual item={item} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
