#!/usr/bin/env python3
"""Fail closed on long verbatim repetitions; never alter reviewed legal text."""
from __future__ import annotations
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

VERSION = "INTRASCRIPT-SINGULARITY-GATE-V1"


def normalize(text: str) -> str:
    folded = "".join(x for x in unicodedata.normalize("NFD", text.casefold()) if unicodedata.category(x) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9ñ]+", " ", folded)).strip()


def find_repetitions(narration: str, minimum_words: int = 12) -> list[dict]:
    from spanish_vocal_delivery import split_thoughts
    thoughts = split_thoughts(narration)
    keys = [normalize(t) for t in thoughts]
    freq = Counter(k for k in keys if len(k.split()) >= minimum_words)
    return [{"text": thoughts[i], "wordCount": len(key.split()), "occurrences": count}
            for i, key in enumerate(keys) if freq[key] > 1 and keys.index(key) == i
            for count in [freq[key]]]


def audit(spec_path: Path, report_path: Path) -> bool:
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    narration = spec.get("audio", {}).get("narrationText", "")
    if not isinstance(narration, str) or not narration.strip():
        raise ValueError("Narración vacía")
    repeats = find_repetitions(narration)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps({"version": VERSION, "passed": not repeats, "repetitions": repeats},
                                      ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{VERSION}: {'PASS' if not repeats else 'RETRY'} — {len(repeats)} repeticiones largas")
    for repeat in repeats:
        print(f"REPETICIÓN x{repeat['occurrences']}: {repeat['text'][:160]}")
    return not repeats


if __name__ == "__main__":
    if len(sys.argv) != 2 or not re.fullmatch(r"[a-zA-Z0-9_-]+", sys.argv[1]):
        raise SystemExit("Uso: vocal_intrascript_gate.py <production_code>")
    code = sys.argv[1]
    try:
        passed = audit(Path(f"examples/{code}.video.json"), Path(f"public/generated/{code}-intrascript-audit.json"))
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as error:
        print(f"ERROR_GUION: {error}", file=sys.stderr)
        raise SystemExit(2)
    raise SystemExit(0 if passed else 42)
