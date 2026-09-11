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
  language?: string;
  voice?: string;
  wordCount?: number;
  durationMs?: number;
  words: WordTiming[];
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

const keywords = new Set(
  [
    "autoridad",
    "recurso",
    "argumentos",
    "motivacion",
    "prueba",
    "resolucion",
    "derechos",
    "plazos",
    "impugnacion",
    "decision",
    "expediente",
  ].map(normalize),
);

const isValidTimeline = (value: unknown): value is Timeline => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Timeline;

  if (!Array.isArray(candidate.words) || candidate.words.length === 0) {
    return false;
  }

  return candidate.words.every((word) => {
    return (
      typeof word.text === "string" &&
      word.text.length > 0 &&
      Number.isFinite(word.startMs) &&
      Number.isFinite(word.endMs) &&
      word.startMs >= 0 &&
      word.endMs >= word.startMs
    );
  });
};

export function WordSyncOverlay() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const [timeline, setTimeline] = useState<Timeline | null>(null);

  const [renderHandle] = useState(() =>
    delayRender("Cargando timeline sincronizado V2"),
  );

  useEffect(() => {
    const url = staticFile(
      "generated/video-juridico-001-timeline.json",
    );

    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `No se pudo cargar timeline: HTTP ${response.status}`,
          );
        }

        return response.json();
      })
      .then((data: unknown) => {
        if (!isValidTimeline(data)) {
          throw new Error(
            "Timeline invalido o sin palabras sincronizadas",
          );
        }

        setTimeline(data);
        continueRender(renderHandle);
      })
      .catch((error: unknown) => {
        const safeError =
          error instanceof Error
            ? error
            : new Error(String(error));

        cancelRender(safeError);
      });
  }, [renderHandle]);

  if (!timeline) {
    return null;
  }

  const nowMs = (frame / fps) * 1000;
  const words = timeline.words;

  let activeIndex = -1;

  for (let index = 0; index < words.length; index++) {
    const word = words[index];

    if (
      nowMs >= word.startMs &&
      nowMs < word.endMs
    ) {
      activeIndex = index;
      break;
    }

    if (
      word.startMs <= nowMs &&
      nowMs <= word.endMs + 250
    ) {
      activeIndex = index;
    }
  }

  if (activeIndex < 0) {
    return null;
  }

  const activeWord = words[activeIndex];

  if (nowMs > activeWord.endMs + 350) {
    return null;
  }

  const wordsPerCaption = 6;

  const captionStart =
    Math.floor(activeIndex / wordsPerCaption) *
    wordsPerCaption;

  const captionEnd = Math.min(
    words.length,
    captionStart + wordsPerCaption,
  );

  const visibleWords = words.slice(
    captionStart,
    captionEnd,
  );

  const activeIsKeyword = keywords.has(
    normalize(activeWord.text),
  );

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 100,
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 145,
      }}
    >
      {activeIsKeyword ? (
        <div
          style={{
            position: "absolute",
            top: 120,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "18px 34px",
            borderRadius: 24,
            background: "rgba(236,150,125,0.96)",
            color: "#171c1a",
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: 43,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            boxShadow:
              "0 16px 50px rgba(0,0,0,0.28)",
            whiteSpace: "nowrap",
          }}
        >
          {activeWord.text}
        </div>
      ) : null}

      <div
        style={{
          maxWidth: "88%",
          padding: "22px 30px",
          borderRadius: 28,
          background: "rgba(0,0,0,0.76)",
          textAlign: "center",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: 38,
          lineHeight: 1.28,
          fontWeight: 600,
          boxShadow:
            "0 16px 50px rgba(0,0,0,0.30)",
        }}
      >
        {visibleWords.map((word, localIndex) => {
          const globalIndex =
            captionStart + localIndex;

          const active =
            globalIndex === activeIndex;

          return (
            <span
              key={`${word.startMs}-${globalIndex}-${word.text}`}
              style={{
                color: active
                  ? "#ec967d"
                  : "#ffffff",
                fontWeight: active ? 800 : 500,
                transform: active
                  ? "scale(1.09)"
                  : "scale(1)",
                display: "inline-block",
                marginRight: 10,
                transition: "none",
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
