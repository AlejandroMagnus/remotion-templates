import fs from "node:fs";
import path from "node:path";

import {
  buildSilecStrategicPacket,
} from "../src/content/SilecContentAdapter";

import {
  VIDEO_JURIDICO_002_SILEC,
} from "../content/video-juridico-002.silec";

const packet =
  buildSilecStrategicPacket(
    VIDEO_JURIDICO_002_SILEC,
  );

const output = path.join(
  process.cwd(),
  "public/generated/video-juridico-002-strategic-content.json",
);

fs.mkdirSync(
  path.dirname(output),
  {recursive: true},
);

fs.writeFileSync(
  output,
  JSON.stringify(
    packet,
    null,
    2,
  ),
);

console.log(
  "=== V3.11-A KNOWLEDGE-TO-OPPORTUNITY BRIDGE ===",
);

console.log(
  `Production: ${packet.productionCode}`,
);

console.log(
  `Source: ${packet.source.module}`,
);

console.log(
  `Topic: ${packet.knowledge.topic}`,
);

console.log(
  `Commercial objective: ${packet.strategicObjective.commercialObjective}`,
);

console.log(
  `Q∞ strategic value: ${packet.qInfinity.strategicValue}/100`,
);

console.log(
  `Generated: ${output}`,
);
