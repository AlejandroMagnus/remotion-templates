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
from typing import Any, Optional

import edge_tts


# ============================================================
# V3.18-E.2 — ADAPTIVE HUMAN VOCAL PERFORMANCE DIRECTOR
#
# Director Audiovisual / CreativeDecision
#        ↓
# vocalDirection + prosody + rhythm + narrativeArchitecture
#        ↓
# análisis sintáctico + semántico + posición narrativa
#        ↓
# VocalMoment
#        ↓
# tempo + respiración + pausa + énfasis + cadencia
#        ↓
# Edge TTS
#        ↓
# WordBoundary = fuente temporal de verdad
#        ↓
# medición WPM + QA prosódico
#
# PRINCIPIOS:
# - No existe una pausa fija correcta para cada signo.
# - La puntuación es una señal, no una orden mecánica.
# - La respiración depende del significado y del momento.
# - La velocidad puede cambiar dentro del mismo video.
# - Se preserva la continuidad natural de la oración.
# - WordBoundary continúa siendo la verdad temporal.
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

VERSION = "V3.18-E.2-ADAPTIVE-HUMAN-VOCAL-PERFORMANCE"


# ============================================================
# CONTRATOS DEL DIRECTOR VOCAL
# ============================================================


@dataclass(frozen=True)
class ProsodyProfile:
    role: str
    rate: int
    pitch_hz: int
    pre_pause_ms: int
    post_pause_ms: int


@dataclass(frozen=True)
class PauseRange:
    min: int
    max: int


@dataclass(frozen=True)
class TargetWpm:
    min: int
    preferred: int
    max: int


@dataclass(frozen=True)
class TempoVariation:
    min_rate_percent: int
    max_rate_percent: int


@dataclass(frozen=True)
class BreathingDirection:
    micro: PauseRange
    phrase: PauseRange
    conceptual: PauseRange
    preserve_sentence_flow: bool


@dataclass(frozen=True)
class ExpressionDirection:
    emphasis: int
    pitch_variation: int
    dynamic_range: int


@dataclass(frozen=True)
class VocalDirection:
    mode: str
    target_wpm: TargetWpm
    tempo: TempoVariation
    breathing: BreathingDirection
    expression: ExpressionDirection
    moment_priority: list[str]
    principles: list[str]
    avoid: list[str]


@dataclass(frozen=True)
class CreativeDirection:
    prosody: Optional[str]
    rhythm: Optional[str]
    narrative_architecture: Optional[str]
    genre: Optional[str]
    vocal: VocalDirection


# ============================================================
# FALLBACK SEGURO
# ============================================================


DEFAULT_VOCAL_DIRECTION = VocalDirection(
    mode="adaptive-human-performance",

    target_wpm=TargetWpm(
        min=132,
        preferred=150,
        max=166,
    ),

    tempo=TempoVariation(
        min_rate_percent=-7,
        max_rate_percent=6,
    ),

    breathing=BreathingDirection(
        micro=PauseRange(
            min=35,
            max=110,
        ),

        phrase=PauseRange(
            min=130,
            max=290,
        ),

        conceptual=PauseRange(
            min=240,
            max=520,
        ),

        preserve_sentence_flow=True,
    ),

    expression=ExpressionDirection(
        emphasis=65,
        pitch_variation=38,
        dynamic_range=58,
    ),

    moment_priority=[
        "opening",
        "authority",
        "warning",
        "revelation",
        "cta",
    ],

    principles=[
        "Mantener naturalidad humana.",
        "Variar el ritmo según significado.",
        "Respirar por concepto, no por signo.",
    ],

    avoid=[
        "ritmo metronómico",
        "pausas idénticas",
        "respiración artificial",
    ],
)


# ============================================================
# PERFILES BASE E.2
#
# Son puntos de partida.
# El Director puede modificarlos localmente.
# ============================================================


PROFILES = {
    "opening_question": ProsodyProfile(
        role="opening_question",
        rate=-5,
        pitch_hz=2,
        pre_pause_ms=180,
        post_pause_ms=300,
    ),

    "question": ProsodyProfile(
        role="question",
        rate=-3,
        pitch_hz=2,
        pre_pause_ms=0,
        post_pause_ms=230,
    ),

    "warning": ProsodyProfile(
        role="warning",
        rate=-3,
        pitch_hz=-2,
        pre_pause_ms=0,
        post_pause_ms=220,
    ),

    "authority": ProsodyProfile(
        role="authority",
        rate=-2,
        pitch_hz=-1,
        pre_pause_ms=0,
        post_pause_ms=200,
    ),

    "cta": ProsodyProfile(
        role="cta",
        rate=-3,
        pitch_hz=-1,
        pre_pause_ms=50,
        post_pause_ms=280,
    ),

    "explanation": ProsodyProfile(
        role="explanation",
        rate=1,
        pitch_hz=0,
        pre_pause_ms=0,
        post_pause_ms=150,
    ),
}


# ============================================================
# MODULACIÓN POR MOMENTO VOCAL
#
# No sustituye al perfil creativo.
# Lo adapta frase por frase.
# ============================================================


MOMENT_RATE_ADJUSTMENT = {
    "opening": -2,
    "question": -2,
    "explanation": 2,
    "evidence": 0,
    "warning": -2,
    "contrast": 1,
    "revelation": -3,
    "authority": -2,
    "reflection": -3,
    "decision": 1,
    "cta": -1,
    "closing": -2,
}


MOMENT_PAUSE_FACTOR = {
    "opening": 1.05,
    "question": 1.05,
    "explanation": 0.82,
    "evidence": 0.92,
    "warning": 1.05,
    "contrast": 0.95,
    "revelation": 1.18,
    "authority": 1.04,
    "reflection": 1.15,
    "decision": 0.92,
    "cta": 1.05,
    "closing": 1.10,
}


MOMENT_PITCH_ADJUSTMENT = {
    "opening": 1,
    "question": 1,
    "explanation": 0,
    "evidence": 0,
    "warning": -1,
    "contrast": 1,
    "revelation": -1,
    "authority": -1,
    "reflection": -1,
    "decision": 0,
    "cta": -1,
    "closing": -1,
}


# ============================================================
# CARGA DEL CREATIVE DIRECTOR
# ============================================================


def safe_int(
    value: Any,
    fallback: int,
) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def read_pause_range(
    raw: Any,
    fallback: PauseRange,
) -> PauseRange:
    if not isinstance(raw, dict):
        return fallback

    minimum = safe_int(
        raw.get("min"),
        fallback.min,
    )

    maximum = safe_int(
        raw.get("max"),
        fallback.max,
    )

    if maximum < minimum:
        minimum, maximum = maximum, minimum

    return PauseRange(
        min=minimum,
        max=maximum,
    )


def load_creative_direction() -> CreativeDirection:
    if not CREATIVE_DECISION.exists():
        return CreativeDirection(
            prosody=None,
            rhythm=None,
            narrative_architecture=None,
            genre=None,
            vocal=DEFAULT_VOCAL_DIRECTION,
        )

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

        if not isinstance(selected, dict):
            selected = {}

        raw_vocal = selected.get(
            "vocalDirection",
            {},
        )

        if not isinstance(raw_vocal, dict):
            raw_vocal = {}

        raw_target = raw_vocal.get(
            "targetWpm",
            {},
        )

        if not isinstance(raw_target, dict):
            raw_target = {}

        raw_tempo = raw_vocal.get(
            "tempoVariation",
            {},
        )

        if not isinstance(raw_tempo, dict):
            raw_tempo = {}

        raw_breathing = raw_vocal.get(
            "breathing",
            {},
        )

        if not isinstance(raw_breathing, dict):
            raw_breathing = {}

        raw_expression = raw_vocal.get(
            "expression",
            {},
        )

        if not isinstance(raw_expression, dict):
            raw_expression = {}

        fallback = DEFAULT_VOCAL_DIRECTION

        target = TargetWpm(
            min=safe_int(
                raw_target.get("min"),
                fallback.target_wpm.min,
            ),

            preferred=safe_int(
                raw_target.get("preferred"),
                fallback.target_wpm.preferred,
            ),

            max=safe_int(
                raw_target.get("max"),
                fallback.target_wpm.max,
            ),
        )

        tempo = TempoVariation(
            min_rate_percent=safe_int(
                raw_tempo.get("minRatePercent"),
                fallback.tempo.min_rate_percent,
            ),

            max_rate_percent=safe_int(
                raw_tempo.get("maxRatePercent"),
                fallback.tempo.max_rate_percent,
            ),
        )

        breathing = BreathingDirection(
            micro=read_pause_range(
                raw_breathing.get(
                    "microPauseMs"
                ),
                fallback.breathing.micro,
            ),

            phrase=read_pause_range(
                raw_breathing.get(
                    "phrasePauseMs"
                ),
                fallback.breathing.phrase,
            ),

            conceptual=read_pause_range(
                raw_breathing.get(
                    "conceptualPauseMs"
                ),
                fallback.breathing.conceptual,
            ),

            preserve_sentence_flow=bool(
                raw_breathing.get(
                    "preserveSentenceFlow",
                    fallback
                    .breathing
                    .preserve_sentence_flow,
                )
            ),
        )

        expression = ExpressionDirection(
            emphasis=safe_int(
                raw_expression.get(
                    "emphasis"
                ),
                fallback.expression.emphasis,
            ),

            pitch_variation=safe_int(
                raw_expression.get(
                    "pitchVariation"
                ),
                fallback
                .expression
                .pitch_variation,
            ),

            dynamic_range=safe_int(
                raw_expression.get(
                    "dynamicRange"
                ),
                fallback
                .expression
                .dynamic_range,
            ),
        )

        raw_priority = raw_vocal.get(
            "momentPriority",
            fallback.moment_priority,
        )

        moment_priority = (
            [
                str(item)
                for item in raw_priority
            ]
            if isinstance(raw_priority, list)
            else list(
                fallback.moment_priority
            )
        )

        raw_principles = raw_vocal.get(
            "principles",
            fallback.principles,
        )

        principles = (
            [
                str(item)
                for item in raw_principles
            ]
            if isinstance(raw_principles, list)
            else list(
                fallback.principles
            )
        )

        raw_avoid = raw_vocal.get(
            "avoid",
            fallback.avoid,
        )

        avoid = (
            [
                str(item)
                for item in raw_avoid
            ]
            if isinstance(raw_avoid, list)
            else list(
                fallback.avoid
            )
        )

        vocal = VocalDirection(
            mode=str(
                raw_vocal.get(
                    "mode",
                    fallback.mode,
                )
            ),

            target_wpm=target,

            tempo=tempo,

            breathing=breathing,

            expression=expression,

            moment_priority=moment_priority,

            principles=principles,

            avoid=avoid,
        )

        return CreativeDirection(
            prosody=(
                str(selected["prosody"])
                if selected.get("prosody")
                else None
            ),

            rhythm=(
                str(selected["rhythm"])
                if selected.get("rhythm")
                else None
            ),

            narrative_architecture=(
                str(
                    selected[
                        "narrativeArchitecture"
                    ]
                )
                if selected.get(
                    "narrativeArchitecture"
                )
                else None
            ),

            genre=(
                str(selected["genre"])
                if selected.get("genre")
                else None
            ),

            vocal=vocal,
        )

    except Exception as error:
        print(
            "ADVERTENCIA: no se pudo cargar "
            "vocalDirection. Se utilizará "
            f"fallback seguro: {error}"
        )

        return CreativeDirection(
            prosody=None,
            rhythm=None,
            narrative_architecture=None,
            genre=None,
            vocal=DEFAULT_VOCAL_DIRECTION,
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


def clamp_int(
    value: int,
    minimum: int,
    maximum: int,
) -> int:
    return max(
        minimum,
        min(
            maximum,
            value,
        ),
    )


def interpolate_range(
    value_range: PauseRange,
    intensity: float,
) -> int:
    normalized_intensity = max(
        0.0,
        min(
            1.0,
            intensity,
        ),
    )

    return round(
        value_range.min
        + (
            value_range.max
            - value_range.min
        )
        * normalized_intensity
    )


def count_spoken_words(
    text: str,
) -> int:
    return len(
        re.findall(
            r"\b[\wÁÉÍÓÚÜÑáéíóúüñ]+\b",
            text,
            flags=re.UNICODE,
        )
)
    # ============================================================
# MOTOR SINTÁCTICO ADAPTATIVO
# ============================================================


@dataclass(frozen=True)
class SyntaxUnit:
    text: str
    terminal_mark: str
    semantic_break: bool
    sentence_index: int
    sentence_unit_index: int
    sentence_unit_total: int


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
    sentence_index: int,
) -> list[SyntaxUnit]:
    """
    La puntuación ayuda a localizar posibles fronteras,
    pero no determina por sí sola la respiración.
    """

    text = clean_spaces(sentence)

    if not text:
        return []

    raw_parts = re.split(
        r"(?<=[,;:])\s+|(?<=[—–])\s+",
        text,
    )

    provisional: list[
        tuple[str, str, bool]
    ] = []

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

        word_count = count_spoken_words(
            candidate
        )

        should_close = (
            mark in ".?!;:"
            or (
                mark == ","
                and word_count >= 7
            )
            or (
                mark in "—–"
                and word_count >= 5
            )
        )

        if should_close:
            provisional.append(
                (
                    candidate,
                    mark,
                    mark in ".?!;:",
                )
            )

            buffer = ""

        else:
            buffer = candidate

    if buffer:
        mark = (
            buffer[-1]
            if buffer[-1] in ".,;:?!—–"
            else ""
        )

        provisional.append(
            (
                buffer,
                mark,
                mark in ".?!;:",
            )
        )

    if not provisional:
        mark = (
            text[-1]
            if text[-1] in ".,;:?!"
            else ""
        )

        provisional = [
            (
                text,
                mark,
                mark in ".?!",
            )
        ]

    total = len(provisional)

    return [
        SyntaxUnit(
            text=item[0],
            terminal_mark=item[1],
            semantic_break=item[2],
            sentence_index=sentence_index,
            sentence_unit_index=index,
            sentence_unit_total=total,
        )
        for index, item in enumerate(
            provisional
        )
    ]


# ============================================================
# APERTURA E INTENCIÓN SEMÁNTICA
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
    text: str,
    index: int,
    total: int,
    opening_is_question: bool,
) -> str:
    value = normalize(text)

    if (
        index == 0
        and opening_is_question
    ):
        return "opening_question"

    if (
        text.startswith("¿")
        or "¿" in text
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
    )

    if any(
        marker in value
        for marker in authority_markers
    ):
        return "authority"

    if index == total - 1:
        return "authority"

    return "explanation"


# ============================================================
# DETECTOR DE MOMENTO VOCAL
# ============================================================


def detect_vocal_moment(
    text: str,
    role: str,
    index: int,
    total: int,
    unit: SyntaxUnit,
) -> str:
    value = normalize(text)

    if index == 0:
        return (
            "question"
            if role == "opening_question"
            else "opening"
        )

    if role == "cta":
        return "cta"

    if role == "question":
        return "question"

    if role == "warning":
        return "warning"

    contrast_markers = (
        "pero ",
        "sin embargo",
        "en cambio",
        "mientras que",
        "a diferencia",
        "por el contrario",
        "no basta",
    )

    if any(
        marker in value
        for marker in contrast_markers
    ):
        return "contrast"

    revelation_markers = (
        "la clave",
        "lo decisivo",
        "el punto central",
        "esto significa",
        "por eso",
        "por tanto",
        "en realidad",
        "la diferencia",
        "el verdadero problema",
    )

    if any(
        marker in value
        for marker in revelation_markers
    ):
        return "revelation"

    evidence_markers = (
        "prueba",
        "evidencia",
        "documento",
        "expediente",
        "hechos",
        "contrato",
        "registro",
        "antecedente",
    )

    if any(
        marker in value
        for marker in evidence_markers
    ):
        return "evidence"

    decision_markers = (
        "decidir",
        "decision",
        "alternativa",
        "elegir",
        "actuar",
        "estrategia",
        "ruta",
    )

    if any(
        marker in value
        for marker in decision_markers
    ):
        return "decision"

    reflection_markers = (
        "conviene preguntarse",
        "debe comprenderse",
        "importa comprender",
        "vale la pena",
        "reflexionar",
    )

    if any(
        marker in value
        for marker in reflection_markers
    ):
        return "reflection"

    if role == "authority":
        return "authority"

    if index == total - 1:
        return "closing"

    return "explanation"


# ============================================================
# RESPIRACIÓN ADAPTATIVA
# ============================================================


def pause_intensity(
    moment: str,
    unit: SyntaxUnit,
    word_count: int,
    priority: list[str],
) -> float:
    intensity = 0.30

    if unit.semantic_break:
        intensity += 0.18

    if moment in (
        "revelation",
        "reflection",
        "closing",
    ):
        intensity += 0.24

    elif moment in (
        "warning",
        "authority",
        "question",
        "cta",
    ):
        intensity += 0.15

    elif moment in (
        "evidence",
        "decision",
        "contrast",
    ):
        intensity += 0.08

    if moment in priority:
        intensity += 0.08

    if word_count >= 16:
        intensity += 0.10

    if word_count <= 5:
        intensity -= 0.08

    return max(
        0.0,
        min(
            1.0,
            intensity,
        ),
    )


def select_pause_range(
    moment: str,
    unit: SyntaxUnit,
    vocal: VocalDirection,
) -> PauseRange:
    if (
        unit.semantic_break
        or moment in (
            "revelation",
            "reflection",
            "closing",
        )
    ):
        return vocal.breathing.conceptual

    if (
        unit.terminal_mark
        in (
            ";",
            ":",
            "—",
            "–",
        )
        or moment in (
            "warning",
            "authority",
            "question",
            "cta",
            "decision",
        )
    ):
        return vocal.breathing.phrase

    return vocal.breathing.micro


def calculate_adaptive_pause(
    moment: str,
    unit: SyntaxUnit,
    word_count: int,
    base_pause_ms: int,
    vocal: VocalDirection,
) -> int:
    intensity = pause_intensity(
        moment,
        unit,
        word_count,
        vocal.moment_priority,
    )

    selected_range = (
        select_pause_range(
            moment,
            unit,
            vocal,
        )
    )

    directed_pause = interpolate_range(
        selected_range,
        intensity,
    )

    factor = MOMENT_PAUSE_FACTOR.get(
        moment,
        1.0,
    )

    directed_pause = round(
        directed_pause
        * factor
    )

    # Mantiene continuidad en mitad de una oración.
    if (
        vocal
        .breathing
        .preserve_sentence_flow
        and not unit.semantic_break
        and unit.terminal_mark == ","
    ):
        directed_pause = min(
            directed_pause,
            vocal.breathing.micro.max,
        )

    # El perfil base actúa como referencia,
    # no como silencio obligatorio.
    if unit.semantic_break:
        directed_pause = max(
            directed_pause,
            round(
                base_pause_ms * 0.70
            ),
        )

    return max(
        0,
        directed_pause,
    )


# ============================================================
# TEMPO Y EXPRESIÓN ADAPTATIVOS
# ============================================================


def calculate_rate(
    profile: ProsodyProfile,
    moment: str,
    vocal: VocalDirection,
) -> int:
    rate = (
        profile.rate
        + MOMENT_RATE_ADJUSTMENT.get(
            moment,
            0,
        )
    )

    return clamp_int(
        rate,
        vocal.tempo.min_rate_percent,
        vocal.tempo.max_rate_percent,
    )


def calculate_pitch(
    profile: ProsodyProfile,
    moment: str,
    vocal: VocalDirection,
) -> int:
    pitch = (
        profile.pitch_hz
        + MOMENT_PITCH_ADJUSTMENT.get(
            moment,
            0,
        )
    )

    # pitchVariation expresa cuánto margen
    # interpretativo concede el Director.
    max_variation = max(
        1,
        round(
            vocal
            .expression
            .pitch_variation
            / 15
        ),
    )

    return clamp_int(
        pitch,
        -max_variation,
        max_variation,
    )


def calculate_pre_pause(
    profile: ProsodyProfile,
    moment: str,
    vocal: VocalDirection,
) -> int:
    if moment == "opening":
        return min(
            profile.pre_pause_ms,
            vocal.breathing.phrase.max,
        )

    if moment == "question":
        return min(
            profile.pre_pause_ms,
            vocal.breathing.phrase.max,
        )

    if moment in (
        "revelation",
        "reflection",
    ):
        return interpolate_range(
            vocal.breathing.micro,
            0.55,
        )

    if moment == "cta":
        return interpolate_range(
            vocal.breathing.micro,
            0.35,
        )

    return 0


# ============================================================
# PLAN DE INTERPRETACIÓN
# ============================================================


@dataclass
class SegmentPlan:
    index: int
    original_text: str
    spoken_text: str
    role: str
    vocal_moment: str
    rate: str
    pitch: str
    pre_pause_ms: int
    post_pause_ms: int
    terminal_mark: str
    semantic_break: bool
    word_count: int
    sentence_index: int


def build_segment_plan(
    narration: str,
    tags: list[str],
    direction: CreativeDirection,
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
            spoken_sentence,
            sentence_index,
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
            (
                opening_is_question
                and index == 0
            ),
        )

        profile = PROFILES[
            role
        ]

        moment = detect_vocal_moment(
            spoken_text,
            role,
            index,
            total,
            unit,
        )

        word_count = count_spoken_words(
            spoken_text
        )

        rate_value = calculate_rate(
            profile,
            moment,
            direction.vocal,
        )

        pitch_value = calculate_pitch(
            profile,
            moment,
            direction.vocal,
        )

        pre_pause = calculate_pre_pause(
            profile,
            moment,
            direction.vocal,
        )

        post_pause = calculate_adaptive_pause(
            moment,
            unit,
            word_count,
            profile.post_pause_ms,
            direction.vocal,
        )

        result.append(
            SegmentPlan(
                index=index,
                original_text=original_sentence,
                spoken_text=spoken_text,
                role=role,
                vocal_moment=moment,
                rate=f"{rate_value:+d}%",
                pitch=f"{pitch_value:+d}Hz",
                pre_pause_ms=pre_pause,
                post_pause_ms=post_pause,
                terminal_mark=unit.terminal_mark,
                semantic_break=unit.semantic_break,
                word_count=word_count,
                sentence_index=unit.sentence_index,
            )
        )

    return result


# ============================================================
# SÍNTESIS TTS — WORDBOUNDARY INTACTO
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
                    chunk["offset"] / 10000
                )

                duration_ms = round(
                    chunk["duration"] / 10000
                )

                words.append(
                    {
                        "text":
                            chunk["text"],

                        "startMs":
                            start_ms,

                        "endMs":
                            start_ms
                            + duration_ms,
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

    for attempt in range(1, 4):
        try:
            print(
                f"Segmento {segment.index + 1} | "
                f"{segment.role} | "
                f"momento={segment.vocal_moment} | "
                f"rate={segment.rate} | "
                f"pitch={segment.pitch} | "
                f"pre={segment.pre_pause_ms}ms | "
                f"post={segment.post_pause_ms}ms | "
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
            "default=noprint_wrappers=1:nokey=1",
            str(audio_file),
        ],
        text=True,
    ).strip()

    return max(
        1,
        round(
            float(value) * 1000
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
            b"\x00\x00" * frames
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
            "No hay archivos WAV para concatenar"
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
        prefix="prosody-e2-"
    ) as temp_dir:
        temp = Path(temp_dir)

        wav_parts: list[Path] = []

        cursor_ms = 0

        for segment in plan:
            number = segment.index + 1

            if segment.pre_pause_ms > 0:
                pre_file = temp / (
                    f"{number:03}-pre.wav"
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

            speech_start_ms = cursor_ms

            mp3_file = temp / (
                f"{number:03}-speech.mp3"
            )

            wav_file = temp / (
                f"{number:03}-speech.wav"
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
                                + word["startMs"]
                            ),

                        "endMs":
                            (
                                speech_start_ms
                                + word["endMs"]
                            ),

                        "segmentIndex":
                            segment.index,

                        "prosodyRole":
                            segment.role,

                        "vocalMoment":
                            segment.vocal_moment,

                        "terminalMark":
                            segment.terminal_mark,

                        "semanticBreak":
                            segment.semantic_break,
                    }
                )

            cursor_ms += (
                speech_duration_ms
            )

            speech_end_ms = cursor_ms

            if segment.post_pause_ms > 0:
                post_file = temp / (
                    f"{number:03}-post.wav"
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
            "Timeline prosódico insuficiente"
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

    duration_ms = probe_duration_ms(
        AUDIO
    )

    return (
        global_words,
        effective_segments,
        duration_ms,
    )


# ============================================================
# MEDICIÓN DEL RITMO HUMANO
# ============================================================


def build_rhythm_metrics(
    plan: list[SegmentPlan],
    effective_segments: list[dict],
    duration_ms: int,
    direction: CreativeDirection,
) -> dict:
    spoken_word_count = sum(
        item.word_count
        for item in plan
    )

    speech_duration_ms = sum(
        int(
            item.get(
                "speechDurationMs",
                0,
            )
        )
        for item in effective_segments
    )

    pause_duration_ms = max(
        0,
        duration_ms
        - speech_duration_ms,
    )

    speech_wpm = (
        spoken_word_count
        / (
            speech_duration_ms
            / 60_000
        )
        if speech_duration_ms > 0
        else 0.0
    )

    effective_wpm = (
        spoken_word_count
        / (
            duration_ms
            / 60_000
        )
        if duration_ms > 0
        else 0.0
    )

    target = (
        direction.vocal.target_wpm
    )

    if effective_wpm < target.min:
        rhythm_status = (
            "below-target"
        )

    elif effective_wpm > target.max:
        rhythm_status = (
            "above-target"
        )

    else:
        rhythm_status = (
            "within-target"
        )

    distance_from_preferred = (
        effective_wpm
        - target.preferred
    )

    return {
        "spokenWordCount":
            spoken_word_count,

        "speechDurationMs":
            speech_duration_ms,

        "pauseDurationMs":
            pause_duration_ms,

        "pauseRatio":
            round(
                (
                    pause_duration_ms
                    / duration_ms
                )
                if duration_ms > 0
                else 0.0,
                4,
            ),

        "speechWpm":
            round(
                speech_wpm,
                2,
            ),

        "effectiveWpm":
            round(
                effective_wpm,
                2,
            ),

        "targetWpm": {
            "min":
                target.min,

            "preferred":
                target.preferred,

            "max":
                target.max,
        },

        "distanceFromPreferredWpm":
            round(
                distance_from_preferred,
                2,
            ),

        "rhythmStatus":
            rhythm_status,
    }


# ============================================================
# QA PROSÓDICO
# ============================================================


def build_vocal_qa(
    plan: list[SegmentPlan],
    metrics: dict,
) -> dict:
    issues: list[str] = []

    if (
        metrics["rhythmStatus"]
        == "below-target"
    ):
        issues.append(
            "effective-wpm-below-target"
        )

    if (
        metrics["rhythmStatus"]
        == "above-target"
    ):
        issues.append(
            "effective-wpm-above-target"
        )

    pause_ratio = float(
        metrics["pauseRatio"]
    )

    if pause_ratio > 0.22:
        issues.append(
            "excessive-total-pause-ratio"
        )

    if pause_ratio < 0.015:
        issues.append(
            "insufficient-total-breathing"
        )

    consecutive_long_pauses = 0
    maximum_consecutive = 0

    for item in plan:
        if item.post_pause_ms >= 400:
            consecutive_long_pauses += 1

            maximum_consecutive = max(
                maximum_consecutive,
                consecutive_long_pauses,
            )

        else:
            consecutive_long_pauses = 0

    if maximum_consecutive >= 2:
        issues.append(
            "consecutive-long-pauses"
        )

    distinct_rates = len(
        {
            item.rate
            for item in plan
        }
    )

    distinct_moments = len(
        {
            item.vocal_moment
            for item in plan
        }
    )

    if (
        len(plan) >= 4
        and distinct_rates < 2
    ):
        issues.append(
            "insufficient-tempo-variation"
        )

    passed = len(issues) == 0

    return {
        "passed":
            passed,

        "issues":
            issues,

        "distinctRates":
            distinct_rates,

        "distinctVocalMoments":
            distinct_moments,

        "maximumConsecutiveLongPauses":
            maximum_consecutive,
    }


# ============================================================
# SRT
# ============================================================


def srt_time(
    ms: int,
) -> str:
    hours = ms // 3_600_000
    ms %= 3_600_000

    minutes = ms // 60_000
    ms %= 60_000

    seconds = ms // 1_000
    millis = ms % 1_000

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
            segment["speechStartMs"]
        )

        end_ms = int(
            segment["speechEndMs"]
        )

        text = str(
            segment["spoken_text"]
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
            f"No existe VideoSpec: {SPEC}"
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
            for tag in raw_tags
        ]

    return []


# ============================================================
# TIMELINE
# ============================================================


def write_timeline(
    words: list[dict],
    segments: list[dict],
    duration_ms: int,
    direction: CreativeDirection,
    metrics: dict,
    vocal_qa: dict,
) -> None:
    payload = {
        "schemaVersion":
            "2.0",

        "productionCode":
            PRODUCTION_CODE,

        # Contrato histórico preservado.
        "version":
            "V3.15-C-PROSODY-DIRECTOR",

        "prosodyEngineVersion":
            VERSION,

        "engine":
            (
                "edge-tts-adaptive-human-"
                "vocal-performance"
            ),

        "language":
            LANGUAGE,

        "voice":
            VOICE,

        "creativeProsody":
            direction.prosody,

        "creativeRhythm":
            direction.rhythm,

        "narrativeArchitecture":
            direction.narrative_architecture,

        "creativeGenre":
            direction.genre,

        "vocalDirectionMode":
            direction.vocal.mode,

        "rhythmMetrics":
            metrics,

        "vocalQA":
            vocal_qa,

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
    direction: CreativeDirection,
    metrics: dict,
    vocal_qa: dict,
) -> None:
    opening_changed = bool(
        plan
        and (
            plan[0].original_text
            != plan[0].spoken_text
        )
    )

    semantic_break_count = sum(
        1
        for item in plan
        if item.semantic_break
    )

    moment_distribution: dict[
        str,
        int,
    ] = {}

    for item in plan:
        moment_distribution[
            item.vocal_moment
        ] = (
            moment_distribution.get(
                item.vocal_moment,
                0,
            )
            + 1
        )

    payload = {
        "productionCode":
            PRODUCTION_CODE,

        # Compatibilidad con auditoría existente.
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

            "semanticBreakCount":
                semantic_break_count,

            "creativeProsody":
                direction.prosody,

            "creativeRhythm":
                direction.rhythm,

            "narrativeArchitecture":
                direction.narrative_architecture,

            "creativeGenre":
                direction.genre,

            "vocalDirectionMode":
                direction.vocal.mode,

            "momentDistribution":
                moment_distribution,

            "durationMs":
                duration_ms,
        },

        "vocalDirection": {
            "targetWpm":
                asdict(
                    direction
                    .vocal
                    .target_wpm
                ),

            "tempoVariation":
                asdict(
                    direction
                    .vocal
                    .tempo
                ),

            "breathing": {
                "micro":
                    asdict(
                        direction
                        .vocal
                        .breathing
                        .micro
                    ),

                "phrase":
                    asdict(
                        direction
                        .vocal
                        .breathing
                        .phrase
                    ),

                "conceptual":
                    asdict(
                        direction
                        .vocal
                        .breathing
                        .conceptual
                    ),

                "preserveSentenceFlow":
                    direction
                    .vocal
                    .breathing
                    .preserve_sentence_flow,
            },

            "expression":
                asdict(
                    direction
                    .vocal
                    .expression
                ),

            "momentPriority":
                direction
                .vocal
                .moment_priority,

            "principles":
                direction
                .vocal
                .principles,

            "avoid":
                direction
                .vocal
                .avoid,
        },

        "rhythmMetrics":
            metrics,

        "vocalQA":
            vocal_qa,

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


async def main() -> No
    )
