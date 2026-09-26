import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Quaternion, Vector3 } from "three";
import type { EvidenceScene } from "./schema";
import { evidenceMotion } from "./motion";

const ivory = "#ece9df";
const gold = "#c7a477";
const teal = "#67beb2";

function Connection({
  end,
  progress,
}: {
  end: [number, number, number];
  progress: number;
}) {
  const { length, position, quaternion } = useMemo(() => {
    const start = new Vector3(0, -0.3, 0.12);
    const finish = new Vector3(...end);
    const delta = finish.sub(start).multiplyScalar(Math.max(0.001, progress));
    return {
      length: delta.length(),
      position: start.add(delta.clone().multiplyScalar(0.5)),
      quaternion: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        delta.normalize(),
      ),
    };
  }, [end[0], end[1], end[2], progress]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.012, 0.012, length, 10]} />
      <meshStandardMaterial
        color={teal}
        emissive={teal}
        emissiveIntensity={0.35}
      />
    </mesh>
  );
}

function Document({
  position,
  angle,
  lift,
}: {
  position: [number, number, number];
  angle: number;
  lift: number;
}) {
  return (
    <group
      position={[position[0], position[1] + lift, position[2]]}
      rotation={[0, 0, angle]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.92, 1.23, 0.027]} />
        <meshStandardMaterial color={ivory} roughness={0.8} />
      </mesh>
      {[0.32, 0.17, 0.02, -0.13, -0.28].map((y, i) => (
        <mesh key={i} position={[-0.015, y, 0.018]}>
          <boxGeometry
            args={[i === 0 ? 0.43 : 0.61, i === 0 ? 0.045 : 0.016, 0.005]}
          />
          <meshStandardMaterial color={i === 0 ? gold : "#b5b9b3"} />
        </mesh>
      ))}
    </group>
  );
}

/** Native geometry rendered at the requested Remotion frame. No external assets. */
export function EvidenceDossier({
  scene,
  frameOffset = 0,
}: {
  scene: EvidenceScene;
  frameOffset?: number;
}) {
  const rawFrame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const motion = evidenceMotion(
    rawFrame - frameOffset,
    fps,
    scene.cueMs - scene.startMs,
  );
  const nodes: [number, number, number][] = [
    [-1.48, 0.4, 0],
    [0, 1.45, 0.05],
    [1.48, 0.4, 0],
  ];
  const vertical = height > width * 1.4;
  const titleSize = vertical ? 62 : 52;
  return (
    <AbsoluteFill
      style={{
        background: "#081722",
        color: ivory,
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, #173a48 0%, #081722 72%)",
        }}
      />
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        dpr={1}
        camera={{
          position: [0, 0.35, vertical ? 9.8 : 6.9],
          fov: 38,
          near: 0.1,
          far: 40,
        }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[-3, 5, 6]}
          intensity={3.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[3, 1, 2]} intensity={22} color="#74cbbb" />
        <group
          position={[0, -0.18 + motion.lift, 0]}
          rotation={[-0.09, motion.rotation, -0.035]}
          scale={0.92 + motion.reveal * 0.08}
        >
          <mesh position={[0, -0.62, -0.15]} castShadow receiveShadow>
            <boxGeometry args={[2.02, 1.44, 0.12]} />
            <meshStandardMaterial
              color="#244c58"
              metalness={0.35}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[-0.6, 0.13, -0.15]} castShadow>
            <boxGeometry args={[0.8, 0.2, 0.12]} />
            <meshStandardMaterial color="#315e67" roughness={0.55} />
          </mesh>
          {[-1, 0, 1].map((i) => (
            <Document
              key={i}
              position={[
                i * (0.2 + 0.2 * motion.opening),
                -0.5,
                -0.04 + (i + 1) * 0.075,
              ]}
              angle={-i * 0.12 * motion.opening}
              lift={motion.opening * (0.4 - Math.abs(i) * 0.07)}
            />
          ))}
          <group
            position={[0, -1.3, 0.24]}
            rotation={[-motion.opening * 0.65, 0, 0]}
          >
            <mesh position={[0, 0.47, 0]} castShadow>
              <boxGeometry args={[2.05, 0.94, 0.07]} />
              <meshStandardMaterial
                color="#355e68"
                metalness={0.25}
                roughness={0.55}
              />
            </mesh>
            <mesh position={[0, 0.62, 0.043]}>
              <boxGeometry args={[0.52, 0.025, 0.006]} />
              <meshStandardMaterial
                color={gold}
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
          </group>
          {nodes.map((node, i) => (
            <group key={i}>
              <Connection end={node} progress={motion.connections[i]} />
              <mesh position={node} scale={0.6 + motion.connections[i] * 0.4}>
                <sphereGeometry args={[0.085, 20, 16]} />
                <meshStandardMaterial
                  color={gold}
                  metalness={0.65}
                  roughness={0.25}
                  emissive={gold}
                  emissiveIntensity={motion.connections[i] * 0.25}
                />
              </mesh>
            </group>
          ))}
        </group>
      </ThreeCanvas>
      <div
        style={{
          position: "absolute",
          top: vertical ? "17%" : "11%",
          left: "9%",
          right: "9%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 3,
            background: gold,
            margin: "0 auto 30px",
          }}
        />
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: titleSize,
            lineHeight: 1.13,
            letterSpacing: -1.2,
          }}
        >
          {scene.title}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: vertical ? "70%" : "76%",
          left: "8%",
          right: "8%",
          display: "flex",
          gap: 16,
        }}
      >
        {scene.labels.map((label, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              textAlign: "center",
              opacity: 0.4 + motion.connections[i] * 0.6,
            }}
          >
            <div
              style={{
                height: 2,
                background: motion.connections[i] > 0.5 ? teal : "#355461",
                marginBottom: 20,
              }}
            />
            <div style={{ fontSize: 27, letterSpacing: 0.4 }}>{label}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: vertical ? "19%" : "9%",
          width: "100%",
          textAlign: "center",
          fontSize: 22,
          color: "#9bb0b5",
        }}
      >
        Esquema ilustrativo
      </div>
    </AbsoluteFill>
  );
}
