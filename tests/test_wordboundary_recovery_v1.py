#!/usr/bin/env python3
"""Regression for selective WordBoundary recovery (no TTS calls required)."""
import asyncio
import importlib.util
import os
import sys
import tempfile
import types
import unittest
import wave
from dataclasses import dataclass
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"

# The real repository normally installs Edge TTS; these tests don't need its network.
try:
    import edge_tts  # noqa
except ImportError:
    sys.modules["edge_tts"] = types.SimpleNamespace(__version__="offline-test")
sys.path.insert(0, str(SCRIPTS))
os.environ.setdefault("PRODUCTION_CODE", "video-test")
spec = importlib.util.spec_from_file_location("prosody_boundary_test", SCRIPTS / "generate-prosodic-narration.py")
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


def make_wave(path: Path, duration_ms: int):
    n = round(module.SAMPLE_RATE * duration_ms / 1000)
    with wave.open(str(path), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(module.SAMPLE_RATE)
        audio.writeframes(b"\x00\x00" * n)


@dataclass
class Segment:
    spoken_text: str
    word_count: int
    rate: str = "+0%"
    pitch: str = "+0Hz"
    volume: str = "+0%"


class BoundaryRecoveryTests(unittest.TestCase):
    def test_splits_only_at_original_word_boundaries(self):
        text = "La prueba documental exige verificar autenticidad, pertinencia, oportunidad y utilidad procesal."
        before, after = module.split_text_at_natural_boundary(text)
        self.assertEqual(before + " " + after, text)
        self.assertEqual(module.count_spoken_words(before) + module.count_spoken_words(after),
                         module.count_spoken_words(text))

    def test_fails_on_invalid_times_or_missing_words(self):
        with self.assertRaises(ValueError):
            module.validate_real_wordboundaries([{"text": "primero", "startMs": 0, "endMs": 50}], 2, "primero segundo")
        with self.assertRaises(ValueError):
            module.validate_real_wordboundaries([{"text": "primero", "startMs": 100, "endMs": 50}], 1, "primero")

    def test_recover_selected_thought_from_real_boundaries(self):
        parts = [
            "La prueba documental exige verificar autenticidad y pertinencia antes de incorporarla al proceso",
            "La consecuencia depende de los hechos acreditados y de la oportunidad procesal",
        ]
        segments = [Segment(text, module.count_spoken_words(text)) for text in parts]
        attempts = []

        async def mocked_cached_speech(cache, request, output, synthesize, validate, force=False):
            text = request["text"]
            n = module.count_spoken_words(text)
            attempts.append(n)
            # Edge TTS occasionally fails boundaries on long spans.
            if n > 6:
                validate([{"text": "incompleto", "startMs": 0, "endMs": 50}])
            words = []
            for idx, token in enumerate(text.split()):
                words.append({"text": token, "startMs": 100 * idx,
                              "endMs": 100 * idx + 80})
            validate(words)
            output.write_bytes(b"simulated-audio-data")
            return words, "testkey", False

        def wav_converter(dummy_mp3, outwav):
            # The mocked event sequence spans <1 s in each short chunk.
            make_wave(outwav, 900)

        with tempfile.TemporaryDirectory() as temp:
            with patch.object(module, "cached_speech", mocked_cached_speech), \
                 patch.object(module, "convert_mp3_to_wav", wav_converter), \
                 patch.object(module, "probe_duration_ms", lambda wav: 900):
                words, key, hit = asyncio.run(module.recover_wordboundaries_from_smaller_units(
                    segments, 13, Path(temp), Path(temp) / "joined.wav", False))
            self.assertTrue(max(attempts) > 6)
            self.assertEqual(sum(module.boundary_token_count(w["text"]) for w in words),
                             sum(s.word_count for s in segments))
            self.assertTrue(all(a["startMs"] <= b["startMs"] for a,b in zip(words,words[1:])))
            self.assertTrue(key.startswith("recovered:"))
            self.assertFalse(hit)

    def test_main_builder_recovers_and_keeps_real_timeline(self):
        text = "La prueba documental exige verificar autenticidad, pertinencia y oportunidad antes de incorporarla al proceso"
        segment = module.SegmentPlan(
            index=0, original_text=text, spoken_text=text, role="explanation",
            vocal_moment="development", rate="+0%", pitch="+0Hz",
            pre_pause_ms=0, post_pause_ms=250, terminal_mark=".", semantic_break=False,
            word_count=module.count_spoken_words(text), sentence_index=0
        )

        async def mocked_cached(cache, request, output, synthesize, validate, force=False):
            n = module.count_spoken_words(request["text"])
            if n > 6:
                validate([{"text": "menos", "startMs": 0, "endMs": 80}])
            words = [{"text": tok, "startMs": 100 * i, "endMs": 100 * i + 80}
                     for i, tok in enumerate(request["text"].split())]
            validate(words)
            output.write_bytes(b"mock")
            return words, "mock-key", False

        def duration(path):
            try:
                with wave.open(str(path), "rb") as audio:
                    return round(audio.getnframes() * 1000 / audio.getframerate())
            except (wave.Error, EOFError):
                return 10_000

        with tempfile.TemporaryDirectory() as temp:
            dest = Path(temp) / "narration.mp3"
            def fake_concat(inputs, output):
                output.write_bytes(b"audio-generated")

            with patch.object(module, "cached_speech", mocked_cached), \
                 patch.object(module, "convert_mp3_to_wav", lambda a, b: make_wave(b, 900)), \
                 patch.object(module, "probe_duration_ms", duration), \
                 patch.object(module, "concat_wav_files", fake_concat), \
                 patch.object(module, "AUDIO", dest):
                words, effective, duration_ms = asyncio.run(module.build_prosodic_audio([segment]))

            self.assertTrue(dest.is_file())
            self.assertTrue(effective[0]["boundaryRecovery"])
            self.assertEqual(len(words), segment.word_count)
            self.assertGreater(duration_ms, words[-1]["endMs"])
            self.assertTrue(all(a["startMs"] <= b["startMs"] for a, b in zip(words, words[1:])))

    def test_unrecoverable_does_not_create_fake_boundaries(self):
        seg = Segment("prueba", 1)
        async def broken(*args, **kwargs):
            raise ValueError("WordBoundary ausente")
        with tempfile.TemporaryDirectory() as temp:
            with patch.object(module, "cached_speech", broken):
                with self.assertRaisesRegex(RuntimeError, "WORDBOUNDARY_UNRECOVERABLE"):
                    asyncio.run(module.recover_wordboundaries_from_smaller_units(
                        [seg], 13, Path(temp), Path(temp) / "joined.wav", False))


if __name__ == "__main__":
    unittest.main()
