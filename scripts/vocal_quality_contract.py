#!/usr/bin/env python3
"""Vocal quality contract: E.3 -> E.5, acoustic pauses, no WordBoundary edits.

Only one voice envelope can be applied per complete TTS thought. Aggregate the
semantic score by lexical weight, never split a voiced thought or rewrite text.
"""
from __future__ import annotations
import json
import re
import subprocess
from dataclasses import replace
from pathlib import Path

SCORE_VERSION = "V3.19-E.3-HUMAN-VOICE-PERFORMANCE-DIRECTOR"
MEASUREMENT = "ffmpeg-silencedetect-35db-180ms-v1"


def _compact(value: str) -> str:
    return re.sub(r"\s+", "", value)


def _clamp(value: float, lower: int, upper: int) -> int:
    return max(lower, min(upper, round(value)))


def group_score_units(score: dict, thoughts: list[str], production_code: str) -> list[list[dict]]:
    if score.get("version") != SCORE_VERSION or score.get("production_code") != production_code:
        raise ValueError("Partitura E.3 ausente, desactualizada o de otro video")
    units = score.get("units")
    if not isinstance(units, list) or not units:
        raise ValueError("Partitura E.3 sin unidades")
    grouped: list[list[dict]] = []
    cursor = 0
    for thought in thoughts:
        target = _compact(thought)
        combined = ""
        current: list[dict] = []
        while len(combined) < len(target):
            if cursor >= len(units):
                raise ValueError("Partitura E.3 incompleta respecto al guion final")
            unit = units[cursor]
            if not isinstance(unit, dict) or not isinstance(unit.get("gesture"), dict):
                raise ValueError("Unidad E.3 inválida")
            combined += _compact(str(unit.get("text", "")))
            if not target.startswith(combined):
                raise ValueError("Partitura E.3 no coincide con el texto jurídico vigente")
            current.append(unit)
            cursor += 1
        if combined != target:
            raise ValueError("Partitura E.3 alteraría el texto del pensamiento")
        grouped.append(current)
    if cursor != len(units):
        raise ValueError("Partitura E.3 contiene unidades sobrantes")
    return grouped


def apply_vocal_score(plan: list, score: dict, production_code: str, overrides: dict | None = None) -> list:
    if not plan:
        raise ValueError("Plan prosódico vacío")
    groups = []
    for seg in plan:
        if not groups or groups[-1][-1].sentence_index != seg.sentence_index:
            groups.append([seg])
        else:
            groups[-1].append(seg)
    thoughts = [" ".join(s.spoken_text for s in group).strip() for group in groups]
    mapped = group_score_units(score, thoughts, production_code)
    explicit = overrides or {}
    updated = []
    for number, (group, units) in enumerate(zip(groups, mapped), 1):
        weights = [max(1, len(re.findall(r"\b\w+\b", str(u["text"])))) for u in units]
        total = sum(weights)
        gesture = lambda name: sum(int(u["gesture"][name]) * w for u, w in zip(units, weights)) / total
        rate = _clamp(gesture("rate_delta_percent"), -7, 6)
        pitch = _clamp(gesture("pitch_delta_hz"), -3, 3)
        pre_pause = _clamp(units[0]["gesture"]["pause_before_ms"], 0, 500)
        post_pause = _clamp(units[-1]["gesture"]["pause_after_ms"], 0, 500)
        override = explicit.get(number, {})
        if "rate" in override:
            rate = int(override["rate"])
        if "pitch" in override:
            pitch = int(override["pitch"])
        if "pauseAfterMs" in override:
            post_pause = int(override["pauseAfterMs"])
        # Retain question controls / named intent if no E.3 explicit override;
        # E.3 itself already understands question_direction().
        for i, seg in enumerate(group):
            updated.append(replace(
                seg,
                rate=f"{rate:+d}%",
                pitch=f"{pitch:+d}Hz",
                pre_pause_ms=pre_pause if i == 0 else seg.pre_pause_ms,
                post_pause_ms=post_pause if i == len(group) - 1 else seg.post_pause_ms,
            ))
    return updated


def measure_audio_silence_ms(path: Path, duration_ms: int, threshold_db: int = -35, min_seconds: float = 0.18) -> int:
    """Detect actual acoustic silence; distinguish it from segment duration.

    The threshold is a proxy for quiet intervals, not a medical breathing
    detector. Does not edit audio, timestamps, captions or WordBoundary.
    """
    if duration_ms <= 0:
        raise ValueError("Audio vacío")
    command = ["ffmpeg", "-nostdin", "-hide_banner", "-i", str(path),
               "-af", f"silencedetect=noise={threshold_db}dB:d={min_seconds}",
               "-f", "null", "-"]
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode:
        raise RuntimeError("No se pudo medir el silencio del audio con FFmpeg: " + completed.stderr[-400:])
    intervals = []
    # Lines are parsed in order, pairing each start with its following end.
    start = None
    for line in completed.stderr.splitlines():
        begin = re.search(r"silence_start:\s*([0-9.]+)", line)
        end = re.search(r"silence_end:\s*([0-9.]+)", line)
        if begin:
            start = float(begin.group(1))
        if end and start is not None:
            intervals.append((start, float(end.group(1))))
            start = None
    if start is not None:
        intervals.append((start, duration_ms / 1000))
    total = sum(max(0, min(end, duration_ms / 1000) - max(0, begin)) for begin, end in intervals)
    return max(0, min(duration_ms, round(total * 1000)))
