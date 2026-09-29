"""Spanish question direction without rewriting the words sent to TTS.

Edge exposes phrase-level rate, pitch offset and volume, not syllable emphasis
or a programmable intonation contour. Listening remains the acceptance test.
"""
import hashlib
import json
import re
from pathlib import Path

VERSION = "spanish-question-delivery-1"
INTENTS = {
    "curiosidad": (-3, 0, 1, 260),
    "duda": (-4, 1, 0, 300),
    "reflexión": (-5, -1, 0, 360),
    "sorpresa": (-2, 2, 2, 280),
    "cuestionamiento": (-4, -1, 1, 320),
}
INTERROGATIVES = re.compile(r"\b(?:por\s+qué|qué|cómo|cuándo|dónde|cuál(?:es)?|quién(?:es)?)\b", re.I)
ABBREVIATIONS = {"sr", "sra", "srta", "dr", "dra", "lic", "art", "arts", "núm", "no", "pág", "págs", "etc", "msc", "phd"}


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def assert_same_text(original: str, spoken: str) -> None:
    if re.sub(r"\s+", "", original) != re.sub(r"\s+", "", spoken):
        raise ValueError("La interpretación modificó letras, tildes o puntuación del guion.")


def split_thoughts(text: str) -> list[str]:
    """Keep everything inside ¿…? together, including commas and colons."""
    value = clean_text(text)
    thoughts = []
    start = 0
    question_depth = 0
    for index, char in enumerate(value):
        if char == "¿":
            question_depth += 1
        elif char == "?":
            question_depth -= 1
            if question_depth < 0:
                raise ValueError("Interrogación sin apertura ¿: revisar el guion sin forzar su ortografía.")
        if char not in ".!?…" or question_depth:
            continue
        following = value[index + 1:]
        # Ellipsis, decimal numbers and abbreviations are not thought endings.
        if char == ".":
            if following.startswith(".") or (index and value[index - 1].isdigit() and following[:1].isdigit()):
                continue
            token = re.search(r"([\w]+)$", value[:index])
            if token and token[1].lower() in ABBREVIATIONS:
                continue
        if following and not (following[0].isspace() or following[0] in "¿¡"):
            continue
        piece = value[start:index + 1].strip()
        if piece:
            thoughts.append(piece)
        start = index + 1
    if question_depth:
        raise ValueError("Interrogación sin cierre ?: revisar el guion antes de sintetizar.")
    if value[start:].strip():
        thoughts.append(value[start:].strip())
    assert_same_text(value, " ".join(thoughts))
    return thoughts


def question_direction(text: str, intent: str | None = None) -> dict | None:
    if "¿" not in text or "?" not in text:
        if intent is not None:
            raise ValueError("Se asignó intención interrogativa a un pensamiento que no es pregunta.")
        return None
    lowered = text.lower()
    if intent is None:
        if any(marker in lowered for marker in ("de verdad", "en serio", "cómo es posible")):
            intent = "sorpresa"
        elif any(marker in lowered for marker in ("acaso", "basta con", "realmente")):
            intent = "cuestionamiento"
        elif any(marker in lowered for marker in ("y si", "qué pasaría", "qué significa", "hasta qué punto")):
            intent = "reflexión"
        elif any(marker in lowered for marker in ("podría", "podrá", "será", "quizás", "tal vez")):
            intent = "duda"
        else:
            intent = "curiosidad"
    if intent not in INTENTS:
        raise ValueError(f"Intención interrogativa desconocida: {intent}")
    rate, pitch, volume, pause = INTENTS[intent]
    stress = [{"text": match[0], "start": match.start(), "end": match.end()}
              for match in INTERROGATIVES.finditer(text)]
    return {
        "intent": intent,
        "intentBasis": "editable-context-heuristic",
        "interrogatives": stress,
        "rate": rate, "pitch": pitch, "volume": volume, "pauseAfterMs": pause,
        "direction": "Interpretar la pregunta completa; articular las tónicas sin mayúsculas ni cambios ortográficos. No imponer una subida final uniforme.",
        "engineCapability": "phrase-rate-pitch-offset-volume; no syllable or contour control",
        "listeningStatus": "pending",
    }


def read_overrides(file: Path, narration: str) -> dict[int, dict]:
    if not file.exists():
        return {}
    data = json.loads(file.read_text(encoding="utf-8"))
    if data.get("version") != VERSION or data.get("narrationHash") != text_hash(narration):
        raise ValueError("La dirección vocal no corresponde a esta versión del guion.")
    thoughts = split_thoughts(narration)
    result = {}
    ranges = {"rate": (-7, 6), "pitch": (-3, 3), "volume": (-3, 3), "pauseAfterMs": (120, 500)}
    for key, value in data.get("thoughts", {}).items():
        number = int(key)
        if not 1 <= number <= len(thoughts) or not isinstance(value, dict):
            raise ValueError("Pensamiento inválido en dirección vocal.")
        if set(value) - {"intent", *ranges}:
            raise ValueError("Campo de dirección vocal desconocido; no se admite reemplazar el texto.")
        for name, (low, high) in ranges.items():
            if name in value and (type(value[name]) is not int or not low <= value[name] <= high):
                raise ValueError(f"Control {name} fuera del margen profesional moderado.")
        if "intent" in value:
            question_direction(thoughts[number - 1], value["intent"])
        result[number] = value
    return result


def additional_gap_ms(target: int, previous_tail: int, next_lead: int) -> int:
    """Respect natural pauses already in audio; never trim or shift WordBoundary."""
    return max(0, min(500, target) - max(0, previous_tail) - max(0, next_lead))
