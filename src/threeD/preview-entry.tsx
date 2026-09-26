import React from "react";
import { Composition, registerRoot } from "remotion";
import pilot from "../../examples/native-3d-pilot.video.json";
import { ResolvedAssetLayer } from "../ResolvedAssetLayer";
import {
  dimensions,
  durationInFrames,
  VideoSpecSchema,
  type VideoSpec,
} from "../schema";

// Isolated visual QA entry: same production asset layer, no generated narration.
function NativePilot({ spec }: { spec: VideoSpec }) {
  return <ResolvedAssetLayer productionCode={spec.id} threeD={spec.threeD} />;
}

function Root() {
  const spec = VideoSpecSchema.parse(pilot);
  return (
    <Composition
      id="Native3DPilot"
      component={NativePilot}
      defaultProps={{ spec }}
      {...dimensions(spec.target.aspect)}
      fps={spec.target.fps}
      durationInFrames={durationInFrames(spec)}
      calculateMetadata={({ props }) => {
        const parsed = VideoSpecSchema.parse(props.spec);
        return {
          ...dimensions(parsed.target.aspect),
          fps: parsed.target.fps,
          durationInFrames: durationInFrames(parsed),
        };
      }}
    />
  );
}

registerRoot(Root);
