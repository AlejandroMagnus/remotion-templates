import type {
  QInfinityStrategicContentPacket,
} from "../strategy/QInfinityStrategicContentPacket";

type VideoScene =
  | {
      id: string;
      kind: "hero";
      content: {
        title: string;
        subtitle: string;
      };
      timing: {
        durationMs: number;
      };
    }
  | {
      id: string;
      kind: "statement";
      content: {
        title: string;
        subtitle: string;
      };
      timing: {
        durationMs: number;
      };
    }
  | {
      id: string;
      kind: "mechanism";
      content: {
        title: string;
        before: string;
        after: string;
      };
      timing: {
        durationMs: number;
      };
    }
  | {
      id: string;
      kind: "points";
      content: {
        title: string;
        points: string[];
      };
      timing: {
        durationMs: number;
      };
    }
  | {
      id: string;
      kind: "cta";
      content: {
        line1: string;
        line2: string;
      };
      timing: {
        durationMs: number;
      };
    };

export type AutomaticVideoSpec = {
  schemaVersion: "1.0";
  id: string;

  templateFamily: "announcement-brief";

  meta: {
    title: string;
    description: string;
    tags: string[];
  };

  target: {
    aspect: "9:16";
    fps: 30;
    durationMode: "fixed";
    fixedDurationSec: number;
  };

  style: {
    theme: "editorial-dark";
    variant: "default";
    safeAreaProfile: "metaSafe";
    showSceneLabels: false;
  };

  audio: {
    mode: "narration";
    narrationText: string;
    narrationSrc: string;
    narrationVolume: number;
    musicVolume: number;
    ducking: boolean;
  };

  assets: Record<string, never>;

  scenes: VideoScene[];
};

const clean = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .trim();

const withoutFinalPeriod = (
  value: string,
) =>
  clean(value).replace(/[.!?]+$/, "");

const shorten = (
  value: string,
  max = 88,
) => {
  const text = clean(value);

  if (text.length <= max) {
    return text;
  }

  return `${text.slice(
    0,
    max - 1,
  ).trim()}…`;
};

function buildNarration(
  packet: QInfinityStrategicContentPacket,
) {
  const chain =
    packet.knowledge.reasoningChain;

  const steps = [
    chain[0],
    chain[1],
    chain[2],
    chain[4],
    chain[5],
    chain[7],
    chain[8],
  ]
    .filter(Boolean)
    .map(withoutFinalPeriod);

  const body = [
    steps[0]
      ? `Primero, ${steps[0].toLowerCase()}.`
      : "",

    steps[1]
      ? `Después, ${steps[1].toLowerCase()}.`
      : "",

    steps[2]
      ? `Hay que ${steps[2]
          .replace(
            /^(determinar|identificar|examinar)\s+/i,
            "",
          )
          .toLowerCase()}.`
      : "",

    steps[3]
      ? `Solo entonces corresponde ${steps[3].toLowerCase()}.`
      : "",

    steps[4]
      ? `${steps[4]}.`
      : "",

    steps[5]
      ? `Luego, ${steps[5].toLowerCase()}.`
      : "",

    steps[6]
      ? `Finalmente, ${steps[6].toLowerCase()}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return clean(
    [
      packet.audiovisual.hook,

      body,

      packet.knowledge.conclusion,

      packet.audiovisual.cta,
    ].join(" "),
  );
}

export function buildAutomaticVideoSpec(
  packet: QInfinityStrategicContentPacket,
): AutomaticVideoSpec {
  const chain =
    packet.knowledge.reasoningChain;

  const narration =
    buildNarration(packet);

  return {
    schemaVersion: "1.0",

    id: packet.productionCode,

    templateFamily:
      "announcement-brief",

    meta: {
      title:
        packet.knowledge.topic,

      description:
        packet.knowledge.centralThesis,

      tags: [
        "derecho",
        "silec",
        "estrategia",
        "prueba",
        "teoria-del-caso",
        "bolivia",
      ],
    },

    target: {
      // Por ahora este es el perfil de salida.
      // La arquitectura seguirá preparada
      // para responsive posteriormente.
      aspect: "9:16",

      fps: 30,

      durationMode: "fixed",

      fixedDurationSec: 60,
    },

    style: {
      theme: "editorial-dark",
      variant: "default",
      safeAreaProfile: "metaSafe",
      showSceneLabels: false,
    },

    audio: {
      mode: "narration",

      narrationText:
        narration,

      narrationSrc:
        `public/generated/${packet.productionCode}-narration.mp3`,

      narrationVolume: 1,

      musicVolume: 0.08,

      ducking: true,
    },

    assets: {},

    scenes: [
      {
        id: "hook",

        kind: "hero",

        content: {
          title:
            "¿Dónde comienza una estrategia jurídica sólida?",

          subtitle:
            "No comienza acumulando normas",
        },

        timing: {
          durationMs: 8000,
        },
      },

      {
        id: "hechos",

        kind: "statement",

        content: {
          title:
            shorten(
              chain[0] ??
                "Identificar los hechos relevantes",
            ),

          subtitle:
            "Primero debemos entender qué ocurrió realmente",
        },

        timing: {
          durationMs: 9000,
        },
      },

      {
        id: "prueba",

        kind: "mechanism",

        content: {
          title:
            "Del relato al caso demostrable",

          before:
            shorten(
              chain[1] ??
                "Afirmaciones",
              45,
            ),

          after:
            shorten(
              chain[2] ??
                "Prueba disponible",
              45,
            ),
        },

        timing: {
          durationMs: 10000,
        },
      },

      {
        id: "derecho",

        kind: "statement",

        content: {
          title:
            "El Derecho viene después de comprender el problema",

          subtitle:
            shorten(
              chain[3] ??
                packet
                  .knowledge
                  .centralThesis,
            ),
        },

        timing: {
          durationMs: 8000,
        },
      },

      {
        id: "estrategia",

        kind: "points",

        content: {
          title:
            "La estrategia integra",

          points: [
            shorten(
              chain[4] ??
                "Jurisprudencia pertinente",
              70,
            ),

            shorten(
              chain[5] ??
                "Teoría del caso coherente",
              70,
            ),

            shorten(
              chain[6] ??
                "Estrategia y posición adversa",
              70,
            ),
          ],
        },

        timing: {
          durationMs: 11000,
        },
      },

      {
        id: "decision",

        kind: "statement",

        content: {
          title:
            "No basta con tener razón",

          subtitle:
            "La estrategia debe ser demostrable, ejecutable y consciente de sus riesgos",
        },

        timing: {
          durationMs: 7000,
        },
      },

      {
        id: "cta",

        kind: "cta",

        content: {
          line1:
            "Primero diagnostica el problema",

          line2:
            "Después decide cómo actuar",
        },

        timing: {
          durationMs: 7000,
        },
      },
    ],
  };
}
