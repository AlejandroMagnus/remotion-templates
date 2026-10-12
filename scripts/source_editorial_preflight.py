#!/usr/bin/env python3
"""Bloquea defectos que ya vienen de la ficha SILEC revisada.

Exit 0: fuente estructuralmente apta; 42: fuente requiere revisión jurídica;
2: fichero/JSON inválido. NO modifica ni reescribe el contenido jurídico.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

from vocal_intrascript_gate import formulaic_phrases, repeated_spans

VERSION = "SOURCE-EDITORIAL-PREFLIGHT-V1"
FIELDS = ("hook", "problem", "centralThesis", "conclusion", "closingIdea", "cta")


def inspect(source: dict) -> dict:
    findings: list[dict] = []
    examined: list[tuple[str, str]] = []
    for field in FIELDS:
        value = source.get(field, "")
        if not isinstance(value, str) or not value.strip():
            findings.append({"field": field, "kind": "missing", "text": "Campo vacío o inválido"})
            continue
        examined.append((field, value))
    chain = source.get("reasoningChain", [])
    if not isinstance(chain, list) or len(chain) < 2:
        findings.append({"field": "reasoningChain", "kind": "missing", "text": "Faltan pasos fuente"})
    else:
        for index, item in enumerate(chain):
            if not isinstance(item, str) or not item.strip():
                findings.append({"field": f"reasoningChain[{index}]", "kind": "missing", "text": "Paso vacío"})
                continue
            examined.append((f"reasoningChain[{index}]", item))
    for field, text in examined:
        # Repetición dentro de UN campo fuente: no se resuelve rotando el modo.
        # Usar el detector ya existente para mantener un único criterio.
        for hit in repeated_spans(text, min_words=8):
            findings.append({"field": field, "kind": "partial-source", "text": hit["text"],
                             "wordCount": hit["wordCount"]})
        for hit in formulaic_phrases(text):
            findings.append({"field": field, "kind": "formulaic-source", "text": hit["text"]})
    return {
        "version": VERSION, "productionCode": source.get("productionCode"),
        "approvedForNarration": len(findings) == 0,
        "issues": findings,
        "legalAccuracyCertified": False,
        "note": "La aprobación editorial NO equivale a revisión jurídica. No se modifica sourceHash ni legalReview.",
    }


def run(code: str, root: Path) -> int:
    source_path = root / "content" / f"{code}.silec.json"
    raw = source_path.read_bytes()
    obj = json.loads(raw)
    if not isinstance(obj, dict) or obj.get("productionCode") != code:
        raise ValueError("Ficha SILEC no corresponde al productionCode solicitado")
    report = inspect(obj)
    report["sourceSha256"] = hashlib.sha256(raw).hexdigest()
    report_path = root / "public" / "generated" / f"{code}-source-editorial-preflight.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    if report["approvedForNarration"]:
        print(f"{VERSION}: PASS — sin repeticiones intrínsecas detectadas")
        return 0
    print(f"{VERSION}: SOURCE_CONTENT_REQUIRES_REVIEW — {len(report['issues'])} hallazgos")
    for issue in report["issues"]:
        print(f"CAMPO={issue['field']} | {issue['kind'].upper()} | {issue['text'][:145]}")
    print("ACCIÓN: revisar esos campos en PhD 12, conservar trazabilidad y repetir la revisión jurídica aplicable.")
    print("No se intentarán seis modalidades sobre una fuente defectuosa. No se alteró la ficha.")
    return 42


if __name__ == "__main__":
    if len(sys.argv) != 2 or not re.fullmatch(r"[A-Za-z0-9_-]+", sys.argv[1]):
        raise SystemExit("Uso: python3 scripts/source_editorial_preflight.py video-015")
    try:
        raise SystemExit(run(sys.argv[1], Path.cwd()))
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"ERROR_PREAUDITORIA_FUENTE: {exc}", file=sys.stderr)
        raise SystemExit(2)
