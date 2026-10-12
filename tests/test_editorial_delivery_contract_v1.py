"""Regressions: the delivered text, not merely the editor's draft, must pass."""
from __future__ import annotations
import json
import tempfile
import unittest
import sys
from pathlib import Path
from contextlib import redirect_stdout
from io import StringIO

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import editorial_delivery_contract as contract

VALID = (
    '¿Qué demuestra el documento aportado al expediente? '
    'El contrato original contiene una firma y una fecha que permiten identificar el acto discutido. '
    'La copia entregada a la contraparte presenta una diferencia visible en la fecha de entrega. '
    'El abogado separa el contenido literal de las afirmaciones de quien lo presentó. '
    'Si se discute la autenticidad, corresponde verificar el procedimiento aplicable antes de formular una objeción.'
)
BAD = (
    'Prueba documental en proceso civil: hay una pregunta que puede cambiar todo el caso. '
    'Ahora llévelo a una situación real. Primero. '
    'Prueba documental en proceso civil exige dominar qué documentos sirven, cómo se presentan y cómo se atacan; '
    'su valor práctico es transformar qué documentos sirven, cómo se presentan y cómo se atacan en un plan profesional. '
    'Después. Prueba documental en proceso civil es un asunto importante en el derecho.'
)


class EditorialContractTests(unittest.TestCase):
    def test_bad_video015_rejected_before_tts(self):
        report = contract.editorial_report(BAD, 'Prueba documental en proceso civil')
        self.assertFalse(report['passed'])
        kinds = {x['kind'] for x in report['issues']}
        self.assertTrue({'partial', 'topic', 'formulaic', 'empty-transition'}.issubset(kinds))

    def test_real_video015_uploaded_narration_is_rejected(self):
        text = (ROOT / 'tests/fixtures/video015_guion_rechazado.txt').read_text(encoding='utf-8')
        report = contract.editorial_report(text, 'Prueba documental en proceso civil')
        self.assertFalse(report['passed'])
        self.assertGreaterEqual(len(report['issues']), 8)
        self.assertIn('partial', {x['kind'] for x in report['issues']})
        self.assertIn('topic', {x['kind'] for x in report['issues']})

    def test_cognitively_clear_source_bound_content_accepted(self):
        report = contract.editorial_report(VALID, 'Prueba documental en proceso civil')
        self.assertTrue(report['passed'], report['issues'])

    def test_legal_distinctions_not_erased(self):
        t = ('La afirmación no implica aceptación del documento presentado. '
             'La afirmación implica aceptación del documento presentado solamente si consta un acto expreso.')
        self.assertEqual(contract.canonical_words(t).count('no'), 1)
        # Contract NEVER transforms approved legal prose to make it pass.
        self.assertIn(' no ', ' ' + t + ' ')

    def make_repo(self, location: Path, code='video-016'):
        (location/'examples').mkdir()
        (location/'content').mkdir()
        (location/'public/generated').mkdir(parents=True)
        (location/f'examples/{code}.video.json').write_text(json.dumps({
            'id': code, 'audio': {'narrationText': VALID},
            'meta': {'title': 'Prueba documental en proceso civil'}
        }, ensure_ascii=False), encoding='utf-8')
        (location/f'content/{code}.silec.json').write_text(json.dumps({
            'productionCode': code, 'topic': 'Prueba documental en proceso civil',
            'editorial': {'legalReview': {'reviewer': 'revisor-humano'}}
        }, ensure_ascii=False), encoding='utf-8')
        (location/f'public/generated/{code}-authorial-plan.json').write_text(json.dumps({
            'productionCode': code, 'sourceBound': True
        }), encoding='utf-8')

    def make_voice(self, location: Path, code='video-016', mutate=False):
        words = contract.punctuated_words(VALID)
        audio_words = [{'text': contract.canonical_words(word)[0],
                        'startMs': idx * 160, 'endMs': idx * 160 + 130}
                       for idx, word in enumerate(words)]
        if mutate: audio_words[10]['text'] = 'INVENTADO'
        (location/f'public/generated/{code}-timeline.json').write_text(json.dumps({
            'productionCode':code, 'vocalQA': {'passed': True},
            'words':audio_words, 'wordCount':len(audio_words),
            'durationMs':len(audio_words)*160+100
        }, ensure_ascii=False), encoding='utf-8')
        (location/f'public/generated/{code}-prosody-plan.json').write_text(json.dumps({
            'productionCode':code, 'effectiveNarration': VALID
        }, ensure_ascii=False), encoding='utf-8')

    def test_pre_post_final_freeze_source_audio_and_generate_readable_captions(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary); self.make_repo(root)
            contract.check_pre(root,'video-016')
            self.make_voice(root)
            contract.verify_audio(root,'video-016','post')
            contract.verify_audio(root,'video-016','final')
            lock=contract.read_json(root/'public/generated/video-016-editorial-delivery-contract.json')
            self.assertEqual(lock['state'],'verified-post-tts')
            self.assertLessEqual(lock['maxCaptionLength'], contract.MAX_CAPTION_CHARS)
            srt=(root/'public/generated/video-016.srt').read_text()
            subs=' '.join(line for line in srt.splitlines() if line and not line.isdigit() and '-->' not in line)
            self.assertEqual(contract.canonical_words(subs),contract.canonical_words(VALID))
            # Simulate a downstream step secretly mutating the approved script.
            spec_file=root/'examples/video-016.video.json'
            spec=json.loads(spec_file.read_text()); spec['audio']['narrationText'] += ' Conclusión agregada.'
            spec_file.write_text(json.dumps(spec, ensure_ascii=False))
            with self.assertRaisesRegex(contract.ContractError,'difiere'):
                contract.verify_audio(root,'video-016','final')

    def test_altered_source_and_wrong_wordboundary_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary); self.make_repo(root)
            contract.check_pre(root,'video-016')
            source=root/'content/video-016.silec.json'
            source.write_text(source.read_text()+'\n')
            with self.assertRaisesRegex(contract.ContractError,'ficha jurídica cambió'):
                contract.verify_audio(root,'video-016','post')
            source.write_text(source.read_text().rstrip())
            # Restore, but change one real WordBoundary word.
            self.make_voice(root,mutate=True)
            with self.assertRaisesRegex(contract.ContractError,'difiere'):
                contract.verify_audio(root,'video-016','post')

    def test_stale_authorial_plan_cannot_be_reused(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary); self.make_repo(root)
            plan=root/'public/generated/video-016-authorial-plan.json'
            plan.write_text(json.dumps({'productionCode':'video-015','sourceBound':True}))
            with self.assertRaisesRegex(contract.ContractError,'Inconsistencia'):
                contract.check_pre(root,'video-016')

    def test_no_change_to_voice_or_wordboundary(self):
        # A source-to-caption transformation never invents/fixes WordBoundary.
        w=[{'text':'¿Qué','startMs':100,'endMs':400},
           {'text':'documento','startMs':500,'endMs':900},
           {'text':'sirve','startMs':1000,'endMs':1230},
           {'text':'aquí?','startMs':1230,'endMs':1450}]
        before=json.dumps(w)
        c=contract.timed_captions('¿Qué documento sirve aquí?', w)
        self.assertEqual(before,json.dumps(w))
        self.assertEqual(contract.canonical_words(' '.join(x['text'] for x in c)),
                         contract.canonical_words('¿Qué documento sirve aquí?'))


if __name__ == '__main__': unittest.main()
