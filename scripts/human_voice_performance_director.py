#!/usr/bin/env python3

"""
V3.19-E.3 — HUMAN VOICE PERFORMANCE DIRECTOR

Convierte la narración escrita en una partitura vocal semántica.

NO sintetiza audio.
NO reemplaza Edge TTS.
NO modifica WordBoundary.
NO modifica timeline ni sincronización.

Principio rector:
LA NARRACIÓN DEBE ENTENDER LO QUE ESTÁ DICIENDO.
"""

import json
import os
import re
import sys
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Optional


# ============================================================
# CONFIGURACIÓN
# ============================================================

ROOT = Path.cwd()

PRODUCTION_CODE = os.environ.get("PRODUCTION_CODE") or (
    sys.argv[1] if len(sys.argv) > 1 else None
)

if not PRODUCTION_CODE:
    raise RuntimeError("PRODUCTION_CODE is required")


SPEC = ROOT / f"examples/{PRODUCTION_CODE}.video.json"

CREATIVE_DECISION = ROOT / (
    f"public/generated/{PRODUCTION_CODE}-creative-decision.json"
)

OUTPUT = ROOT / (
    f"public/generated/{PRODUCTION_CODE}-vocal-score.json"
)

VERSION = "V3.19-E.3-HUMAN-VOICE-PERFORMANCE-DIRECTOR"


# ============================================================
# CONTRATOS
# ============================================================

@dataclass
class VocalGesture:
    pause_before_ms: int
    pause_after_ms: int
    rate_delta_percent: int
    pitch_delta_hz: int

    energy: float
    emphasis: float
    certainty: float
    tension: float

    breathe_before: bool
    breathe_after: bool
    connect_forward: bool

    semantic_weight: float


@dataclass
class VocalUnit:
    index: int
    text: str

    punctuation: str
    sentence_type: str
    semantic_role: str

    keywords: list[str]
    gesture: VocalGesture


@dataclass
class VocalScore:
    version: str
    production_code: str

    language: str
    global_intention: str
    narrative_arc: str

    units: list[VocalUnit]
    principles: list[str]
    qa: dict[str, Any]


# ============================================================
# UTILIDADES
# ============================================================

def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "")
    value = value.replace("…", "...")
    value = value.replace("—", " — ")
    value = re.sub(r"\s+", " ", value)

    return value.strip()


def clamp(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    return max(
        minimum,
        min(maximum, value),
    )


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}

    try:
        return json.loads(
            path.read_text(encoding="utf-8")
        )
    except Exception:
        return {}


def deep_find_strings(
    value: Any,
    keys: set[str],
) -> list[str]:

    found: list[str] = []

    if isinstance(value, dict):
        for key, child in value.items():
            normalized_key = str(key).lower()

            if normalized_key in keys:
                if isinstance(child, str):
                    found.append(child)

                elif isinstance(child, list):
                    for item in child:
                        if isinstance(item, str):
                            found.append(item)

            found.extend(
                deep_find_strings(child, keys)
            )

    elif isinstance(value, list):
        for item in value:
            found.extend(
                deep_find_strings(item, keys)
            )

    return found


# ============================================================
# EXTRACCIÓN DE NARRACIÓN
# ============================================================

NARRATION_KEYS = {
    "narration",
    "narration_text",
    "narrationtext",
    "voiceover",
    "voice_over",
    "script",
    "spoken_text",
}


def extract_narration(
    spec: dict[str, Any],
) -> str:

    candidates = deep_find_strings(
        spec,
        NARRATION_KEYS,
    )

    cleaned: list[str] = []
    seen: set[str] = set()

    for candidate in candidates:
        text = normalize_text(candidate)

        if len(text) < 2:
            continue

        fingerprint = text.lower()

        if fingerprint in seen:
            continue

        seen.add(fingerprint)
        cleaned.append(text)

    if not cleaned:
        raise RuntimeError(
            "E.3 could not locate narration in VideoSpec"
        )

    cleaned.sort(
        key=len,
        reverse=True,
    )

    return cleaned[0]


# ============================================================
# SEGMENTACIÓN SEMÁNTICA
# ============================================================

SENTENCE_PATTERN = re.compile(
    r"""
    .*?
    (?:
        \.\.\.
        |
        [.!?;:]
        |
        $
    )
    """,
    re.VERBOSE | re.DOTALL,
)


def split_sentences(
    text: str,
) -> list[str]:

    text = normalize_text(text)
    pieces: list[str] = []

    for match in SENTENCE_PATTERN.finditer(text):
        piece = normalize_text(
            match.group(0)
        )

        if piece:
            pieces.append(piece)

    if not pieces and text:
        pieces = [text]

    return pieces


def split_semantic_clauses(
    sentence: str,
) -> list[str]:

    sentence = normalize_text(sentence)

    pattern = (
        r"(?<=,)\s+"
        r"(?=(?:pero|sin embargo|aunque|porque|por eso|"
        r"por tanto|además|ahora bien|en cambio|"
        r"mientras|cuando|si|entonces)\b)"
    )

    pieces = re.split(
        pattern,
        sentence,
        flags=re.IGNORECASE,
    )

    result = [
        normalize_text(piece)
        for piece in pieces
        if normalize_text(piece)
    ]

    return result or [sentence]


def build_units(
    text: str,
) -> list[str]:

    units: list[str] = []

    for sentence in split_sentences(text):
        units.extend(
            split_semantic_clauses(sentence)
        )

    return units


# ============================================================
# CLASIFICACIÓN LINGÜÍSTICA
# ============================================================

QUESTION_WORDS = (
    "qué ",
    "por qué ",
    "cómo ",
    "cuándo ",
    "cuál ",
    "cuáles ",
    "quién ",
    "dónde ",
)


WARNING_MARKERS = (
    "riesgo",
    "peligro",
    "error",
    "problema",
    "incumpl",
    "perder",
    "pérdida",
    "consecuencia",
    "amenaza",
    "fracaso",
    "responsabilidad",
)


AUTHORITY_MARKERS = (
    "debe",
    "es necesario",
    "resulta esencial",
    "la clave",
    "estratégicamente",
    "jurídicamente",
    "la evidencia",
    "la prueba",
    "el análisis",
)


REVELATION_MARKERS = (
    "en realidad",
    "sin embargo",
    "pero",
    "lo importante",
    "la verdadera",
    "el verdadero",
    "la diferencia",
    "precisamente",
    "lo que cambia",
)


DECISION_MARKERS = (
    "decidir",
    "decisión",
    "antes de",
    "conviene",
    "estrategia",
    "elegir",
    "determinar",
    "evaluar",
)


CTA_MARKERS = (
    "consulte",
    "consulta",
    "asesoría",
    "diagnóstico",
    "analizar su caso",
    "su operación",
    "su empresa",
    "su estrategia",
)


CONTRAST_MARKERS = (
    "pero",
    "sin embargo",
    "aunque",
    "en cambio",
    "mientras",
    "no basta",
    "no es",
    "sino",
)


CAUSE_MARKERS = (
    "porque",
    "por eso",
    "por tanto",
    "debido",
    "como consecuencia",
    "por esta razón",
)


def contains_any(
    text: str,
    markers: tuple[str, ...],
) -> bool:

    lowered = text.lower()

    return any(
        marker in lowered
        for marker in markers
    )


def punctuation_of(
    text: str,
) -> str:

    stripped = text.rstrip()

    if stripped.endswith("..."):
        return "ellipsis"

    if stripped.endswith("?"):
        return "question"

    if stripped.endswith("!"):
        return "exclamation"

    if stripped.endswith(":"):
        return "colon"

    if stripped.endswith(";"):
        return "semicolon"

    if stripped.endswith("."):
        return "period"

    if stripped.endswith(","):
        return "comma"

    return "none"


def sentence_type(
    text: str,
) -> str:

    lowered = text.lower().strip()

    if "?" in text:
        return "question"

    if "!" in text:
        return "exclamation"

    if lowered.startswith(QUESTION_WORDS):
        return "question"

    if contains_any(
        lowered,
        CONTRAST_MARKERS,
    ):
        return "contrast"

    if contains_any(
        lowered,
        CAUSE_MARKERS,
    ):
        return "causal"

    return "statement"


# ============================================================
# PAPEL NARRATIVO
# ============================================================

def classify_semantic_role(
    text: str,
    index: int,
    total: int,
) -> str:

    lowered = text.lower()

    progress = (
        index / max(total - 1, 1)
    )

    if index == 0:
        return "opening"

    if progress >= 0.86:
        if contains_any(
            lowered,
            CTA_MARKERS,
        ):
            return "cta"

        return "closing"

    if contains_any(
        lowered,
        WARNING_MARKERS,
    ):
        return "warning"

    if contains_any(
        lowered,
        REVELATION_MARKERS,
    ):
        return "revelation"

    if contains_any(
        lowered,
        CONTRAST_MARKERS,
    ):
        return "contrast"

    if contains_any(
        lowered,
        DECISION_MARKERS,
    ):
        return "decision"

    if contains_any(
        lowered,
        AUTHORITY_MARKERS,
    ):
        return "authority"

    if "?" in text:
        return "question"

    if progress < 0.35:
        return "context"

    if progress < 0.72:
        return "explanation"

    return "resolution"


# ============================================================
# PALABRAS CON PESO SEMÁNTICO
# ============================================================

STOPWORDS = {
    "para",
    "como",
    "pero",
    "porque",
    "desde",
    "hasta",
    "entre",
    "sobre",
    "este",
    "esta",
    "estos",
    "estas",
    "esto",
    "cuando",
    "donde",
    "quien",
    "que",
    "una",
    "uno",
    "unos",
    "unas",
    "del",
    "las",
    "los",
    "con",
    "sin",
    "por",
    "sus",
    "más",
    "muy",
    "ser",
    "son",
    "puede",
}


def extract_keywords(
    text: str,
    maximum: int = 4,
) -> list[str]:

    words = re.findall(
        r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+",
        text,
    )

    candidates: list[str] = []

    for word in words:
        normalized = word.lower()

        if len(normalized) < 5:
            continue

        if normalized in STOPWORDS:
            continue

        if normalized not in candidates:
            candidates.append(normalized)

    weighted = sorted(
        candidates,
        key=lambda word: (
            contains_any(
                word,
                WARNING_MARKERS
                + DECISION_MARKERS
                + AUTHORITY_MARKERS,
            ),
            len(word),
        ),
        reverse=True,
    )

    return weighted[:maximum]


# ============================================================
# PUNTUACIÓN INTERPRETADA
# ============================================================

def punctuation_pause(
    punctuation: str,
) -> tuple[int, int]:

    table = {
        "comma": (35, 90),
        "semicolon": (100, 180),
        "colon": (110, 210),
        "period": (145, 260),
        "question": (170, 300),
        "exclamation": (130, 230),
        "ellipsis": (210, 390),
        "none": (20, 70),
    }

    return table.get(
        punctuation,
        (30, 100),
  )
  # ============================================================
# MOTOR DE GESTO VOCAL
# ============================================================

ROLE_GESTURES: dict[str, dict[str, Any]] = {

    "opening": {
        "rate": -5,
        "pitch": 1,
        "energy": 0.72,
        "emphasis": 0.74,
        "certainty": 0.78,
        "tension": 0.34,
    },

    "question": {
        "rate": -4,
        "pitch": 2,
        "energy": 0.66,
        "emphasis": 0.65,
        "certainty": 0.60,
        "tension": 0.42,
    },

    "context": {
        "rate": 1,
        "pitch": 0,
        "energy": 0.54,
        "emphasis": 0.44,
        "certainty": 0.72,
        "tension": 0.20,
    },

    "explanation": {
        "rate": 0,
        "pitch": 0,
        "energy": 0.57,
        "emphasis": 0.50,
        "certainty": 0.78,
        "tension": 0.18,
    },

    "warning": {
        "rate": -7,
        "pitch": -1,
        "energy": 0.75,
        "emphasis": 0.84,
        "certainty": 0.84,
        "tension": 0.72,
    },

    "contrast": {
        "rate": -3,
        "pitch": 1,
        "energy": 0.68,
        "emphasis": 0.75,
        "certainty": 0.78,
        "tension": 0.46,
    },

    "revelation": {
        "rate": -6,
        "pitch": 1,
        "energy": 0.72,
        "emphasis": 0.86,
        "certainty": 0.86,
        "tension": 0.50,
    },

    "authority": {
        "rate": -5,
        "pitch": -1,
        "energy": 0.70,
        "emphasis": 0.79,
        "certainty": 0.94,
        "tension": 0.24,
    },

    "decision": {
        "rate": -4,
        "pitch": 0,
        "energy": 0.74,
        "emphasis": 0.80,
        "certainty": 0.90,
        "tension": 0.35,
    },

    "resolution": {
        "rate": -2,
        "pitch": -1,
        "energy": 0.63,
        "emphasis": 0.64,
        "certainty": 0.88,
        "tension": 0.16,
    },

    "cta": {
        "rate": -5,
        "pitch": 0,
        "energy": 0.70,
        "emphasis": 0.76,
        "certainty": 0.92,
        "tension": 0.12,
    },

    "closing": {
        "rate": -7,
        "pitch": -2,
        "energy": 0.61,
        "emphasis": 0.72,
        "certainty": 0.96,
        "tension": 0.08,
    },
}


def build_gesture(
    text: str,
    role: str,
    punctuation: str,
    index: int,
    total: int,
) -> VocalGesture:

    profile = ROLE_GESTURES.get(
        role,
        ROLE_GESTURES["explanation"],
    )

    pause_min, pause_max = punctuation_pause(
        punctuation
    )

    word_count = len(
        re.findall(
            r"\b[\wÁÉÍÓÚÜÑáéíóúüñ]+\b",
            text,
        )
    )

    long_phrase = word_count >= 19
    very_long_phrase = word_count >= 27

    breathe_before = (
        role
        in {
            "opening",
            "warning",
            "revelation",
            "authority",
            "decision",
            "cta",
            "closing",
        }
        and index > 0
    )

    breathe_after = (
        very_long_phrase
        or role
        in {
            "warning",
            "revelation",
            "decision",
            "closing",
        }
    )

    semantic_multiplier = 1.0

    if role in {
        "warning",
        "revelation",
        "authority",
        "decision",
    }:
        semantic_multiplier += 0.22

    if role == "closing":
        semantic_multiplier += 0.30

    if role == "context":
        semantic_multiplier -= 0.20

    if punctuation == "comma":
        semantic_multiplier *= 0.72

    if punctuation == "ellipsis":
        semantic_multiplier *= 1.18

    if long_phrase:
        semantic_multiplier += 0.08

    pause_after = int(
        clamp(
            (
                (pause_min + pause_max)
                / 2
            )
            * semantic_multiplier,
            25,
            480,
        )
    )

    pause_before = 0

    if breathe_before:
        pause_before = int(
            clamp(
                95
                + profile["emphasis"] * 95,
                90,
                210,
            )
        )

    connect_forward = (
        punctuation
        in {
            "comma",
            "colon",
            "semicolon",
            "none",
        }
        and role
        not in {
            "warning",
            "revelation",
            "closing",
        }
    )

    semantic_weight = (
        profile["emphasis"] * 0.45
        + profile["certainty"] * 0.30
        + profile["energy"] * 0.25
    )

    return VocalGesture(
        pause_before_ms=pause_before,
        pause_after_ms=pause_after,

        rate_delta_percent=int(
            clamp(
                profile["rate"],
                -10,
                8,
            )
        ),

        pitch_delta_hz=int(
            clamp(
                profile["pitch"],
                -3,
                3,
            )
        ),

        energy=round(
            profile["energy"],
            3,
        ),

        emphasis=round(
            profile["emphasis"],
            3,
        ),

        certainty=round(
            profile["certainty"],
            3,
        ),

        tension=round(
            profile["tension"],
            3,
        ),

        breathe_before=breathe_before,
        breathe_after=breathe_after,

        connect_forward=connect_forward,

        semantic_weight=round(
            semantic_weight,
            3,
        ),
    )


# ============================================================
# DIRECCIÓN CREATIVA GLOBAL
# ============================================================

def creative_string(
    decision: dict[str, Any],
    *keys: str,
) -> Optional[str]:

    wanted = {
        key.lower()
        for key in keys
    }

    values = deep_find_strings(
        decision,
        wanted,
    )

    if not values:
        return None

    return normalize_text(
        values[0]
    )


def determine_global_intention(
    creative: dict[str, Any],
) -> str:

    prosody = creative_string(
        creative,
        "prosody",
        "prosodyprofile",
        "prosody_profile",
    )

    genre = creative_string(
        creative,
        "genre",
    )

    if prosody:
        return prosody

    if genre:
        return genre

    return "authoritative-natural"


def determine_narrative_arc(
    creative: dict[str, Any],
) -> str:

    architecture = creative_string(
        creative,
        "narrativearchitecture",
        "narrative_architecture",
    )

    if architecture:
        return architecture

    return "semantic-progressive"


# ============================================================
# QA DE LA PARTITURA
# ============================================================

def build_qa(
    units: list[VocalUnit],
) -> dict[str, Any]:

    if not units:
        return {
            "passed": False,
            "reason": "no-vocal-units",
        }

    rates = [
        unit.gesture.rate_delta_percent
        for unit in units
    ]

    pauses = [
        unit.gesture.pause_after_ms
        for unit in units
    ]

    roles = {
        unit.semantic_role
        for unit in units
    }

    unique_rates = len(
        set(rates)
    )

    unique_pauses = len(
        set(pauses)
    )

    monotony_risk = (
        unique_rates <= 1
        or unique_pauses <= 2
    )

    has_narrative_variation = (
        len(roles) >= 3
    )

    passed = (
        not monotony_risk
        and has_narrative_variation
    )

    return {
        "passed": passed,
        "unitCount": len(units),
        "semanticRoles": sorted(roles),
        "uniqueRateLevels": unique_rates,
        "uniquePauseLevels": unique_pauses,
        "monotonyRisk": monotony_risk,
        "narrativeVariation":
            has_narrative_variation,
    }


# ============================================================
# CONSTRUCCIÓN DE PARTITURA
# ============================================================

def build_vocal_score(
    narration: str,
    creative: dict[str, Any],
) -> VocalScore:

    raw_units = build_units(
        narration
    )

    total = len(
        raw_units
    )

    vocal_units: list[VocalUnit] = []

    for index, text in enumerate(
        raw_units
    ):

        punctuation = punctuation_of(
            text
        )

        role = classify_semantic_role(
            text,
            index,
            total,
        )

        gesture = build_gesture(
            text=text,
            role=role,
            punctuation=punctuation,
            index=index,
            total=total,
        )

        vocal_units.append(
            VocalUnit(
                index=index,
                text=text,

                punctuation=punctuation,

                sentence_type=sentence_type(
                    text
                ),

                semantic_role=role,

                keywords=extract_keywords(
                    text
                ),

                gesture=gesture,
            )
        )

    qa = build_qa(
        vocal_units
    )

    return VocalScore(
        version=VERSION,

        production_code=PRODUCTION_CODE,

        language="es-BO",

        global_intention=(
            determine_global_intention(
                creative
            )
        ),

        narrative_arc=(
            determine_narrative_arc(
                creative
            )
        ),

        units=vocal_units,

        principles=[
            (
                "Comprender significado antes "
                "de modificar la voz."
            ),
            (
                "Interpretar puntuación; "
                "no obedecerla mecánicamente."
            ),
            (
                "Respirar por unidades conceptuales."
            ),
            (
                "Preservar continuidad cuando "
                "la idea todavía no terminó."
            ),
            (
                "Reservar énfasis fuerte para "
                "información estratégicamente importante."
            ),
            (
                "Evitar ritmo metronómico."
            ),
            (
                "La narración debe sonar como "
                "una persona que conoce lo que afirma."
            ),
        ],

        qa=qa,
    )


# ============================================================
# SERIALIZACIÓN
# ============================================================

def serialize_score(
    score: VocalScore,
) -> dict[str, Any]:

    return asdict(
        score
    )


# ============================================================
# MAIN
# ============================================================

def main() -> None:

    print(
        "[E.3] Human Voice Performance Director"
    )

    print(
        f"[E.3] Production: {PRODUCTION_CODE}"
    )

    spec = load_json(
        SPEC
    )

    if not spec:
        raise RuntimeError(
            f"VideoSpec not found or invalid: {SPEC}"
        )

    creative = load_json(
        CREATIVE_DECISION
    )

    narration = extract_narration(
        spec
    )

    score = build_vocal_score(
        narration=narration,
        creative=creative,
    )

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    OUTPUT.write_text(
        json.dumps(
            serialize_score(score),
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        f"[E.3] Vocal units: {len(score.units)}"
    )

    print(
        f"[E.3] Intention: "
        f"{score.global_intention}"
    )

    print(
        f"[E.3] Narrative arc: "
        f"{score.narrative_arc}"
    )

    print(
        f"[E.3] QA passed: "
        f"{score.qa.get('passed')}"
    )

    print(
        f"[E.3] Output: {OUTPUT}"
    )


if __name__ == "__main__":
    main()
