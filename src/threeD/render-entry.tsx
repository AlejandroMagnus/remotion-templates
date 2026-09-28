import React from "react";
import { Composition, registerRoot } from "remotion";
import { EvidenceDossier } from "./EvidenceDossier";
import { EvidenceSceneSchema, type EvidenceScene } from "./schema";

type ClipProps = {
  scene: EvidenceScene;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
};

const defaultScene: EvidenceScene = {
  kind: "evidence-dossier",
  assetSceneId: "default",
  startMs: 0,
  endMs: 4000,
  cueMs: 700,
  title: "Examinar la prueba",
  labels: ["Documentos", "Cronología", "Hechos"],
};

const defaults: ClipProps = {
  scene: defaultScene,
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 120,
};

function EvidenceDossierClip({ scene }: ClipProps) {
  return <EvidenceDossier scene={EvidenceSceneSchema.parse(scene)} />;
}

function Root() {
  return (
    <Composition
      id="EvidenceDossierClip"
      component={EvidenceDossierClip}
      defaultProps={defaults}
      width={defaults.width}
      height={defaults.height}
      fps={defaults.fps}
      durationInFrames={defaults.durationInFrames}
      calculateMetadata={({ props }) => {
        const width = Math.max(
          320,
          Math.round(Number(props.width) || defaults.width),
        );
        const height = Math.max(
          320,
          Math.round(Number(props.height) || defaults.height),
        );
        const fps = Math.max(1, Math.round(Number(props.fps) || defaults.fps));
        const durationInFrames = Math.max(
          1,
          Math.round(
            Number(props.durationInFrames) || defaults.durationInFrames,
          ),
        );
        return { width, height, fps, durationInFrames };
      }}
    />
  );
}

registerRoot(Root);
