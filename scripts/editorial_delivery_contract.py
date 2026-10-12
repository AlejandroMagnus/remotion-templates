#!/usr/bin/env python3
"""EDITORIAL DELIVERY CONTRACT V1: same approved prose from SILEC to narration.

pre: fail closed on textual/structural defects and lock exact approved script,
     SILEC input and source-bound authorial plan. No legal claims invented.
post: check text, original WordBoundary alignment and technical QA; rewrite
      *only* an external .srt with mobile-readable, word-timed captions.
final: verify text, source, audio timeline and caption file remained unchanged.

Do not edit audio, WordBoundary, Remotion, source, legalReview or authorial thesis.
"""
from __future__ import annotations
import hashlib
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

from vocal_intrascript_gate import audit_text, tokens

VERSION = "EDITORIAL-DELIVERY-CONTRACT-V1"
MAX_CAPTION_CHARS = 46
MAX_CAPTION_WORDS = 7
MAX_WORDS_UNBROKEN = 53
STANDALONE_TRANSITIONS = {
    'primero', 'segundo', 'tercero', 'despues', 'luego',
    'finalmente', 'continuemos', 'ahora', 'atencion',
}
EMPTY_PROMISES = (
    'hay una pregunta que puede cambiar todo el caso',
    'antes de actuar hay una pregunta que puede cambiar todo el caso',
    'si este analisis le dio una nueva forma de mirar',
    'continue con los demas contenidos del canal',
)

class ContractError(ValueError):
    pass


def canonical_words(text: str) -> list[str]:
    return tokens(text)


def norm(text: str) -> str:
    return ' '.join(canonical_words(text))


def digest(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def read_json(path: Path) -> dict:
    data = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(data, dict):
        raise ContractError(f'Documento JSON inválido: {path}')
    return data


def atomic_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.new')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(tmp, path)


def source_paths(root: Path, code: str) -> dict[str, Path]:
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', code):
        raise ContractError('Código de producción inválido')
    return {
        'spec': root / f'examples/{code}.video.json',
        'source': root / f'content/{code}.silec.json',
        'authorial': root / f'public/generated/{code}-authorial-plan.json',
        'timeline': root / f'public/generated/{code}-timeline.json',
        'prosody': root / f'public/generated/{code}-prosody-plan.json',
        'srt': root / f'public/generated/{code}.srt',
        'lock': root / f'public/generated/{code}-editorial-delivery-contract.json',
    }


def additional_issues(narration: str) -> list[dict]:
    clauses = [c.strip() for c in re.split(r'(?<=[.!?…])\s+', narration) if c.strip()]
    found: list[dict] = []
    for index, clause in enumerate(clauses):
        stripped = norm(clause)
        if stripped in STANDALONE_TRANSITIONS:
            found.append({'kind': 'empty-transition', 'clause': index,
                          'text': clause, 'description': 'Conector aislado sin enseñanza'})
        # Prose designed to be heard must be comprehensible in one breath.
        # Only block uninterrupted clauses; enumerations with semicolon can be processed separately.
        for portion in re.split(r'[;:]', clause):
            count = len(canonical_words(portion))
            if count > MAX_WORDS_UNBROKEN:
                found.append({'kind': 'overlong-clause', 'clause': index, 'words': count,
                              'text': portion[:180],
                              'description': 'Frase extensa sin división que facilite la escucha'})
    full = norm(narration)
    for phrase in EMPTY_PROMISES:
        if phrase in full:
            found.append({'kind': 'empty-promise', 'text': phrase,
                          'description': 'Promesa o cierre genérico sin contenido demostrativo'})
    return found


def editorial_report(narration: str, topic: str) -> dict:
    old = audit_text(narration, topic)
    structural = additional_issues(narration)
    issues = old['issues'] + structural
    return {'version': VERSION, 'passed': not issues, 'issues': issues,
            'numberOfWords': len(canonical_words(narration)),
            'warnings': [
                'Una auditoría lexical no certifica exactitud normativa, jurisprudencial ni originalidad semántica profunda.',
                'Si la ficha revisada contiene solo generalidades, solicitar desarrollo específico desde PhD 12; no inventar Derecho.',
                'La naturalidad final requiere escucha humana; QA técnico no equivale a aprobación auditiva.',
            ]}


def _preflight(root: Path, code: str) -> tuple[dict, dict[str, Path]]:
    paths = source_paths(root, code)
    # Invalidate an old approval before inspecting a newly-built VideoSpec.
    paths['lock'].unlink(missing_ok=True)
    for name in ('spec', 'source', 'authorial'):
        if not paths[name].is_file():
            raise ContractError(f'Falta {name}: {paths[name]}')
    video = read_json(paths['spec'])
    source = read_json(paths['source'])
    authorial = read_json(paths['authorial'])
    if video.get('id') != code or source.get('productionCode') != code or authorial.get('productionCode') != code:
        raise ContractError('Inconsistencia entre códigos de VideoSpec, ficha SILEC y Autoría')
    if authorial.get('sourceBound') is not True:
        raise ContractError('Autoría no confirma sourceBound=true')
    narration = video.get('audio', {}).get('narrationText')
    if not isinstance(narration, str) or not narration.strip():
        raise ContractError('Narración inexistente en VideoSpec')
    topic = str(source.get('topic') or video.get('meta', {}).get('title') or '')
    report = editorial_report(narration, topic)
    report.update(productionCode=code, topic=topic,
                  narrationSha256=digest(narration.encode('utf-8')),
                  sourceSha256=digest(paths['source'].read_bytes()),
                  authorialSha256=digest(paths['authorial'].read_bytes()),
                  legalReviewRetained='editorial' in source and 'legalReview' in source.get('editorial', {}),
                  sourceBound=authorial['sourceBound'],
                  state='blocked' if not report['passed'] else 'approved-for-tts')
    atomic_json(paths['lock'], report)
    if not report['passed']:
        summary = '\n'.join(f"- {p['kind']}: {p.get('text','')[:125]}" for p in report['issues'][:16])
        raise ContractError(f'GUIÓN EDITORIALMENTE BLOQUEADO ({len(report["issues"])} hallazgos):\n{summary}')
    print(f'{VERSION}: APROBADO PRE-TTS — {report["numberOfWords"]} palabras')
    return report, paths


def check_pre(root: Path, code: str) -> None:
    _preflight(root, code)


def read_approval(paths: dict[str, Path], code: str) -> tuple[dict, dict]:
    if not paths['lock'].is_file():
        raise ContractError('Falta aprobación editorial previa a la síntesis')
    report = read_json(paths['lock'])
    if report.get('state') not in ('approved-for-tts', 'verified-post-tts') or not report.get('passed'):
        raise ContractError('El guion NO recibió aprobación editorial')
    if report.get('productionCode') != code or report.get('version') != VERSION:
        raise ContractError('El certificado no corresponde al video o la versión')
    video = read_json(paths['spec'])
    if video.get('id') != code:
        raise ContractError('VideoSpec identifica otro video')
    narration = video.get('audio', {}).get('narrationText')
    if not isinstance(narration, str) or digest(narration.encode('utf-8')) != report['narrationSha256']:
        raise ContractError('El texto que llegará al TTS difiere del guion editorialmente aprobado')
    if digest(paths['source'].read_bytes()) != report['sourceSha256']:
        raise ContractError('La ficha jurídica cambió después de la aprobación')
    if digest(paths['authorial'].read_bytes()) != report['authorialSha256']:
        raise ContractError('El plan autoral cambió después de la aprobación')
    return report, video


def validate_word_timing(words: list[dict], duration: int) -> None:
    if len(words) < 4 or duration <= 0:
        raise ContractError('Timeline vacía o duración inválida')
    previous_start, previous_end = -1, -1
    for index, word in enumerate(words):
        try:
            start, end = int(word['startMs']), int(word['endMs'])
            token = word['text']
        except (TypeError, KeyError, ValueError) as exc:
            raise ContractError(f'WordBoundary #{index} mal formado') from exc
        if not isinstance(token, str) or not token.strip():
            raise ContractError(f'Palabra vacía en WordBoundary #{index}')
        if start < 0 or end <= start or end > duration + 100:
            raise ContractError(f'WordBoundary #{index} fuera de la duración real')
        if start < previous_start or start < previous_end - 2:
            raise ContractError(f'WordBoundary no monótono/solapado en #{index}')
        previous_start, previous_end = start, end


def srt_time(ms: int) -> str:
    h, rem = divmod(ms, 3600000)
    m, rem = divmod(rem, 60000)
    s, milli = divmod(rem, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{milli:03d}'


def punctuated_words(text: str) -> list[str]:
    """Derive captions from the approved text, preserving punctuation."""
    matches = list(re.finditer(r'\w+(?:[’\x27]\w+)*', text, flags=re.UNICODE))
    output = []
    for i, match in enumerate(matches):
        before = text[matches[i - 1].end():match.start()] if i else text[:match.start()]
        after = text[match.end():matches[i + 1].start()] if i + 1 < len(matches) else text[match.end():]
        # Spanish ¿¡ belong to the following token, commas/stops to preceding token.
        pre = ''.join(c for c in before if c in '¿¡')
        post = ''.join(c for c in after if c in '.,;:!?…')
        output.append(pre + match.group(0) + post)
    return output


def timed_captions(text: str, words: list[dict]) -> list[dict]:
    caption_words = punctuated_words(text)
    # For literals such as 1.500/acronyms, refuse guessing inaccurate captions.
    if canonical_words(' '.join(caption_words)) != canonical_words(' '.join(w['text'] for w in words)):
        raise ContractError('No se pueden asignar subtítulos fieles a las marcas WordBoundary')
    if len(caption_words) != len(words):
        raise ContractError('Número de palabras fuente distinto del número de marcas temporales')
    results = []
    buffer: list[str] = []
    first = 0
    for idx, display in enumerate(caption_words):
        proposed = ' '.join(buffer + [display])
        big_gap = idx > first and int(words[idx]['startMs']) - int(words[idx-1]['endMs']) > 640
        if buffer and (len(buffer) >= MAX_CAPTION_WORDS or len(proposed) > MAX_CAPTION_CHARS or big_gap):
            results.append({'startMs': int(words[first]['startMs']),
                            'endMs': int(words[idx-1]['endMs']), 'text': ' '.join(buffer)})
            first, buffer = idx, []
        buffer.append(display)
        if display.endswith(('.', '?', '!', '…')):
            results.append({'startMs': int(words[first]['startMs']),
                            'endMs': int(words[idx]['endMs']), 'text': ' '.join(buffer)})
            first, buffer = idx+1, []
    if buffer:
        results.append({'startMs': int(words[first]['startMs']),
                        'endMs': int(words[-1]['endMs']), 'text': ' '.join(buffer)})
    return results


def captions_to_srt(captions: list[dict]) -> str:
    return '\n\n'.join(f'{i}\n{srt_time(cap["startMs"])} --> {srt_time(cap["endMs"])}\n{cap["text"]}'
                     for i, cap in enumerate(captions, 1)) + '\n'


def verify_audio(root: Path, code: str, stage: str) -> None:
    paths = source_paths(root, code)
    report, video = read_approval(paths, code)
    text = video['audio']['narrationText']
    if not paths['timeline'].is_file() or not paths['prosody'].is_file():
        raise ContractError('Faltan timeline/prosody generados por TTS')
    timeline, prosody = read_json(paths['timeline']), read_json(paths['prosody'])
    if timeline.get('productionCode') != code or prosody.get('productionCode') != code:
        raise ContractError('Timeline o prosodia corresponden a otro video')
    if timeline.get('vocalQA', {}).get('passed') is not True:
        raise ContractError('La calidad vocal técnica no fue aprobada')
    words = timeline.get('words')
    if not isinstance(words, list) or timeline.get('wordCount') != len(words):
        raise ContractError('WordBoundary incompleta')
    validate_word_timing(words, int(timeline.get('durationMs') or 0))
    spoken_words = canonical_words(' '.join(w['text'] for w in words))
    if canonical_words(text) != spoken_words:
        raise ContractError('La transcripción real de WordBoundary difiere del texto aprobado')
    effective = prosody.get('effectiveNarration')
    if not isinstance(effective, str) or canonical_words(effective) != spoken_words:
        raise ContractError('La narración efectiva no coincide con WordBoundary ni el texto aprobado')
    captions = timed_captions(text, words)
    rendered_srt = captions_to_srt(captions)
    if stage == 'post':
        # Captions are post-processed for mobile but WordBoundary/audio stay intact.
        paths['srt'].write_text(rendered_srt, encoding='utf-8')
        report.update(state='verified-post-tts', timelineSha256=digest(paths['timeline'].read_bytes()),
                      prosodySha256=digest(paths['prosody'].read_bytes()),
                      srtSha256=digest(rendered_srt.encode('utf-8')),
                      captionCount=len(captions), maxCaptionLength=max(len(c['text']) for c in captions))
        atomic_json(paths['lock'], report)
    else:
        for key, path in (('timelineSha256', paths['timeline']),
                          ('prosodySha256', paths['prosody']), ('srtSha256', paths['srt'])):
            if report.get(key) != digest(path.read_bytes()):
                raise ContractError(f'El archivo {path.name} cambió después de la verificación')
    print(f'{VERSION}: {stage.upper()} APROBADO — {len(words)} palabras, '
          f'{len(captions)} subtítulos, máximo {max(len(c["text"]) for c in captions)} caracteres')


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[1] not in ('pre', 'post', 'final'):
        print('Uso: editorial_delivery_contract.py <pre|post|final> <video-code>', file=sys.stderr)
        return 2
    try:
        stage, code = sys.argv[1:]
        if stage == 'pre': check_pre(Path.cwd(), code)
        else: verify_audio(Path.cwd(), code, stage)
        return 0
    except (ContractError, ValueError, FileNotFoundError, KeyError, json.JSONDecodeError) as exc:
        print(f'{VERSION}: BLOQUEADO — {exc}', file=sys.stderr)
        return 42 if isinstance(exc, ContractError) else 2

if __name__ == '__main__':
    raise SystemExit(main())
