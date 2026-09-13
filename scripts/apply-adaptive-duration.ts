import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";

const ROOT = process.cwd();

const productionCode =
  process.env.PRODUCTION_CODE ??
  process.argv[2];

if (!productionCode) {
  throw new Error(
    "PRODUCTION_CODE is required",
  );
}

const specPath = path.join(
  ROOT,
  `examples/${productionCode}.video.json`,
);

const timelinePath = path.join(
  ROOT,
  `public/generated/${productionCode}-timeline.json`,
);

const audioPath = path.join(
  ROOT,
  `public/generated/${productionCode}-narration.mp3`,
);

if (!fs.existsSync(specPath)) {
  throw new Error(
    `Missing VideoSpec: ${specPath}`,
  );
}

if (!fs.existsSync(timelinePath)) {
  throw new Error(
    `Missing timeline: ${timelinePath}`,
  );
}

if (!fs.existsSync(audioPath)) {
  throw new Error(
    `Missing narration: ${audioPath}`,
  );
}

const spec = JSON.parse(
  fs.readFileSync(
    specPath,
    "utf8",
  ),
);

const timeline = JSON.parse(
  fs.readFileSync(
    timelinePath,
    "utf8",
  ),
);

const timelineDurationMs =
  Number(timeline.durationMs ?? 0);

if (
  !Number.isFinite(
    timelineDurationMs,
  ) ||
  timelineDurationMs <= 0
) {
  throw new Error(
    "Invalid timeline duration",
  );
}

// Medimos también el MP3 real.
// Así nunca cortamos la última palabra
// por una pequeña diferencia del timeline.
let audioDurationMs = 0;

try {
  const value = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      audioPath,
    ],
    {
      encoding: "utf8",
    },
  ).trim();

  audioDurationMs =
    Math.ceil(
      Number(value) * 1000,
    );
} catch {
  audioDurationMs =
    timelineDurationMs;
}

const narrationDurationMs =
  Math.max(
    timelineDurationMs,
    audioDurationMs,
  );

// El cierre se adapta también.
// Videos cortos: ~1,1 s.
// Videos largos: hasta ~1,8 s.
const closingHoldMs =
  Math.min(
    1800,
    Math.max(
      1100,
      Math.round(
        narrationDurationMs *
          0.018,
      ),
    ),
  );

const finalDurationMs =
  narrationDurationMs +
  closingHoldMs;

spec.target = {
  ...spec.target,

  // El valor final se obtiene
  // automáticamente del audio real.
  durationMode: "fixed",

  fixedDurationSec:
    Number(
      (
        finalDurationMs /
        1000
      ).toFixed(3),
    ),
};

fs.writeFileSync(
  specPath,
  JSON.stringify(
    spec,
    null,
    2,
  ),
);

const envelope = {
  productionCode,

  version:
    "V3.11-E-ADAPTIVE-DURATION",

  timelineDurationMs,

  audioDurationMs,

  narrationDurationMs,

  closingHoldMs,

  finalDurationMs,

  finalDurationSec:
    Number(
      (
        finalDurationMs /
        1000
      ).toFixed(3),
    ),
};

const outputPath = path.join(
  ROOT,
  `public/generated/${productionCode}-duration-envelope.json`,
);

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    envelope,
    null,
    2,
  ),
);

console.log(
  "======================================",
);

console.log(
  "V3.11-E ADAPTIVE DURATION",
);

console.log(
  `Production: ${productionCode}`,
);

console.log(
  `Narration: ${
    narrationDurationMs /
    1000
  } s`,
);

console.log(
  `Closing hold: ${
    closingHoldMs /
    1000
  } s`,
);

console.log(
  `FINAL VIDEO: ${
    finalDurationMs /
    1000
  } s`,
);

console.log(
  "======================================",
);
