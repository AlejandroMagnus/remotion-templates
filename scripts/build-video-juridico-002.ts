import fs from "node:fs";
import path from "node:path";

import type {
  QInfinityStrategicContentPacket,
} from "../src/strategy/QInfinityStrategicContentPacket";

import {
  buildAutomaticVideoSpec,
} from "../src/content/AutomaticScriptDirector";

const ROOT =
  process.cwd();

const packetPath =
  path.join(
    ROOT,
    "public/generated/video-juridico-002-strategic-content.json",
  );

if (
  !fs.existsSync(packetPath)
) {
  throw new Error(
    `Strategic content packet missing: ${packetPath}`,
  );
}

const packet =
  JSON.parse(
    fs.readFileSync(
      packetPath,
      "utf8",
    ),
  ) as QInfinityStrategicContentPacket;

const spec =
  buildAutomaticVideoSpec(
    packet,
  );

const specPath =
  path.join(
    ROOT,
    "examples/video-juridico-002.video.json",
  );

const scriptPath =
  path.join(
    ROOT,
    "public/generated/video-juridico-002-script.json",
  );

fs.writeFileSync(
  specPath,
  JSON.stringify(
    spec,
    null,
    2,
  ),
);

fs.writeFileSync(
  scriptPath,
  JSON.stringify(
    {
      productionCode:
        spec.id,

      version:
        "V3.11-B-AUTOMATIC-SCRIPT-DIRECTOR",

      source:
        packet.source,

      narration:
        spec.audio
          .narrationText,

      scenes:
        spec.scenes,

      strategicObjective:
        packet
          .strategicObjective,

      qInfinity:
        packet.qInfinity,
    },
    null,
    2,
  ),
);

console.log(
  "=== V3.11-B AUTOMATIC SCRIPT DIRECTOR ===",
);

console.log(
  `Production: ${spec.id}`,
);

console.log(
  `Scenes: ${spec.scenes.length}`,
);

console.log(
  `Narration words: ${
    spec.audio.narrationText
      .split(/\s+/)
      .filter(Boolean)
      .length
  }`,
);

console.log(
  `VideoSpec: ${specPath}`,
);

console.log(
  `Script packet: ${scriptPath}`,
);
