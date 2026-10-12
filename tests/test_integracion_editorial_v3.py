"""Contrato entre auditoría lexical, guion aprobado y TTS."""
import json
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from vocal_intrascript_gate import audit_text
import editorial_delivery_contract as bridge

class WorkflowEditorialIntegration(unittest.TestCase):
    def test_three_gates_in_required_order(self):
        t = (ROOT / ".github/workflows/main.yml").read_text(encoding="utf-8")
        names = ["Contrato editorial — bloquear guion defectuoso antes de voz",
                 "V3.19-E.3 — Construir partitura vocal semántica",
                 "Generar narración prosódica y timeline palabra por palabra",
                 "Contrato editorial — verificar texto hablado y subtítulos legibles",
                 "Auditoría de autoría — Gate final antes del render",
                 "Contrato editorial — comprobar identidad antes de render",
                 "Renderizar V2 sincronizada"]
        indexes = [t.index(n) for n in names]
        self.assertEqual(indexes, sorted(indexes))
        self.assertIn('editorial_status=$?',t)
    def test_editorial_gate_has_v2_api(self):
        from vocal_intrascript_gate import VERSION
        self.assertEqual(VERSION, "INTRASCRIPT-EDITORIAL-GATE-V2")
        self.assertTrue(callable(audit_text))
    def test_reference_video_rejected_by_both_checks(self):
        t=(ROOT/'tests/fixtures/video015_guion_rechazado.txt').read_text(encoding='utf8')
        self.assertFalse(audit_text(t, 'Prueba documental en proceso civil')['passed'])
        self.assertFalse(bridge.editorial_report(t, 'Prueba documental en proceso civil')['passed'])
    def test_linguistic_fidelity_not_rewriting_source(self):
        t='El documento no puede tenerse por auténtico automáticamente. La copia puede tener valor según su contexto procesal.'
        self.assertEqual(bridge.canonical_words(t).count('no'),1)
        self.assertEqual(bridge.canonical_words(t).count('puede'),2)

if __name__ == '__main__': unittest.main()
