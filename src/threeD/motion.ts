/** Pure, seekable animation: no wall clock, randomness or useFrame loop. */
export function evidenceMotion(
  frame: number,
  fps: number,
  cueOffsetMs: number,
) {
  const seconds = Math.max(0, frame / fps);
  const ease = (value: number) => {
    const t = Math.min(1, Math.max(0, value));
    return t * t * (3 - 2 * t);
  };
  const cue = Math.max(0, cueOffsetMs / 1000);
  return {
    reveal: ease(seconds / 0.65),
    opening: ease((seconds - cue) / 1.1),
    connections: [0, 0.35, 0.7].map((delay) =>
      ease((seconds - cue - delay) / 0.75),
    ),
    rotation: -0.18 + Math.min(seconds, 10) * 0.025,
    lift: Math.sin(Math.min(seconds, 10) * 0.65) * 0.035,
  };
}
