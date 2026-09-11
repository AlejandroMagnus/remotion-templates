import React, {useEffect, useState} from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type WordTiming = {
  text: string;
  startMs: number;
  endMs: number;
};

type Timeline = {
  schemaVersion: string;
  words: WordTiming[];
};

const keywords = new Set([
  "autoridad",
  "recurso",
  "argumentos",
  "motivación",
  "prueba",
  "resolución",
  "derechos",
  "plazos",
  "impugnación",
]);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

export function WordSyncOverlay() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [handle] = useState(() =>
    delayRender("Cargando timeline palabra por palabra"),
  );

  useEffect(() => {
    fetch(
      staticFile(
        "generated/video-juridico-001-timeline.json",
      ),
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("No se pudo cargar el timeline");
        }
        return response.json();
      })
      .then((data: Timeline) => {
        setTimeline(data);
        continueRender(handle);
      })
      .catch((error) => cancelRender(error));
  }, [handle]);

  if (!timeline?.words?.length) return null;

  const nowMs = (frame / fps) * 1000;

  let activeIndex = -1;

  for (let i = 0; i < timeline.words.length; i++) {
    const word = timeline.words[i];

    if (nowMs >= word.startMs && nowMs < word.endMs) {
      activeIndex = i;
      break;
    }

    if (word.startMs <= nowMs) {
      activeIndex = i;
    }
  }

  if (activeIndex < 0) return null;

  const start = Math.max(0, activeIndex - 2);
  const end = Math.min(
    timeline.words.length,
    activeIndex + 4,
  );

  const visibleWords = timeline.words.slice(start, end);
  const activeWord = timeline.words[activeIndex];
  const isKeyword = keywords.has(normalize(activeWord.text));

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 150,
      }}
    >
      {isKeyword ? (
        <div
          style={{
            position: "absolute",
            top: 130,
            padding: "18px 32px",
            borderRadius: 24,
            background: "rgba(236,150,125,0.92)",
            color: "#171c1a",
            fontSize: 44,
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          {activeWord.text}
        </div>
      ) : null}

      <div
        style={{
          maxWidth: "86%",
          padding: "22px 30px",
          borderRadius: 28,
          background: "rgba(0,0,0,0.72)",
          textAlign: "center",
          fontSize: 38,
          lineHeight: 1.25,
          fontWeight: 600,
        }}
      >
        {visibleWords.map((word, index) => {
          const globalIndex = start + index;
          const active = globalIndex === activeIndex;

          return (
            <span
              key={`${word.startMs}-${word.text}`}
              style={{
                color: active ? "#ec967d" : "#ffffff",
                fontWeight: active ? 800 : 500,
                transform: active ? "scale(1.08)" : "scale(1)",
                display: "inline-block",
                marginRight: 10,
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
