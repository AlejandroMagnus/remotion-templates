"""Offline contract tests; synthetic audio is never a listening approval."""
import asyncio
import importlib.util
import json
import os
import re
import shutil
import sys
import tempfile
import types
import unittest
import wave
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from spanish_vocal_delivery import (VERSION, additional_gap_ms, assert_same_text,
                                    question_direction, read_overrides, split_thoughts, text_hash)

try:
    import edge_tts
except ImportError:
    sys.modules["edge_tts"] = types.SimpleNamespace(__version__="offline-test-double", Communicate=None)


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / file)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    with patch.dict(os.environ, {"PRODUCTION_CODE": "vocal-fixture"}):
        spec.loader.exec_module(module)
    return module


tts = load("vocal_generator_test", "generate-prosodic-narration.py")
director = load("vocal_director_test", "human_voice_performance_director.py")


class SpanishQuestions(unittest.TestCase):
    def plan(self, text, overrides=None):
        with patch.object(tts, "CREATIVE_DECISION", Path("/no-fixture-decision.json")):
            return tts.build_segment_plan(text, [], tts.load_creative_direction(), overrides)

    def test_tildes_signs_case_and_complete_questions_survive(self):
        text = "¿Qué cambió?¿Cómo decidir, si falta un dato: el del Dr. Pérez? ¿Cuándo? ¿Dónde? ¿Cuál? ¿Quién? ¿Por qué?"
        plan = self.plan(text)
        self.assertEqual(len(plan), 7)
        assert_same_text(text, " ".join(p.spoken_text for p in plan))
        self.assertIn("Dr. Pérez", plan[1].spoken_text)
        self.assertEqual([p.question["interrogatives"][0]["text"] for p in plan],
                         ["Qué", "Cómo", "Cuándo", "Dónde", "Cuál", "Quién", "Por qué"])
        self.assertEqual(director.build_units(text), [p.spoken_text for p in plan])

    def test_approved_statement_is_never_rewritten_as_a_question(self):
        text = "Puede haber un riesgo costoso y, sin embargo, continuar la explicación."
        with patch.object(tts, "CREATIVE_DECISION", Path("/no-fixture-decision.json")):
            plan = tts.build_segment_plan(text, ["high-ticket", "estrategia"], tts.load_creative_direction())
        self.assertEqual(" ".join(p.spoken_text for p in plan), text)
        self.assertNotIn("¿", plan[0].spoken_text)
        for declaration in ("Como se explicó, hay una diferencia.", "Por qué ocurre es el tema del análisis."):
            self.assertNotIn(self.plan(declaration)[0].role, ("question", "opening_question"))

    def test_abbreviations_decimal_and_lowercase_followup(self):
        text = "El Dr. Pérez lee el art. 3. El valor es 1.5. ¿Qué ocurre? después lo explicamos."
        self.assertEqual(split_thoughts(text), ["El Dr. Pérez lee el art. 3.", "El valor es 1.5.", "¿Qué ocurre?", "después lo explicamos."])

    def test_bad_interrogation_is_not_silently_repaired(self):
        for text in ("Qué ocurrió?", "¿Qué ocurrió."):
            with self.assertRaises(ValueError):
                self.plan(text)
        with self.assertRaises(ValueError):
            assert_same_text("¿Cómo?", "¿Como?")

    def test_intents_vary_moderately_without_a_uniform_pitch_rise(self):
        cases = {"¿Qué cambió?": "curiosidad", "¿Podría ser diferente?": "duda",
                 "¿Qué pasaría si esperamos?": "reflexión", "¿De verdad ocurrió?": "sorpresa",
                 "¿Basta con afirmarlo?": "cuestionamiento"}
        plan = self.plan(" ".join(cases))
        self.assertEqual([p.question["intent"] for p in plan], list(cases.values()))
        self.assertGreater(len({p.pitch for p in plan}), 2)
        for p in plan:
            self.assertLessEqual(abs(int(p.pitch[:-2])), 3)
            self.assertLessEqual(abs(int(p.volume[:-1])), 3)
            self.assertEqual(p.question["listeningStatus"], "pending")

    def test_direction_is_bound_to_the_exact_script_and_bounded(self):
        text = "¿Cómo lo explicamos?"
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp) / "direction.json"
            data = {"version": VERSION, "narrationHash": text_hash(text), "thoughts": {"1": {"intent": "reflexión", "rate": -4, "pitch": -1, "volume": 2, "pauseAfterMs": 320}}}
            file.write_text(json.dumps(data))
            override = read_overrides(file, text)
            p = self.plan(text, override)[0]
            self.assertEqual((p.rate, p.pitch, p.volume), ("-4%", "-1Hz", "+2%"))
            self.assertEqual(p.question["intentBasis"], "explicit-direction")
            with self.assertRaises(ValueError):
                read_overrides(file, text + " Otra frase.")
            data["thoughts"]["1"]["pitch"] = 70
            file.write_text(json.dumps(data))
            with self.assertRaises(ValueError):
                read_overrides(file, text)

    def test_natural_pause_is_counted_once(self):
        self.assertEqual(additional_gap_ms(300, 180, 140), 0)
        self.assertEqual(additional_gap_ms(300, 100, 80), 120)
        self.assertEqual(additional_gap_ms(2000, 0, 0), 500)

    def test_tts_receives_unicode_and_supported_controls(self):
        captured = {}
        class FakeCommunicate:
            def __init__(self, **kwargs): captured.update(kwargs)
            async def stream(self):
                yield {"type": "audio", "data": b"TEST AUDIO"}
                yield {"type": "WordBoundary", "text": "Qué", "offset": 1000000, "duration": 1200000}
        with tempfile.TemporaryDirectory() as temp, patch.object(tts.edge_tts, "Communicate", FakeCommunicate):
            words = asyncio.run(tts.synthesize_segment_once("¿Qué ocurrió?", "-3%", "+0Hz", Path(temp)/"test.mp3", volume="+1%"))
        self.assertEqual(captured["text"], "¿Qué ocurrió?")
        self.assertEqual(captured["volume"], "+1%")
        self.assertEqual(captured["boundary"], "WordBoundary")
        self.assertEqual(words, [{"text": "Qué", "startMs": 100, "endMs": 220}])

    @unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg required")
    def test_selective_regeneration_reuses_other_thoughts_and_rebuilds_offsets(self):
        text = "¿Qué cambió en esta ocasión? ¿Cómo podemos comprenderlo con claridad?"
        plan = self.plan(text)
        calls = []
        async def fake_speech(text, rate, pitch, output, group_number, volume="+0%"):
            calls.append(group_number)
            words = re.findall(r"\b\w+\b", text)
            increment = 40 if calls.count(group_number) > 1 else 0
            boundaries = [{"text": word, "startMs": 60+i*(180+increment), "endMs": 180+i*(180+increment)} for i, word in enumerate(words)]
            # Synthetic PCM fixture exercises the real concat/duration code, not pronunciation.
            duration = boundaries[-1]["endMs"] + 180
            with wave.open(str(output), "wb") as wav:
                wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(24000)
                wav.writeframes(b"\0\0" * (duration*24))
            return boundaries
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            audio = root / "vocal-fixture-narration.mp3"
            with patch.object(tts, "AUDIO", audio), patch.object(tts, "SRT", root/"test.srt"), patch.object(tts, "TIMELINE", root/"timeline.json"), patch.object(tts, "synthesize_segment_once_with_retries", fake_speech), patch.dict(os.environ, {"VOICE_REGENERATE_THOUGHTS": ""}):
                first_words, segments, duration = asyncio.run(tts.build_prosodic_audio(plan))
                self.assertEqual(calls, [1, 2])
                asyncio.run(tts.build_prosodic_audio(plan))
                self.assertEqual(calls, [1, 2])
                tts.write_listening_review(text, segments, duration)
                report_path = root / "vocal-fixture-vocal-listening-review.json"
                report = json.loads(report_path.read_text())
                self.assertEqual(report["status"], "pending-listening")
                report.update(status="approved-after-listening", reviewer="TEST ONLY")
                report_path.write_text(json.dumps(report))
                with patch.dict(os.environ, {"VOICE_REGENERATE_THOUGHTS": "1"}):
                    words, updated, new_duration = asyncio.run(tts.build_prosodic_audio(plan))
                self.assertEqual(calls, [1, 2, 1])
                second = len(re.findall(r"\b\w+\b", plan[0].spoken_text))
                self.assertGreater(words[second]["startMs"], first_words[second]["startMs"])
                self.assertEqual([w["text"] for w in words], [w["text"] for w in first_words])
                self.assertTrue(updated[1]["cacheHit"])
                tts.write_srt(updated)
                self.assertIn(tts.srt_time(words[second]["startMs"]), (root/"test.srt").read_text())
                tts.write_listening_review(text, updated, new_duration)
                self.assertEqual(json.loads(report_path.read_text())["status"], "pending-listening")
                # Local WordBoundary durations survive concatenation unchanged.
                self.assertTrue(all(w["endMs"]-w["startMs"] == 120 for w in words))

    def test_ci_keeps_audio_before_adaptive_duration_and_review_artifacts(self):
        workflow = (ROOT/".github/workflows/main.yml").read_text()
        self.assertLess(workflow.index("scripts/generate-prosodic-narration.py"), workflow.index("scripts/apply-adaptive-duration.ts"))
        self.assertIn("vocal-listening-review.json", workflow)
        self.assertIn("voice-segments", workflow)


if __name__ == "__main__":
    unittest.main()
