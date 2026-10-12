import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from source_editorial_preflight import inspect


class EditorialSourceTests(unittest.TestCase):
    def setUp(self):
        self.valid = {
            "productionCode": "video-123",
            "hook": "¿Por qué el contenido de este documento cambia la discusión?",
            "centralThesis": "La eficacia del documento depende del hecho que permita acreditar.",
            "problem": "Un expediente puede incluir documentos cuya relación con el hecho controvertido no está explicada.",
            "reasoningChain": [
                "Identifique el hecho que intenta demostrar con el documento concreto.",
                "Exponga cuál es la objeción que puede plantear la contraparte y qué respuesta exige.",
            ],
            "conclusion": "La utilidad de cada documento debe exponerse en relación con el hecho discutido.",
            "closingIdea": "Una buena estrategia de prueba es específica, no una colección de papeles.",
            "cta": "Consulte a un profesional para valorar los documentos de su caso.",
        }

    def test_good_source_passes(self):
        self.assertTrue(inspect(self.valid)["approvedForNarration"])

    def test_intrinsic_repetition_blocks(self):
        src = dict(self.valid)
        src["centralThesis"] = (
            "Qué documentos sirven, cómo se presentan y cómo se atacan: "
            "explicar qué documentos sirven, cómo se presentan y cómo se atacan exige precisión."
        )
        result = inspect(src)
        self.assertFalse(result["approvedForNarration"])
        self.assertTrue(any(x["field"] == "centralThesis" and x["kind"] == "partial-source"
                            for x in result["issues"]))

    def test_generic_source_formula_blocks(self):
        src = dict(self.valid)
        src["reasoningChain"][1] = "En este tema suele discutirse confundir un trámite con la prueba."
        self.assertTrue(any(x["kind"] == "formulaic-source" for x in inspect(src)["issues"]))

    def test_source_is_not_rewritten(self):
        src = dict(self.valid)
        before = repr(src)
        report = inspect(src)
        self.assertEqual(before, repr(src))
        self.assertFalse(report["legalAccuracyCertified"])


if __name__ == "__main__":
    unittest.main()
