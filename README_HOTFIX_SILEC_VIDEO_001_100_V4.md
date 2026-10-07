# HOTFIX V4 — SILEC VIDEO 001-100

Corrige el bloqueo de Valor Humano: el guion debe contener exactamente la apertura, el desarrollo y el cierre previstos por `content/<video>.silec.json`.

Este hotfix sincroniza `examples/video-###.video.json` para que `audio.narrationText` incluya:

1. hook / apertura;
2. razonamientos o pasos;
3. conclusión;
4. idea de cierre.

También agrega `scripts/sync-silec-video-examples.ts` y lo ejecuta antes de la revisión de valor humano.

## Instalación

```bash
cd /workspaces/remotion-templates
unzip -o "$(find . -name 'SILEC_VIDEO_001_100_HOTFIX_V4.zip' | head -n 1)" -d .

grep -n "Sincronizar ejemplos SILEC\|sync-silec-video-examples" .github/workflows/main.yml
npx --yes tsx scripts/sync-silec-video-examples.ts

python3 -m json.tool examples/video-001.video.json > /dev/null && echo "EXAMPLE 001 OK"

git add .github/workflows/main.yml scripts/sync-silec-video-examples.ts content examples README*.md
git commit -m "Hotfix V4 SILEC sync examples for human value"
git push
```

Luego ejecutar GitHub Actions con `video_number: 1`, `production_code` vacío y `content_mode: existing`.
