import sys
import tempfile
import unittest
import wave
from dataclasses import dataclass
from pathlib import Path

candidate = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(candidate if candidate.is_dir() else Path(__file__).resolve().parent))
from vocal_acoustic_repair import trim_verified_silent_tail, slower_prosody_plan


@dataclass(frozen=True)
class Segment:
    spoken_text: str
    rate: str


def create_wav(p: Path, last_word_ms=1100, tail_ms=900, make_loud_tail=False):
    sr = 24000
    from array import array
    total = last_word_ms + tail_ms
    s = array('h', [0] * (sr * total // 1000))
    # Modelo acústico: voz (oscilación de amplitud), después cola silenciosa.
    for i in range(sr * (last_word_ms - 300) // 1000, sr * last_word_ms // 1000):
        s[i] = 5000 if i % 2 else -5000
    if make_loud_tail:
        for i in range(sr * (last_word_ms + 510) // 1000, sr * (last_word_ms + 560) // 1000):
            s[i] = 1400
    with wave.open(str(p), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(s.tobytes())


class TestVocalAcousticRepair(unittest.TestCase):
    def test_trim_only_silent_tail(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / 't.wav'
            create_wav(p)
            delta = trim_verified_silent_tail(p, 1100, 340)
            self.assertAlmostEqual(delta, 560, delta=2)
            with wave.open(str(p), 'rb') as f:
                self.assertEqual(f.getnframes(), 24000*1440//1000)

    def test_never_trim_audible_tail(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / 't.wav'
            create_wav(p, make_loud_tail=True)
            self.assertEqual(trim_verified_silent_tail(p, 1100, 350), 0)

    def test_does_not_trim_inside_last_word(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / 't.wav'
            create_wav(p)
            self.assertEqual(trim_verified_silent_tail(p, 2100, 350), 0)

    def test_slower_rate_preserves_narration(self):
        p=[Segment('Texto jurídicamente revisado', '-5%'),Segment('Otra proposición', '+1%')]
        q=slower_prosody_plan(p,6)
        self.assertEqual([i.rate for i in q],['-11%','-5%'])
        self.assertEqual([i.spoken_text for i in q],[i.spoken_text for i in p])
        self.assertEqual(p[0].rate,'-5%')

    def test_unsafe_rate_and_percent_rejected(self):
        with self.assertRaises(ValueError):slower_prosody_plan([Segment('x', 'fast')],6)
        with self.assertRaises(ValueError):slower_prosody_plan([Segment('x','+0%')],30)

if __name__ == '__main__':
    unittest.main()
