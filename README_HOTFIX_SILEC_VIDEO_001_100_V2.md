# HOTFIX SILEC VIDEO 001-100 V2

## Qué corrige

Este paquete corrige el fallo:

```bash
test -s "content/${PRODUCTION_CODE}.silec.json"
Error: Process completed with exit code 1
```

La causa más probable es que el workflow se ejecutó sin resolver correctamente `PRODUCTION_CODE`, o se ejecutó antes de subir/confirmar el paquete VIDEO-001 a VIDEO-100 al repositorio.

## Regla corregida

El workflow ahora acepta:

- `1`
- `001`
- `VIDEO-001`
- `video-001`

Y lo normaliza siempre a:

```text
video-001
```

Luego verifica:

```text
content/video-001.silec.json
examples/video-001.video.json
```

## Instalación rápida en Codespace

1. Sube este ZIP a la raíz del repositorio.
2. Abre la terminal en la raíz del repo.
3. Ejecuta:

```bash
unzip -o SILEC_VIDEO_001_100_HOTFIX_V2.zip

grep -n "Resolver ID de video SILEC" .github/workflows/main.yml
ls content/video-001.silec.json examples/video-001.video.json
python3 -m json.tool content/video-001.silec.json > /dev/null && echo "SILEC 001 OK"
python3 -m json.tool examples/video-001.video.json > /dev/null && echo "VIDEOSPEC 001 OK"

git status
git add content examples .github/workflows/main.yml README_HOTFIX_SILEC_VIDEO_001_100_V2.md README_SILEC_VIDEO_001_100.md
git commit -m "Hotfix SILEC video catalog 001-100"
git push
```

## IMPORTANTE

No ejecutes Actions antes del `git push`.

GitHub Actions usa los archivos que están en GitHub, no los cambios sueltos que aún estén sin commit dentro del Codespace.

## Prueba correcta

En GitHub:

Actions → Render Video Juridico V2 Sync → Run workflow

Usa:

```text
video_number: 1
production_code: dejar vacío
content_mode: existing
```

Si todo está bien, en el log debe aparecer:

```text
Código resuelto: video-001
SILEC esperado: content/video-001.silec.json
VideoSpec esperado: examples/video-001.video.json
PAQUETE SILEC CONFIRMADO: video-001
```

