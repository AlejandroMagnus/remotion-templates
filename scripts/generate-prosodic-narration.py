#!/usr/bin/env python3

import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
import wave
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

import edge_tts


# ============================================================
# V3.18-E — SYNTACTIC-SEMANTIC PROSODY DIRECTOR
#
# Objetivo:
#   sintaxis + puntuación + significado + intención creativa
#   → pausas + velocidad + tono
#   → TTS
#   → WordBoundary
#   → timeline sincronizado
#
# PRINCIPIO DE SEGURIDAD:
# No se altera manualmente la sincronización de palabras.
# WordBoundary continúa siendo la fuente temporal de verdad.
# ============================================================


ROOT = Path.cwd()

PRODUCTION_CODE = os.environ.get("PRODUCTION_CODE") or (
    sys.argv[1] if len(sys.argv) > 1 else None
)

if not PRODUCTION_CODE:
    raise RuntimeError("PRODUCTION_CODE is required")


SPEC = ROOT / f"examples/{PRODUCTION_CODE}.video.json"

AUDIO = ROOT / (
    f"public/generated/{PRODUCTION_CODE}-narration.mp3"
)

TIMELINE = ROOT / (
    f"public/generated/{PRODUCTION_CODE}-timeline.json"
)

SRT = ROOT / (
    f"public/generated/{PRODUCTION_CODE}.srt"
)

PROSODY_PLAN = ROOT / (
    f"public/generated/{PRODUCTION_CODE}-prosody-plan.json"
)

CREATIVE_DECISION = ROOT / (
    f"public/generated/{PRODUCTION_CODE}-creative-decision.json"
)


VOICE = "es-BO-MarceloNeural"
LANGUAGE = "es-BO"
SAMPLE_RATE = 24_000

VERSION = "V3.18-E-SYNTACTIC-SEMANTIC-PROSODY"


# ============================================================
# PERFILES BASE
# ============================================================


@dataclass(frozen=True)
class ProsodyProfile:
    role: str
    rate: str
    pitch: str
    pre_pause_ms: int
    post_pause_ms: int


PROFILES = {
    "opening_question": ProsodyProfile(
        role="opening_question",
        rate="-12%",
        pitch="+2Hz",
        pre_pause_ms=350,
        post_pause_ms=700,
    ),

    "question": ProsodyProfile(
        role="question",
        rate="-10%",
        pitch="+2Hz",
        pre_pause_ms=0,
        post_pause_ms=520,
    ),

    "warning": ProsodyProfile(
        role="warning",
        rate="-8%",
        pitch="-2Hz",
        pre_pause_ms=0,
        post_pause_ms=380,
    ),

    "authority": ProsodyProfile(
        role="authority",
        rate="-6%",
        pitch="-1Hz",
        pre_pause_ms=0,
        post_pause_ms=300,
    ),

    "cta": ProsodyProfile(
        role="cta",
        rate="-10%",
        pitch="-1Hz",
        pre_pause_ms=100,
        post_pause_ms=500,
    ),

    "explanation": ProsodyProfile(
        role="explanation",
        rate="-5%",
        pitch="+0Hz",
        pre_pause_ms=0,
        post_pause_ms=240,
    ),
}


# ============================================================
# PERFIL CREATIVO V3.18
# ============================================================


CREATIVE_RATE_ADJUSTMENT = {
    "authoritative": -1,
    "dramatic-controlled": -3,
    "professorial": -2,
    "investigative": -2,
    "executive": 1,
    "contrastive": -1,
    "decisive": 1,
    "analytical": -2,
}


CREATIVE_PAUSE_MULTIPLIER = {
    "authoritative": 1.08,
    "dramatic-controlled": 1.20,
    "professorial": 1.15,
    "investigative": 1.12,
    "executive": 0.92,
    "contrastive": 1.05,
    "decisive": 0.90,
    "analytical": 1.12,
}


def load_creative_prosody() -> Optional[str]:
    if not CREATIVE_DECISION.exists():
        return None

    try:
        data = json.loads(
            CREATIVE_DECISION.read_text(
                encoding="utf-8"
            )
        )

        selected = data.get(
            "selected",
            {},
        )

        value = selected.get(
            "prosody"
        )

        if isinstance(value, str) and value.strip():
            return value.strip()

    except Exception as error:
        print(
            "ADVERTENCIA: no se pudo leer "
            "CreativeProfile: "
            f"{error}"
        )

    return None


def percentage_value(
    value: str,
) -> int:
    clean = value.strip().replace(
        "%",
        "",
    )

    try:
        return int(clean)
    except ValueError:
        return 0


def adjust_rate(
    rate: str,
    creative_prosody: Optional[str],
) -> str:
    base = percentage_value(rate)

    adjustment = (
        CREATIVE_RATE_ADJUSTMENT.get(
            creative_prosody or "",
            0,
        )
    )

    result = max(
        -25,
        min(
            15,
            base + adjustment,
        ),
    )

    return f"{result:+d}%"


def pause_multiplier(
    creative_prosody: Optional[str],
) -> float:
    return CREATIVE_PAUSE_MULTIPLIER.get(
        creative_prosody or "",
        1.0,
    )


# ============================================================
# NORMALIZACIÓN
# ============================================================


def normalize(value: str) -> str:
    value = unicodedata.normalize(
        "NFD",
        value.lower(),
    )

    value = "".join(
        ch
        for ch in value
        if unicodedata.category(ch) != "Mn"
    )

    return re.sub(
        r"\s+",
        " ",
        value,
    ).strip()


def clean_spaces(
    value: str,
) -> str:
    return re.sub(
        r"\s+",
        " ",
        value,
    ).strip()


# ============================================================
# MOTOR SINTÁCTICO
# ============================================================


@dataclass(frozen=True)
class SyntaxUnit:
    text: str
    terminal_mark: str
    pause_after_ms: int
    semantic_break: bool


def punctuation_pause(
    terminal_mark: str,
) -> int:
    """
    Pausa EXTERNA añadida después de cada unidad.

    edge-tts conserva su propia entonación interna.
    Estas pausas sirven para impedir que las ideas
    queden acústicamente pegadas.
    """

    if terminal_mark in ("?", "¿"):
        return 500

    if terminal_mark in ("!", "¡"):
        return 430

    if terminal_mark == ".":
        return 400

    if terminal_mark == ";":
        return 300

    if terminal_mark == ":":
        return 260

    if terminal_mark == ",":
        return 150

    if terminal_mark in ("—", "–"):
        return 210

    return 0


def split_major_sentences(
    text: str,
) -> list[str]:
    clean = clean_spaces(text)

    if not clean:
        return []

    parts = re.split(
        r"(?<=[.!?])\s+(?=[¿¡A-ZÁÉÍÓÚÑ0-9])",
        clean,
    )

    return [
        part.strip()
        for part in parts
        if part.strip()
    ]


def split_syntax_units(
    sentence: str,
) -> list[SyntaxUnit]:
    """
    Divide una oración larga en unidades pronunciables.

    No se fragmenta por cualquier coma:
    solo se utiliza una coma como frontera cuando
    la unidad previa tiene suficiente longitud.
    Esto evita una locución robótica.
    """

    text = clean_spaces(sentence)

    if not text:
        return []

    raw_parts = re.split(
        r"(?<=[,;:])\s+|(?<=[—–])\s+",
        text,
    )

    if len(raw_parts) == 1:
        mark = (
            text[-1]
            if text[-1] in ".,;:?!"
            else ""
        )

        return [
            SyntaxUnit(
                text=text,
                terminal_mark=mark,
                pause_after_ms=punctuation_pause(
                    mark
                ),
                semantic_break=mark in ".?!",
            )
        ]

    result: list[SyntaxUnit] = []
    buffer = ""

    for raw in raw_parts:
        part = clean_spaces(raw)

        if not part:
            continue

        candidate = (
            f"{buffer} {part}".strip()
            if buffer
            else part
        )

        mark = (
            part[-1]
            if part[-1] in ".,;:?!—–"
            else ""
        )

        word_count = len(
            candidate.split()
        )

        should_close = (
            mark in ";:"
            or mark in "?!."
            or (
                mark == ","
                and word_count >= 5
            )
            or (
                mark in "—–"
                and word_count >= 4
            )
        )

        if should_close:
            result.append(
                SyntaxUnit(
                    text=candidate,
                    terminal_mark=mark,
                    pause_after_ms=punctuation_pause(
                        mark
                    ),
                    semantic_break=mark in ".?!;:",
                )
            )

            buffer = ""

        else:
            buffer = candidate

    if buffer:
        mark = (
            buffer[-1]
            if buffer[-1] in ".,;:?!"
            else ""
        )

        result.append(
            SyntaxUnit(
                text=buffer,
                terminal_mark=mark,
                pause_after_ms=punctuation_pause(
                    mark
                ),
                semantic_break=mark in ".?!",
            )
        )

    return result


# ============================================================
# INTENCIÓN SEMÁNTICA
# ============================================================


def should_question_opening(
    sentence: str,
    tags: list[str],
) -> bool:
    if sentence.startswith("¿"):
        return True

    value = normalize(sentence)
    tag_text = normalize(
        " ".join(tags)
    )

    interrogative_starts = (
        "puede ",
        "podria ",
        "es posible ",
        "sabia ",
        "que ocurre ",
        "que pasa ",
    )

    tension_markers = (
        "aun asi",
        "sin embargo",
        "pero ",
        "perder",
        "riesgo",
        "costoso",
        "alto valor",
    )

    strategic_context = any(
        token in tag_text
        for token in (
            "high-ticket",
            "estrategia",
            "controvers",
        )
    )

    return (
        value.startswith(
            interrogative_starts
        )
        and any(
            marker in value
            for marker in tension_markers
        )
        and strategic_context
    )


def transform_opening(
    sentence: str,
    tags: list[str],
) -> tuple[str, bool]:
    if not should_question_opening(
        sentence,
        tags,
    ):
        return (
            sentence,
            sentence.startswith("¿"),
        )

    if sentence.startswith("¿"):
        return sentence, True

    core = (
        sentence
        .rstrip()
        .rstrip(".!?")
    )

    return (
        f"¿{core}?",
        True,
    )


def classify_role(
    sentence: str,
    index: int,
    total: int,
    tags: list[str],
    opening_is_question: bool = False,
) -> str:
    value = normalize(sentence)

    if (
        index == 0
        and opening_is_question
    ):
        return "opening_question"

    if (
        sentence.startswith("¿")
        or "¿" in sentence
        or value.startswith(
            (
                "por que ",
                "como ",
                "que ocurre ",
                "que pasa ",
            )
        )
    ):
        return "question"

    cta_markers = (
        "antes de actuar",
        "antes de que",
        "diagnostique",
        "consulte",
        "evalúe",
        "evalue",
        "decida",
        "proteja",
    )

    if (
        index == total - 1
        or any(
            marker in value
            for marker in cta_markers
        )
    ):
        if any(
            marker in value
            for marker in cta_markers
        ):
            return "cta"

    warning_markers = (
        "riesgo",
        "costoso",
        "errores",
        "perder",
        "sin diagnostico",
        "sin preservar",
        "sin prever",
        "demasiado costoso",
        "compromete patrimonio",
        "daño",
        "conflicto",
    )

    if any(
        marker in value
        for marker in warning_markers
    ):
        return "warning"

    authority_markers = (
        "corresponde",
        "estrategia profesional",
        "control constitucional",
        "normas",
        "jurisprudencia",
        "debe anticipar",
        "debe resistir",
        "decision favorable",
        "resultado ejecutable",
        "juridicamente defendible",
        "jurídicamente defendible",
    )

    if any(
        marker in value
        for marker in authority_markers
    ):
        return "authority"

    return "explanation"


# ============================================================
# PLAN PROSÓDICO
# ============================================================


@dataclass
class SegmentPlan:
    index: int
    original_text: str
    spoken_text: str
    role: str
    rate: str
    pitch: str
    pre_pause_ms: int
    post_pause_ms: int
    punctuation_pause_ms: int
    terminal_mark: str
    semantic_break: bool


def build_segment_plan(
    narration: str,
    tags: list[str],
    creative_prosody: Optional[str],
) -> list[SegmentPlan]:
    major_sentences = split_major_sentences(
        narration
    )

    if not major_sentences:
        raise RuntimeError(
            "No se detectaron segmentos narrativos"
        )

    prepared: list[
        tuple[
            str,
            str,
            bool,
            SyntaxUnit,
        ]
    ] = []

    for sentence_index, sentence in enumerate(
        major_sentences
    ):
        spoken_sentence = sentence
        opening_is_question = False

        if sentence_index == 0:
            (
                spoken_sentence,
                opening_is_question,
            ) = transform_opening(
                sentence,
                tags,
            )

        units = split_syntax_units(
            spoken_sentence
        )

        for unit in units:
            prepared.append(
                (
                    sentence,
                    unit.text,
                    opening_is_question,
                    unit,
                )
            )

    if not prepared:
        raise RuntimeError(
            "No se generaron unidades sintácticas"
        )

    result: list[SegmentPlan] = []
    total = len(prepared)

    multiplier = pause_multiplier(
        creative_prosody
    )

    for index, (
        original_sentence,
        spoken_text,
        opening_is_question,
        unit,
    ) in enumerate(prepared):

        role = classify_role(
            spoken_text,
            index,
            total,
            tags,
            (
                opening_is_question
                and index == 0
            ),
        )

        profile = PROFILES[role]

        syntactic_pause = round(
            unit.pause_after_ms
            * multiplier
        )

        role_pause = round(
            profile.post_pause_ms
            * multiplier
        )

        # No sumamos ciegamente ambas pausas.
        # Elegimos la pausa dominante para mantener
        # naturalidad y evitar silencios excesivos.
        post_pause = max(
            syntactic_pause,
            role_pause,
        )

        # Una ruptura semántica merece un pequeño
        # margen adicional de respiración.
        if (
            unit.semantic_break
            and role
            not in (
                "opening_question",
                "question",
                "cta",
            )
        ):
            post_pause += round(
                70 * multiplier
            )

        result.append(
            SegmentPlan(
                index=index,
                original_text=original_sentence,
                spoken_text=spoken_text,
                role=profile.role,
                rate=adjust_rate(
                    profile.rate,
                    creative_prosody,
                ),
                pitch=profile.pitch,
                pre_pause_ms=round(
                    profile.pre_pause_ms
                    * multiplier
                ),
                post_pause_ms=post_pause,
                punctuation_pause_ms=
                    syntactic_pause,
                terminal_mark=
                    unit.terminal_mark,
                semantic_break=
                    unit.semantic_break,
            )
        )

    return result
    # ============================================================
# SÍNTESIS TTS
# ============================================================


async def synthesize_segment_once(
    text: str,
    rate: str,
    pitch: str,
    output_file: Path,
) -> list[dict]:
    if output_file.exists():
        output_file.unlink()

    communicate = edge_tts.Communicate(
        text=text,
        voice=VOICE,
        rate=rate,
        pitch=pitch,
        boundary="WordBoundary",
        connect_timeout=20,
        receive_timeout=90,
    )

    words: list[dict] = []

    with output_file.open("wb") as audio_file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_file.write(
                    chunk["data"]
                )

            elif chunk["type"] == "WordBoundary":
                start_ms = round(
                    chunk["offset"]
                    / 10000
                )

                duration_ms = round(
                    chunk["duration"]
                    / 10000
                )

                words.append(
                    {
                        "text":
                            chunk["text"],

                        "startMs":
                            start_ms,

                        "endMs":
                            (
                                start_ms
                                + duration_ms
                            ),
                    }
                )

    if (
        not output_file.exists()
        or output_file.stat().st_size == 0
    ):
        raise RuntimeError(
            "No se generó audio para segmento: "
            f"{text}"
        )

    if not words:
        raise RuntimeError(
            "No se generaron WordBoundary "
            f"para segmento: {text}"
        )

    return words


async def synthesize_segment(
    segment: SegmentPlan,
    output_file: Path,
) -> list[dict]:
    last_error = None

    for attempt in range(
        1,
        4,
    ):
        try:
            print(
                f"Segmento {segment.index + 1} | "
                f"{segment.role} | "
                f"signo={segment.terminal_mark or 'none'} | "
                f"pausa={segment.post_pause_ms}ms | "
                f"rate={segment.rate} | "
                f"intento {attempt}/3"
            )

            return await synthesize_segment_once(
                segment.spoken_text,
                segment.rate,
                segment.pitch,
                output_file,
            )

        except Exception as error:
            last_error = error

            if output_file.exists():
                output_file.unlink()

            print(
                "Fallo TTS: "
                f"{type(error).__name__}: "
                f"{error}"
            )

            if attempt < 3:
                await asyncio.sleep(
                    3 * attempt
                )

    raise RuntimeError(
        "TTS falló después de 3 intentos "
        f"para segmento {segment.index + 1}. "
        f"Último error: {last_error}"
    )


# ============================================================
# AUDIO
# ============================================================


def probe_duration_ms(
    audio_file: Path,
) -> int:
    value = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            (
                "default="
                "noprint_wrappers=1:"
                "nokey=1"
            ),
            str(audio_file),
        ],
        text=True,
    ).strip()

    duration = float(value)

    return max(
        1,
        round(
            duration * 1000
        ),
    )


def make_silence_wav(
    output_file: Path,
    duration_ms: int,
) -> None:
    frames = max(
        1,
        round(
            SAMPLE_RATE
            * duration_ms
            / 1000
        ),
    )

    with wave.open(
        str(output_file),
        "wb",
    ) as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(
            SAMPLE_RATE
        )

        wav_file.writeframes(
            b"\x00\x00"
            * frames
        )


def convert_mp3_to_wav(
    mp3_file: Path,
    wav_file: Path,
) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(mp3_file),
            "-ar",
            str(SAMPLE_RATE),
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(wav_file),
        ],
        check=True,
    )


def concat_wav_files(
    wav_files: list[Path],
    output_mp3: Path,
) -> None:
    if not wav_files:
        raise RuntimeError(
            "No hay archivos WAV "
            "para concatenar"
        )

    command = [
        "ffmpeg",
        "-y",
        "-loglevel",
        "error",
    ]

    for wav_file in wav_files:
        command.extend(
            [
                "-i",
                str(wav_file),
            ]
        )

    inputs = "".join(
        f"[{index}:a]"
        for index in range(
            len(wav_files)
        )
    )

    filter_complex = (
        f"{inputs}"
        f"concat=n={len(wav_files)}:"
        "v=0:a=1[outa]"
    )

    command.extend(
        [
            "-filter_complex",
            filter_complex,
            "-map",
            "[outa]",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "128k",
            str(output_mp3),
        ]
    )

    subprocess.run(
        command,
        check=True,
    )


async def build_prosodic_audio(
    plan: list[SegmentPlan],
) -> tuple[
    list[dict],
    list[dict],
    int,
]:
    global_words: list[dict] = []
    effective_segments: list[dict] = []

    AUDIO.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with tempfile.TemporaryDirectory(
        prefix="prosody-"
    ) as temp_dir:
        temp = Path(temp_dir)

        wav_parts: list[Path] = []

        cursor_ms = 0

        for segment in plan:
            segment_number = (
                segment.index + 1
            )

            if (
                segment.pre_pause_ms
                > 0
            ):
                pre_file = temp / (
                    f"{segment_number:03}"
                    "-pre.wav"
                )

                make_silence_wav(
                    pre_file,
                    segment.pre_pause_ms,
                )

                wav_parts.append(
                    pre_file
                )

                cursor_ms += (
                    segment.pre_pause_ms
                )

            speech_start_ms = (
                cursor_ms
            )

            mp3_file = temp / (
                f"{segment_number:03}"
                "-speech.mp3"
            )

            wav_file = temp / (
                f"{segment_number:03}"
                "-speech.wav"
            )

            local_words = (
                await synthesize_segment(
                    segment,
                    mp3_file,
                )
            )

            convert_mp3_to_wav(
                mp3_file,
                wav_file,
            )

            wav_parts.append(
                wav_file
            )

            speech_duration_ms = (
                probe_duration_ms(
                    wav_file
                )
            )

            for word in local_words:
                global_words.append(
                    {
                        "text":
                            word["text"],

                        "startMs":
                            (
                                speech_start_ms
                                + word[
                                    "startMs"
                                ]
                            ),

                        "endMs":
                            (
                                speech_start_ms
                                + word[
                                    "endMs"
                                ]
                            ),

                        "segmentIndex":
                            segment.index,

                        "prosodyRole":
                            segment.role,

                        "terminalMark":
                            segment
                            .terminal_mark,

                        "semanticBreak":
                            segment
                            .semantic_break,
                    }
                )

            cursor_ms += (
                speech_duration_ms
            )

            speech_end_ms = (
                cursor_ms
            )

            if (
                segment.post_pause_ms
                > 0
            ):
                post_file = temp / (
                    f"{segment_number:03}"
                    "-post.wav"
                )

                make_silence_wav(
                    post_file,
                    segment.post_pause_ms,
                )

                wav_parts.append(
                    post_file
                )

                cursor_ms += (
                    segment.post_pause_ms
                )

            effective_segments.append(
                {
                    **asdict(segment),

                    "speechStartMs":
                        speech_start_ms,

                    "speechEndMs":
                        speech_end_ms,

                    "effectiveEndMs":
                        cursor_ms,

                    "speechDurationMs":
                        speech_duration_ms,
                }
            )

        concat_wav_files(
            wav_parts,
            AUDIO,
        )

    if (
        not AUDIO.exists()
        or AUDIO.stat().st_size == 0
    ):
        raise RuntimeError(
            "No se generó narración "
            "prosódica final"
        )

    if len(global_words) < 5:
        raise RuntimeError(
            "Timeline prosódico "
            "insuficiente"
        )

    previous_start = -1

    for index, word in enumerate(
        global_words
    ):
        if (
            word["startMs"]
            < previous_start
        ):
            raise RuntimeError(
                "Timeline no monotónico "
                f"en palabra {index}"
            )

        if (
            word["endMs"]
            < word["startMs"]
        ):
            raise RuntimeError(
                "Duración inválida "
                f"en palabra {index}"
            )

        previous_start = (
            word["startMs"]
        )

    final_audio_duration_ms = (
        probe_duration_ms(
            AUDIO
        )
    )

    return (
        global_words,
        effective_segments,
        final_audio_duration_ms,
    )


# ============================================================
# SRT
# ============================================================


def srt_time(
    ms: int,
) -> str:
    hours = (
        ms // 3_600_000
    )

    ms %= 3_600_000

    minutes = (
        ms // 60_000
    )

    ms %= 60_000

    seconds = (
        ms // 1_000
    )

    millis = (
        ms % 1_000
    )

    return (
        f"{hours:02}:"
        f"{minutes:02}:"
        f"{seconds:02},"
        f"{millis:03}"
    )


def write_srt(
    segments: list[dict],
) -> None:
    blocks: list[str] = []

    counter = 1

    for segment in segments:
        start_ms = int(
            segment[
                "speechStartMs"
            ]
        )

        end_ms = int(
            segment[
                "speechEndMs"
            ]
        )

        text = str(
            segment[
                "spoken_text"
            ]
        ).strip()

        if (
            not text
            or end_ms <= start_ms
        ):
            continue

        blocks.append(
            "\n".join(
                [
                    str(counter),

                    (
                        f"{srt_time(start_ms)}"
                        " --> "
                        f"{srt_time(end_ms)}"
                    ),

                    text,
                ]
            )
        )

        counter += 1

    SRT.write_text(
        "\n\n".join(
            blocks
        )
        + "\n",

        encoding="utf-8",
    )


# ============================================================
# VIDEOSPEC
# ============================================================


def load_video_spec() -> dict:
    if not SPEC.exists():
        raise RuntimeError(
            f"No existe VideoSpec: "
            f"{SPEC}"
        )

    return json.loads(
        SPEC.read_text(
            encoding="utf-8"
        )
    )


def read_narration(
    spec: dict,
) -> str:
    audio = spec.get(
        "audio",
        {},
    )

    narration = str(
        audio.get(
            "narrationText",
            "",
        )
    ).strip()

    if not narration:
        raise RuntimeError(
            "El VideoSpec no contiene "
            "audio.narrationText"
        )

    return narration


def read_tags(
    spec: dict,
) -> list[str]:
    meta = spec.get(
        "meta",
        {},
    )

    raw_tags = meta.get(
        "tags",
        [],
    )

    if isinstance(
        raw_tags,
        str,
    ):
        return [
            raw_tags
        ]

    if isinstance(
        raw_tags,
        list,
    ):
        return [
            str(tag)
            for tag
            in raw_tags
        ]

    return []


# ============================================================
# SALIDAS DE QA
# ============================================================


def write_timeline(
    words: list[dict],
    segments: list[dict],
    duration_ms: int,
    creative_prosody: Optional[str],
) -> None:
    payload = {
        "schemaVersion":
            "2.0",

        "productionCode":
            PRODUCTION_CODE,

        # Se conserva por compatibilidad
        # con el QA existente del workflow.
        "version":
            "V3.15-C-PROSODY-DIRECTOR",

        "prosodyEngineVersion":
            VERSION,

        "engine":
            (
                "edge-tts-"
                "syntactic-semantic-prosody"
            ),

        "language":
            LANGUAGE,

        "voice":
            VOICE,

        "creativeProsody":
            creative_prosody,

        "wordCount":
            len(words),

        "durationMs":
            duration_ms,

        "words":
            words,

        "segments":
            segments,
    }

    TIMELINE.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),

        encoding="utf-8",
    )


def write_prosody_plan(
    narration: str,
    plan: list[SegmentPlan],
    effective_segments: list[dict],
    duration_ms: int,
    creative_prosody: Optional[str],
) -> None:
    opening_changed = bool(
        plan
        and (
            plan[0].original_text
            != plan[0].spoken_text
        )
    )

    syntactic_pauses = [
        item
        for item in plan
        if (
            item
            .punctuation_pause_ms
            > 0
        )
    ]

    semantic_breaks = [
        item
        for item in plan
        if item.semantic_break
    ]

    payload = {
        "productionCode":
            PRODUCTION_CODE,

        # Compatibilidad con auditoría
        # ya validada del workflow.
        "version":
            "V3.15-C-PROSODY-DIRECTOR",

        "prosodyEngineVersion":
            VERSION,

        "directorDecision": {
            "openingTransformed":
                opening_changed,

            "openingRole":
                (
                    plan[0].role
                    if plan
                    else None
                ),

            "segmentCount":
                len(plan),

            "syntacticPauseCount":
                len(
                    syntactic_pauses
                ),

            "semanticBreakCount":
                len(
                    semantic_breaks
                ),

            "creativeProsody":
                creative_prosody,

            "durationMs":
                duration_ms,
        },

        "originalNarration":
            narration,

        "effectiveNarration":
            " ".join(
                item.spoken_text
                for item in plan
            ),

        "segments":
            effective_segments,
    }

    PROSODY_PLAN.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),

        encoding="utf-8",
    )


# ============================================================
# MAIN
# ============================================================


async def main() -> None:
    print(
        "======================================"
    )

    print(
        "V3.18-E — SYNTACTIC-SEMANTIC "
        "PROSODY DIRECTOR"
    )

    print(
        f"Production: "
        f"{PRODUCTION_CODE}"
    )

    spec = load_video_spec()

    narration = read_narration(
        spec
    )

    tags = read_tags(
        spec
    )

    creative_prosody = (
        load_creative_prosody()
    )

    print(
        "Creative prosody: "
        f"{creative_prosody or 'baseline'}"
    )

    plan = build_segment_plan(
        narration,
        tags,
        creative_prosody,
    )

    print(
        "Unidades sintáctico-semánticas "
        f"detectadas: {len(plan)}"
    )

    if plan:
        print(
            "Apertura original:"
        )

        print(
            plan[0].original_text
        )

        print(
            "Apertura dirigida:"
        )

        print(
            plan[0].spoken_text
        )

        print(
            "Rol de apertura:"
        )

        print(
            plan[0].role
        )

    (
        words,
        effective_segments,
        duration_ms,
    ) = await build_prosodic_audio(
        plan
    )

    write_timeline(
        words,
        effective_segments,
        duration_ms,
        creative_prosody,
    )

    write_srt(
        effective_segments
    )

    write_prosody_plan(
        narration,
        plan,
        effective_segments,
        duration_ms,
        creative_prosody,
    )

    print(
        "--------------------------------------"
    )

    print(
        "Palabras sincronizadas: "
        f"{len(words)}"
    )

    print(
        "Duración final de voz: "
        f"{duration_ms / 1000:.3f} s"
    )

    print(
        "Pausas sintácticas: "
        f"{sum(1 for item in plan if item.punctuation_pause_ms > 0)}"
    )

    print(
        "Rupturas semánticas: "
        f"{sum(1 for item in plan if item.semantic_break)}"
    )

    print(
        f"Audio: {AUDIO}"
    )

    print(
        f"Timeline: {TIMELINE}"
    )

    print(
        f"SRT: {SRT}"
    )

    print(
        "Prosody plan: "
        f"{PROSODY_PLAN}"
    )

    print(
        "✅ V3.18-E PROSODIA "
        "SINTÁCTICO-SEMÁNTICA COMPLETADA"
    )

    print(
        "======================================"
    )


if __name__ == "__main__":
    asyncio.run(
        main()
                )
