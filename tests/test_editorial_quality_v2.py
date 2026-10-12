"""Regression tests for intra-video originality and human speech quality."""
import ast
import json
import re
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from vocal_intrascript_gate import audit_text


class EditorialQualityV2Test(unittest.TestCase):
    def test_bad_video015_audio_is_rejected(self):
        # A faithful sample from a real user-provided VIDEO-015 SRT excerpt.
        text = (
            'Prueba documental en proceso civil: antes de actuar, hay una pregunta que puede cambiar todo el caso. '
            'Ahora llévelo a una situación real. '
            'El riesgo frecuente en Prueba documental en proceso civil es confundir prueba documental en proceso civil con un trámite genérico sin identificar requisitos, autoridad y prueba. '
            'El punto jurídico decisivo es este. '
            'Prueba documental en proceso civil exige dominar qué documentos sirven, cómo se presentan y cómo se atacan; '
            'su valor práctico está en transformar qué documentos sirven, cómo se presentan y cómo se atacan en una decisión profesional con requisitos, prueba, autoridad competente y consecuencia verificable. '
            'Ahora observe esto. '
            'En este tema suele discutirse confundir prueba documental en proceso civil con un trámite genérico sin identificar requisitos, autoridad y prueba. '
            'La fuerza de una prueba depende también de presentarla de manera oportuna, comprensible y defendible.'
        )
        a = audit_text(text, 'Prueba documental en proceso civil')
        self.assertFalse(a['passed'])
        kinds = {i['kind'] for i in a['issues']}
        self.assertIn('partial', kinds)
        self.assertIn('topic', kinds)
        self.assertIn('formulaic', kinds)

    def test_specific_source_bound_script_passes(self):
        text = (
            '¿Qué prueba el documento que presentó la contraparte? '
            'El escrito de demanda identifica un contrato firmado el quince de enero. '
            'La firma aparece junto al apartado que establece la entrega del inmueble. '
            'El abogado consulta el original y confronta la fecha con la copia presentada. '
            'En su respuesta distingue el contenido del documento de las afirmaciones añadidas por la otra parte. '
            'La controversia sobre su autenticidad debe tratarse mediante el procedimiento legal aplicable, previa verificación normativa.'
        )
        self.assertTrue(audit_text(text, 'Prueba documental en proceso civil')['passed'])

    def test_close_but_distinct_facts_remain_valid(self):
        text = (
            'El contrato se firmó ante dos testigos presentes en la audiencia de conciliación. '
            'La carta fue entregada por mensajería y la constancia de recepción quedó en el expediente. '
            'La recepción de la carta no equivale automáticamente a reconocer el contenido del contrato.'
        )
        self.assertTrue(audit_text(text, 'Documentos civiles')['passed'])

    def test_repetition_inside_sentence_is_rejected(self):
        t = ('Debe revisar los requisitos antes de presentar el recurso; '
             'sin embargo, revisar los requisitos antes de presentar el recurso '
             'no garantiza una decisión favorable.')
        a = audit_text(t)
        self.assertIn('partial', {i['kind'] for i in a['issues']})

    def test_metadata_and_empty_input_fail_closed(self):
        with self.assertRaises(ValueError): audit_text('   ')

    def test_speech_and_effective_wpm_not_conflated(self):
        tree = ast.parse((ROOT / 'scripts/generate-prosodic-narration.py').read_text())
        funcs = [node for node in tree.body if isinstance(node, ast.FunctionDef)
                 and node.name in ('build_rhythm_metrics', 'build_vocal_qa')]
        self.assertEqual(len(funcs), 2)
        # Evaluate only pure functions, no TTS dependency or network calls.
        mod = ast.Module(body=funcs, type_ignores=[])
        ns = {'SegmentPlan': object, 'CreativeDirection': object,
              'MEASUREMENT': 'acoustic', '__builtins__': __builtins__}
        exec(compile(mod, '<local QA test>', 'exec'), ns)
        target = SimpleNamespace(min=124, max=168, preferred=148)
        direction = SimpleNamespace(vocal=SimpleNamespace(target_wpm=target))
        plan = [SimpleNamespace(word_count=150, rate='+0%', vocal_moment='explain', post_pause_ms=100)]
        metric = ns['build_rhythm_metrics'](plan, [], 60000, direction, 12000)
        self.assertAlmostEqual(metric['effectiveWpm'], 150)
        self.assertAlmostEqual(metric['speechWpm'], 187.5)
        self.assertEqual(metric['speechWpmStatus'], 'above-target')
        qa = ns['build_vocal_qa'](plan, metric)
        self.assertIn('speech-wpm-above-target-listening-required', qa['warnings'])
        self.assertIn('excessive-speech-speed', qa['issues'])
        self.assertFalse(qa['passed'])


if __name__ == '__main__': unittest.main()
