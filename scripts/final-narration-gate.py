#!/usr/bin/env python3
import json
import re
import sys
import unicodedata
from pathlib import Path

MARKER = "FINAL-NARRATION-GATE-V1"

def clean_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()

def normalize(value: str) -> str:
    value = unicodedata.normalize("NFD", clean_spaces(value))
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return value.lower()

def is_methodological_echo(value: str) -> bool:
    n = normalize(value)

    ordered = bool(
        re.search(
            r"hech(?:o|os).{0,90}prueb(?:a|as).{0,90}norm(?:a|as)",
            n,
        )
    )

    families = (
        r"\bhech(?:o|os)\b",
        r"\bprueb(?:a|as)\b|\bevidenc",
        r"\bnorm(?:a|as)\b|\bregla(?:s)?\b",
        r"\bjurisprud|\bprecedent",
        r"\bestrateg|\bdecision",
    )
    hits = sum(1 for pattern in families if re.search(pattern, n))

    connector = bool(
        re.search(
            r"\bconect|\bintegr|\banaliz|\brelacion|\bsecuencia|\bcadena",
            n,
        )
    )

    explicit_echo = bool(
        re.search(
            r"(?:se\s+)?analiz\w*.{0,80}(?:sin\s+)?conect\w*",
            n,
        )
        and hits >= 3
    )

    return explicit_echo or ordered or (hits >= 4 and connector)

def split_sentences(text: str) -> list[str]:
    text = clean_spaces(text)
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+(?=\S)", text)
    return [clean_spaces(p) for p in parts if clean_spaces(p)]

def sanitize_narration(text: str) -> tuple[str, list[str]]:
    sentences = split_sentences(text)
    if not sentences:
        raise ValueError("Narración vacía.")

    removed: list[str] = []
    kept: list[str] = []

    # La muletilla detectada se repite como apertura; controlamos los primeros
    # tres pensamientos para no borrar contenido jurídico legítimo en el cuerpo.
    for index, sentence in enumerate(sentences):
        if index < 3 and is_methodological_echo(sentence):
            removed.append(sentence)
        else:
            kept.append(sentence)

    if not kept:
        raise ValueError("El filtro anti-muletilla dejaría la narración vacía.")

    result = clean_spaces(" ".join(kept))

    # Gate duro: una fórmula de apertura no puede llegar al TTS.
    for sentence in split_sentences(result)[:3]:
        if is_methodological_echo(sentence):
            raise ValueError(
                "La muletilla metodológica sigue presente después del saneamiento."
            )

    return result, removed

def process(production_code: str, root: Path) -> None:
    spec_path = root / "examples" / f"{production_code}.video.json"
    if not spec_path.exists():
        raise SystemExit(f"ERROR: no existe {spec_path}")

    data = json.loads(spec_path.read_text(encoding="utf-8"))
    audio = data.get("audio")
    if not isinstance(audio, dict):
        raise SystemExit("ERROR: VideoSpec no contiene objeto audio.")

    original = str(audio.get("narrationText", "")).strip()
    if not original:
        raise SystemExit("ERROR: VideoSpec no contiene audio.narrationText.")

    cleaned, removed = sanitize_narration(original)
    audio["narrationText"] = cleaned
    data["audio"] = audio
    data.setdefault("meta", {})
    if isinstance(data["meta"], dict):
        data["meta"]["finalNarrationGate"] = {
            "version": MARKER,
            "removedMethodologicalEchoCount": len(removed),
        }

    spec_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"{MARKER}: PASS")
    print(f"VideoSpec: {spec_path}")
    print(f"Muletillas eliminadas: {len(removed)}")
    for item in removed:
        print("ELIMINADA:", item)
    print("APERTURA FINAL:", split_sentences(cleaned)[0])

def self_test() -> None:
    bad = (
        "Este asunto se analiza sin conectar hechos, pruebas, norma, "
        "jurisprudencia y estrategia. "
        "Una resolución administrativa puede parecer correcta y aun así estar mal motivada."
    )
    cleaned, removed = sanitize_narration(bad)
    assert len(removed) == 1
    assert "hechos" not in normalize(split_sentences(cleaned)[0]) or not is_methodological_echo(split_sentences(cleaned)[0])
    assert cleaned.startswith("Una resolución administrativa")

    good = (
        "Una resolución administrativa puede parecer correcta y aun así estar mal motivada. "
        "La diferencia puede definir si corresponde impugnarla."
    )
    cleaned2, removed2 = sanitize_narration(good)
    assert cleaned2 == good
    assert removed2 == []
    print("SELF_TEST_FINAL_NARRATION_GATE_OK")

if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--self-test":
        self_test()
        raise SystemExit(0)
    if len(sys.argv) != 2:
        raise SystemExit("Uso: final-narration-gate.py <production_code>")
    process(sys.argv[1], Path.cwd())

