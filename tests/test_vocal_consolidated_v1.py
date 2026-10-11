#!/usr/bin/env python3
"""Pure-function regressions. No TTS network or video render required."""
import json
import os
import subprocess
import sys
import tempfile
import unittest
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from vocal_quality_contract import apply_vocal_score, group_score_units, measure_audio_silence_ms, MEASUREMENT, SCORE_VERSION
from vocal_intrascript_gate import find_repetitions, audit

@dataclass(frozen=True)
class Segment:
    sentence_index: int
    spoken_text: str
    rate: str = "+0%"
    pitch: str = "+0Hz"
    pre_pause_ms: int = 0
    post_pause_ms: int = 250


def unit(text, rate, pitch=0, pause=220):
    return {"text": text, "gesture": {
        "rate_delta_percent": rate, "pitch_delta_hz": pitch,
        "pause_before_ms": 130, "pause_after_ms": pause,
    }}


class TestVocalContract(unittest.TestCase):
    def score(self, units):
        return {"version": SCORE_VERSION, "production_code": "video-016", "units": units}

    def test_prosody_envelope_uses_all_units_not_only_first(self):
        plan = [Segment(0, "Primero, pero"), Segment(0, "después."), Segment(1, "¿Qué ocurre?")]
        score = self.score([unit("Primero,", -6), unit("pero después.", 6, pause=380), unit("¿Qué ocurre?", -3, pitch=2)])
        result = apply_vocal_score(plan, score, "video-016")
        self.assertEqual(len(result), 3)
        self.assertEqual(result[0].rate, "+2%")  # cada unidad se pondera por su longitud
        self.assertEqual(result[0].pitch, "+0Hz")
        self.assertEqual(result[1].post_pause_ms, 380)
        self.assertEqual(result[2].rate, "-3%")
        self.assertEqual(result[2].pitch, "+2Hz")
        self.assertEqual(" ".join(x.spoken_text for x in result), "Primero, pero después. ¿Qué ocurre?")

    def test_manual_override_wins(self):
        result = apply_vocal_score([Segment(0, "¿Cómo actuar?")], self.score([unit("¿Cómo actuar?", -3)]),
                                   "video-016", {1: {"rate": -5, "pitch": 1, "pauseAfterMs": 340}})
        self.assertEqual((result[0].rate, result[0].pitch, result[0].post_pause_ms), ("-5%", "+1Hz", 340))

    def test_stale_score_fails(self):
        score = self.score([unit("Otra frase.", 0)])
        with self.assertRaises(ValueError):
            apply_vocal_score([Segment(0, "Esta frase.")], score, "video-016")
        with self.assertRaises(ValueError):
            apply_vocal_score([Segment(0, "Otra frase.")], score, "video-999")

    def test_no_invented_text_from_missing_units(self):
        with self.assertRaises(ValueError):
            group_score_units(self.score([unit("Primero.", 0)]), ["Primero.", "Segundo."], "video-016")

    def test_duplicate_gate_long_only(self):
        repeated = "La regla de prueba exige identificar el documento, su autenticidad y la finalidad concreta de su incorporación."
        self.assertEqual(len(find_repetitions(f"{repeated} Ahora procede verificar el origen. {repeated}")), 1)
        self.assertEqual(find_repetitions("La prueba existe. Otra actuación distinta. La prueba existe."), [])

    def test_duplicate_gate_fails_without_editing(self):
        repeated = "La regla de prueba exige identificar el documento, su autenticidad y la finalidad concreta de su incorporación."
        with tempfile.TemporaryDirectory() as directory:
            spec = Path(directory) / "video.json"
            report = Path(directory) / "audit.json"
            spec.write_text(json.dumps({"audio": {"narrationText": repeated + " " + repeated}}), encoding="utf-8")
            before = spec.read_bytes()
            self.assertFalse(audit(spec, report))
            self.assertEqual(before, spec.read_bytes())
            self.assertEqual(json.loads(report.read_text())["passed"], False)

    def test_audio_silence_is_measured_not_inferred(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "sound.wav"
            # 0.5s silence / 0.5s 440Hz / 0.5s silence = 1 second of silence.
            subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi",
                            "-i", r"aevalsrc=if(between(t\,0.5\,1)\,0.25*sin(2*PI*440*t)\,0):s=24000:d=1.5",
                            "-c:a", "pcm_s16le", str(output)], check=True)
            result = measure_audio_silence_ms(output, 1500)
            self.assertGreater(result, 900)
            self.assertLess(result, 1100)


if __name__ == "__main__":
    unittest.main()
