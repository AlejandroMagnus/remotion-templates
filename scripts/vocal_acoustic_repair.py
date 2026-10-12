"""Corrección vocal conservadora: sólo cola silenciosa, velocidad mediante nuevo TTS.

WordBoundary sigue siendo la única fuente de tiempos para subtítulos.
"""
from __future__ import annotations

import os
import re
import wave
from array import array
from dataclasses import replace
from pathlib import Path
from typing import Any


def trim_verified_silent_tail(
    wav_file: Path, last_word_end_ms: int, requested_post_pause_ms: int
) -> int:
    """Retira únicamente una cola de silencio verificada a partir de WordBoundary.

    - Preserva todas las muestras previas a la última palabra y 320-480 ms posteriores.
    - Si la región que habría que retirar contiene señal > ~-46 dBFS, no modifica nada.
    - Sólo WAV PCM mono, 16 bits, para impedir cortes/sincronización aproximados.
    """
    if last_word_end_ms < 0:
        raise ValueError("WordBoundary final negativo")
    keep_ms = max(320, min(480, int(requested_post_pause_ms)))
    with wave.open(str(wav_file), "rb") as src:
        nch, width, sample_rate = src.getnchannels(), src.getsampwidth(), src.getframerate()
        params = src.getparams()
        if nch != 1 or width != 2 or sample_rate <= 0:
            raise ValueError("La corrección vocal requiere WAV PCM mono de 16 bits")
        frames = src.readframes(src.getnframes())
    total_frames = len(frames) // 2
    safe_last_frame = round((last_word_end_ms + keep_ms) * sample_rate / 1000)
    if safe_last_frame >= total_frames:
        return 0
    # No interesa retirar menos de 100ms (evita cambios cosméticos).
    if total_frames - safe_last_frame < sample_rate // 10:
        return 0
    discard = array("h")
    discard.frombytes(frames[safe_last_frame * 2 :])
    if os.sys.byteorder != "little":
        discard.byteswap()
    # 160 / 32768 = -46.2 dBFS; si hay voz/cualquier señal audible no se recorta.
    if any(abs(v) > 160 for v in discard):
        return 0
    temp = wav_file.with_suffix(".trim.tmp.wav")
    try:
        with wave.open(str(temp), "wb") as out:
            out.setparams(params)
            out.writeframes(frames[: safe_last_frame * 2])
        os.replace(temp, wav_file)
    finally:
        if temp.exists():
            temp.unlink()
    return round(1000 * (total_frames - safe_last_frame) / sample_rate)


def slower_prosody_plan(plan: list[Any], extra_slowness_pct: int) -> list[Any]:
    """Cambia el rate, no el texto; exige regeneración TTS con WordBoundary nuevo."""
    if not 1 <= extra_slowness_pct <= 15:
        raise ValueError("Corrección de velocidad fuera de límite seguro")
    result = []
    for part in plan:
        raw_rate = getattr(part, "rate")
        if not isinstance(raw_rate, str) or re.fullmatch(r"[+-]\d+%", raw_rate) is None:
            raise ValueError(f"Formato de rate inesperado: {raw_rate!r}")
        original = int(raw_rate[:-1])
        proposed = original - extra_slowness_pct
        if not -50 <= proposed <= 50:
            raise ValueError("Rate fuera de límites del motor")
        result.append(replace(part, rate=f"{proposed:+d}%"))
    return result
