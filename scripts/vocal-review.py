#!/usr/bin/env python3
"""Preview, correct a thought, or record a human listening decision."""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from spanish_vocal_delivery import VERSION, INTENTS, read_overrides, text_hash
from vocal_segment_cache import file_hash

ROOT = Path.cwd()


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def run_audio(code, thought=None):
    env = {**os.environ, "PRODUCTION_CODE": code, "PYTHONDONTWRITEBYTECODE": "1"}
    env["VOICE_REGENERATE_THOUGHTS"] = str(thought) if thought else ""
    subprocess.run([sys.executable, "-B", "scripts/human_voice_performance_director.py"], env=env, check=True)
    subprocess.run([sys.executable, "-B", "scripts/generate-prosodic-narration.py"], env=env, check=True)
    if code != "vocal-question-preview":
        # The existing timing/semantic/3D pipeline stays authoritative after new audio.
        for script in ("apply-adaptive-duration", "build-semantic-decisions", "build-asset-scene-plan", "build-three-d-plan", "build-resolved-assets"):
            subprocess.run(["node", "--import", "tsx", f"scripts/{script}.ts"], env=env, check=True)
        subprocess.run(["npm", "run", "video:validate", "--", f"examples/{code}.video.json"], env=env, check=True)
        print("Audio y planes actualizados. El MP4 anterior no contiene la corrección; requiere un nuevo render.")
    print(f"Escuchar: public/generated/{code}-narration.mp3")
    print(f"Revisar: public/generated/{code}-vocal-listening-review.json")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("preview", help="Generar una muestra breve para escuchar las interrogaciones.")
    approve = sub.add_parser("approve", help="Registrar aprobación solo después de escuchar este audio.")
    approve.add_argument("code")
    approve.add_argument("--reviewer", required=True)
    revise = sub.add_parser("revise", help="Regenerar un pensamiento y actualizar los planes existentes.")
    revise.add_argument("code")
    revise.add_argument("--thought", type=int, required=True)
    revise.add_argument("--intent", choices=INTENTS)
    for name, limits in {"rate": range(-7, 7), "pitch": range(-3, 4), "volume": range(-3, 4), "pause-after-ms": range(120, 501)}.items():
        revise.add_argument(f"--{name}", type=int, choices=limits)
    args = parser.parse_args()
    if args.command == "preview":
        code = "vocal-question-preview"
        text = (
            "Escuchemos cada pregunta como una idea completa. "
            "¿Qué cambió? ¿Cómo podemos comprenderlo, si todavía falta información? "
            "¿Cuándo conviene detenerse y revisar? ¿Dónde está el dato que nos falta? "
            "¿Cuál de estas opciones sería más clara? ¿Quién puede explicar lo ocurrido? "
            "¿Por qué merece nuestra atención? ¿De verdad nadie lo había notado? "
            "¿Basta con una primera impresión? ¿Qué pasaría si cambiáramos el punto de vista?"
        )
        write(ROOT / f"examples/{code}.video.json", {"id": code, "audio": {"narrationText": text}, "meta": {"tags": ["vocal-preview"]}})
        run_audio(code)
        return
    code = args.code
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,80}", code):
        raise ValueError("Código de producción inválido.")
    generated = ROOT / "public/generated"
    report_path = generated / f"{code}-vocal-listening-review.json"
    report = read(report_path)
    narration = read(ROOT / f"examples/{code}.video.json")["audio"]["narrationText"].strip()
    if report["narrationHash"] != text_hash(narration) or report["audioHash"] != file_hash(generated / f"{code}-narration.mp3"):
        raise ValueError("El guion o audio cambió: regenere su informe antes de revisar.")
    if args.command == "approve":
        if not args.reviewer.strip():
            raise ValueError("Indique quién escuchó y aprobó el audio.")
        report.update(status="approved-after-listening", reviewer=args.reviewer.strip(), reviewedAt=datetime.now(timezone.utc).isoformat())
        write(report_path, report)
        print("Aprobación auditiva registrada para el hash de este audio; no constituye revisión jurídica ni autorización de publicación.")
        return
    if args.thought not in {item["number"] for item in report["thoughts"]}:
        raise ValueError("Pensamiento no encontrado en el informe.")
    direction_path = ROOT / f"content/{code}.vocal-direction.json"
    read_overrides(direction_path, narration)
    direction = read(direction_path) if direction_path.exists() else {"version": VERSION, "narrationHash": text_hash(narration), "thoughts": {}}
    edits = direction["thoughts"].setdefault(str(args.thought), {})
    for field in ("intent", "rate", "pitch", "volume", "pause_after_ms"):
        value = getattr(args, field)
        if value is not None:
            edits["pauseAfterMs" if field == "pause_after_ms" else field] = value
    with tempfile.TemporaryDirectory(prefix="vocal-direction-") as temp:
        candidate = Path(temp) / "direction.json"
        write(candidate, direction)
        read_overrides(candidate, narration)
    write(direction_path, direction)
    run_audio(code, args.thought)


if __name__ == "__main__":
    main()
