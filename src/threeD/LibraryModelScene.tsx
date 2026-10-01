import React, { useEffect, useMemo, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Box3, Vector3, AnimationMixer } from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import type { EvidenceScene } from "./schema";
import { EvidenceDossier } from "./EvidenceDossier";

function Model({ gltf, seconds }: { gltf: GLTF; seconds: number }) {
  const state = useMemo(() => {
    const object = gltf.scene;
    const box = new Box3().setFromObject(object),
      size = box.getSize(new Vector3()),
      center = box.getCenter(new Vector3());
    const scale = 2.6 / Math.max(size.x, size.y, size.z, 0.01);
    const mixer = new AnimationMixer(object);
    gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
    return { object, center, scale, mixer };
  }, [gltf]);
  // Deterministic frame sampling, including embedded animations; no wall-clock ticker.
  state.mixer.setTime(seconds);
  return (
    <group
      rotation={[0, Math.sin(seconds * 0.32) * 0.25, 0]}
      position={[0, -0.2, 0]}
    >
      <group scale={state.scale}>
        <primitive
          object={state.object}
          position={[-state.center.x, -state.center.y, -state.center.z]}
        />
      </group>
    </group>
  );
}

export function LibraryModelScene({
  scene,
  frameOffset = 0,
}: {
  scene: EvidenceScene;
  frameOffset?: number;
}) {
  const { width, height, fps } = useVideoConfig(),
    frame = useCurrentFrame();
  const [handle] = useState(() =>
    delayRender("Loading reviewed local 3D model"),
  );
  const [gltf, setGltf] = useState<GLTF | null>(null);
  useEffect(() => {
    let active = true;
    new GLTFLoader().load(
      staticFile(scene.model!.src),
      (value) => {
        if (active) {
          setGltf(value);
          continueRender(handle);
        }
      },
      undefined,
      (error) => cancelRender(error),
    );
    return () => {
      active = false;
    };
  }, [scene.model?.src, handle]);
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 45%, #173a48 0%, #081722 72%)",
        color: "#ece9df",
      }}
    >
      <ThreeCanvas
        width={width}
        height={height}
        dpr={1}
        camera={{ position: [0, 0.3, 6.6], fov: 38 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[-3, 5, 5]} intensity={3} />
        <pointLight position={[3, 2, 3]} intensity={12} color="#74cbbb" />
        {gltf && (
          <Model gltf={gltf} seconds={Math.max(0, frame - frameOffset) / fps} />
        )}
      </ThreeCanvas>
      <div
        style={{
          position: "absolute",
          top: "17%",
          left: "9%",
          right: "9%",
          textAlign: "center",
          fontFamily: "Georgia, serif",
          fontSize: width * 0.055,
          lineHeight: 1.2,
        }}
      >
        {scene.title}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "22%",
          width: "100%",
          textAlign: "center",
          fontFamily: "Arial",
          fontSize: width * 0.021,
          color: "#9bb0b5",
        }}
      >
        Representación ilustrativa
      </div>
    </AbsoluteFill>
  );
}
export function NativeScene(props: {
  scene: EvidenceScene;
  frameOffset?: number;
}) {
  return props.scene.kind === "library-model" ? (
    <LibraryModelScene {...props} />
  ) : (
    <EvidenceDossier {...props} />
  );
}
