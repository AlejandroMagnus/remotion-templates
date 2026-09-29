"""Cache audio together with its actual WordBoundary data; never estimate timing."""
import hashlib
import json
import os
import shutil
import tempfile
from pathlib import Path


def file_hash(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()


async def cached_speech(cache: Path, request: dict, output: Path, synthesize, validate, force=False):
    key = hashlib.sha256(json.dumps(request, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    audio = cache / f"{key}.mp3"
    metadata = cache / f"{key}.json"
    if not force and audio.is_file() and metadata.is_file():
        try:
            record = json.loads(metadata.read_text(encoding="utf-8"))
            if record["request"] == request and record["audioHash"] == file_hash(audio):
                validate(record["words"])
                shutil.copyfile(audio, output)
                return record["words"], key, True
        except (ValueError, KeyError, TypeError, OSError):
            pass  # Corrupt or obsolete entries are rebuilt with real TTS boundaries.
    words = await synthesize(output)
    validate(words)
    if not output.is_file() or output.stat().st_size == 0:
        raise RuntimeError("TTS no produjo audio para guardar en caché.")
    cache.mkdir(parents=True, exist_ok=True)
    record = {"request": request, "audioHash": file_hash(output), "words": words}
    with tempfile.TemporaryDirectory(prefix="vocal-cache-", dir=cache) as temp:
        temporary = Path(temp)
        shutil.copyfile(output, temporary / "audio.mp3")
        (temporary / "metadata.json").write_text(json.dumps(record, ensure_ascii=False), encoding="utf-8")
        os.replace(temporary / "audio.mp3", audio)
        os.replace(temporary / "metadata.json", metadata)
    return words, key, False
