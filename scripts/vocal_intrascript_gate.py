#!/usr/bin/env python3
"""Editorial quality gate V2: literal, partial and conservative near repetitions.

Never rewrites reviewed legal material. Exit 42: try another source-bound
conception. Exit 2: invalid input/runtime; do not mislabel as repetition.
"""
from __future__ import annotations
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

VERSION = "INTRASCRIPT-EDITORIAL-GATE-V2"


def normalize(text: str) -> str:
    folded = "".join(c for c in unicodedata.normalize("NFD", text.casefold())
                     if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9ñ]+", " ", folded)).strip()


def tokens(text: str) -> list[str]:
    return normalize(text).split()


def sentences(text: str) -> list[str]:
    # Split for audits only: legal source text itself is never changed.
    return [s.strip() for s in re.split(r"(?<=[.!?…])\s+|(?<=[;])\s+", text)
            if s.strip()]


def _unique_hits(items: list[dict], code: str, label: str, limit: int = 12) -> list[dict]:
    seen = set()
    out = []
    for item in items:
        k = normalize(item.get("text", ""))
        if k in seen: continue
        seen.add(k)
        out.append({"kind": code, "description": label, **item})
        if len(out) >= limit: break
    return out


def find_repetitions(narration: str, minimum_words: int = 12) -> list[dict]:
    clauses = sentences(narration)
    normalized = [normalize(c) for c in clauses]
    freq = Counter(x for x in normalized if len(x.split()) >= minimum_words)
    results = [{"text": clauses[i], "wordCount": len(key.split()),
                "occurrences": freq[key]}
               for i, key in enumerate(normalized) if freq[key] > 1
               and normalized.index(key) == i]
    return _unique_hits(results, "exact", "Proposición larga repetida")


def repeated_spans(narration: str, min_words: int = 8) -> list[dict]:
    """Detect repeating contiguous spans, including WITHIN one sentence.

    Collapse overlaps into maximal ranges, and avoid flagging repeated short
    technical names (e.g. 'acción de libertad') alone.
    """
    ts = tokens(narration)
    if len(ts) < min_words * 2: return []
    seen: dict[tuple[str, ...], list[int]] = {}
    for i in range(len(ts) - min_words + 1):
        k = tuple(ts[i:i + min_words])
        seen.setdefault(k, []).append(i)
    found = []
    covered: list[tuple[int, int]] = []
    for fragment, indices in seen.items():
        if len(indices) < 2: continue
        first = indices[0]
        second = next((i for i in indices[1:] if i - first >= min_words), None)
        if second is None: continue
        # Only report first occurrence of an overlapping longer match.
        if first > 0 and second > 0 and ts[first - 1] == ts[second - 1]: continue
        length = min_words
        while first + length < len(ts) and second + length < len(ts) and ts[first + length] == ts[second + length]:
            length += 1
        if any(a <= first < b and length <= b - a for a, b in covered): continue
        covered.append((first, first + length))
        found.append({"text": " ".join(ts[first:first + length]), "wordCount": length,
                      "firstWordIndex": first, "repeatWordIndex": second, "occurrences": 2})
    found.sort(key=lambda x: (-x["wordCount"], x["firstWordIndex"]))
    # Remove substrings already covered by longer hits.
    kept = []
    for hit in found:
        if any(hit["text"] in longer["text"] for longer in kept): continue
        kept.append(hit)
    return _unique_hits(kept, "partial", "Fragmento repetido dentro o entre proposiciones")


def near_duplicates(narration: str) -> list[dict]:
    """Conservative lexical heuristic; not a semantic legal equivalence oracle."""
    clauses = sentences(narration)
    hits = []
    for i, a in enumerate(clauses):
        ta = tokens(a)
        if len(ta) < 11: continue
        sa = set(" ".join(ta[x:x+3]) for x in range(len(ta)-2))
        for j in range(i + 1, len(clauses)):
            b = clauses[j]
            tb = tokens(b)
            if len(tb) < 11 or abs(len(tb)-len(ta)) > max(len(tb),len(ta))*0.3: continue
            sb = set(" ".join(tb[x:x+3]) for x in range(len(tb)-2))
            denom = min(len(sa), len(sb))
            if denom and len(sa & sb) / denom >= 0.8 and normalize(a) != normalize(b):
                hits.append({"text": a[:175] + " ≈ " + b[:175], "firstClause": i,
                             "secondClause": j, "overlap": round(len(sa & sb)/denom, 3)})
    return _unique_hits(hits, "near", "Reformulación casi idéntica; revisar diferencia jurídica")


UNSUPPORTED_BRIDGES = [
    "ahora llevelo a una situacion real", "el punto juridico decisivo es este",
    "en este tema suele discutirse confundir", "ahora observe esto",
    "que debe llevarse de esto", "antes de pensar en articulos piense en la consecuencia",
    "para entenderlo sin perderse en tecnicismos mire la secuencia",
]


def formulaic_phrases(narration: str) -> list[dict]:
    norm = normalize(narration)
    return [{"kind": "formulaic", "description": "Puente genérico o construcción defectuosa",
             "text": phrase} for phrase in UNSUPPORTED_BRIDGES if phrase in norm]


def repetitive_topic(narration: str, topic: str) -> list[dict]:
    words = tokens(topic)
    if len(words) < 2: return []
    norm = normalize(narration)
    phrase = " ".join(words)
    count = len(re.findall(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", norm))
    limit = max(2, min(5, (len(tokens(narration)) + 109) // 110))
    return [{"kind": "topic", "description": "Nombre del tema reiterado sin función narrativa",
             "text": topic, "occurrences": count, "maximum": limit}] if count > limit else []


def unsupported_promises(narration: str) -> list[dict]:
    t = normalize(narration)
    # A case invitation without characters, event or evidence is performative.
    promises = ["veamos un caso real", "miremos un caso concreto", "imagine este caso"]
    return [{"kind": "promised-case", "description": "Promesa de caso sin prueba de desarrollo",
             "text": p} for p in promises if p in t and len(tokens(narration)) < 30]


def audit_text(narration: str, topic: str = "") -> dict:
    if not isinstance(narration, str) or not narration.strip():
        raise ValueError("Narración vacía")
    findings = (find_repetitions(narration) + repeated_spans(narration)
                + near_duplicates(narration) + formulaic_phrases(narration)
                + repetitive_topic(narration, topic) + unsupported_promises(narration))
    # Advisory: lexical heuristics cannot certify doctrinal accuracy, particular
    # legislation, jurisprudence, or the usefulness of an undocumented claim.
    return {"version": VERSION, "passed": not findings, "issues": findings,
            "repetitions": [x for x in findings if x["kind"] in ("exact", "partial", "near")],
            "warnings": ["La especificidad y corrección jurídica deben verificarse en la ficha fuente revisada; esta auditoría no inventa normas."],
            "narrationWords": len(tokens(narration)), "topicMentions":
                len(re.findall(re.escape(normalize(topic)), normalize(narration))) if topic else 0}


def audit(spec_path: Path, report_path: Path) -> bool:
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    narration = spec.get("audio", {}).get("narrationText", "")
    if not isinstance(narration, str) or not narration.strip():
        raise ValueError("Narración vacía o inválida")
    data = audit_text(narration, str(spec.get("meta", {}).get("title", "")))
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{VERSION}: {'PASS' if data['passed'] else 'RETRY'} — {len(data['issues'])} hallazgos")
    for issue in data["issues"][:12]:
        print(f"{issue['kind'].upper()}: {issue['text'][:175]}")
    return data["passed"]


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
