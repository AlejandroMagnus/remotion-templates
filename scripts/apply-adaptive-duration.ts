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
  Number(
    timeline.durationMs ?? 0,
  );

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

// ==================================================
// DURACIÓN REAL DE NARRACIÓN
// ==================================================

// Además del timeline medimos el MP3 real.
// Así evitamos cortar la última palabra
// por pequeñas diferencias entre motores.

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

// ==================================================
// V3.12 — CINEMATIC END CARD ENVELOPE
// ==================================================
//
// Reglas permanentes:
//
// entrada:        0.45 s
// estable:        3.00 s
// seguridad:      0.50 s
//
// Total visual técnico:
//
// 3.95 s
//
// Añadimos además 0.15 s de respiración
// cinematográfica después de la narración.
//
// Reserva total:
//
// 4.10 s
//
// Esto evita:
// - cierre abrupto;
// - identidad cortada;
// - CTA ilegible;
// - última palabra superpuesta;
// - final demasiado comprimido.

const END_CARD_ENTER_MS =
  450;

const END_CARD_STABLE_MS =
  3000;

const END_CARD_SAFETY_MS =
  500;

const CINEMATIC_BREATH_MS =
  150;

const END_CARD_VISUAL_MS =
  END_CARD_ENTER_MS +
  END_CARD_STABLE_MS +
  END_CARD_SAFETY_MS;

const endCardReserveMs =
  END_CARD_VISUAL_MS +
  CINEMATIC_BREATH_MS;

// Conservamos este nombre también
// por compatibilidad con posibles
// consumidores anteriores del envelope.
const closingHoldMs =
  endCardReserveMs;

const finalDurationMs =
  narrationDurationMs +
  endCardReserveMs;

// ==================================================
// ACTUALIZACIÓN DEL VIDEOSPEC
// ==================================================

spec.target = {
  ...spec.target,

  // La duración final deja de depender
  // de un número escrito manualmente.
  //
  // Se calcula a partir de:
  //
  // narración real
  // +
  // cierre cinematográfico reservado.

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
// ==================================================
// ENVELOPE TÉCNICO DE DURACIÓN
// ==================================================

const envelope = {
  productionCode,

  version:
    "V3.12-HIGH-TICKET-END-CARD",

  timelineDurationMs,

  audioDurationMs,

  narrationDurationMs,

  cinematicBreathMs:
    CINEMATIC_BREATH_MS,

  endCard: {
    enterMs:
      END_CARD_ENTER_MS,

    stableMs:
      END_CARD_STABLE_MS,

    safetyMs:
      END_CARD_SAFETY_MS,

    visualDurationMs:
      END_CARD_VISUAL_MS,

    reserveMs:
      endCardReserveMs,
  },

  // Compatibilidad con versiones
  // anteriores del sistema.
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

// ==================================================
// GUARDADO DEL ENVELOPE
// ==================================================

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

// ==================================================
// VALIDACIONES
// ==================================================

if (
  finalDurationMs <=
  narrationDurationMs
) {
  throw new Error(
    "Final duration must exceed narration duration",
  );
}

if (
  endCardReserveMs <
  END_CARD_VISUAL_MS
) {
  throw new Error(
    "End Card reserve is insufficient",
  );
}

if (
  END_CARD_STABLE_MS <
  3000
) {
  throw new Error(
    "End Card stable visibility must be at least 3000 ms",
  );
}

if (
  END_CARD_SAFETY_MS <
  500
) {
  throw new Error(
    "End Card safety tail must be at least 500 ms",
  );
}

// ==================================================
// INFORME
// ==================================================

console.log(
  "======================================",
);

console.log(
  "V3.12 ADAPTIVE DURATION + END CARD",
);

console.log(
  `Production: ${productionCode}`,
);

console.log(
  `Timeline: ${
    timelineDurationMs /
    1000
  } s`,
);

console.log(
  `Audio: ${
    audioDurationMs /
    1000
  } s`,
);

console.log(
  `Narration: ${
    narrationDurationMs /
    1000
  } s`,
);

console.log(
  `Cinematic breath: ${
    CINEMATIC_BREATH_MS /
    1000
  } s`,
);

console.log(
  `End Card entrance: ${
    END_CARD_ENTER_MS /
    1000
  } s`,
);

console.log(
  `End Card stable: ${
    END_CARD_STABLE_MS /
    1000
  } s`,
);

console.log(
  `End Card safety: ${
    END_CARD_SAFETY_MS /
    1000
  } s`,
);

console.log(
  `Total closing reserve: ${
    endCardReserveMs /
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
