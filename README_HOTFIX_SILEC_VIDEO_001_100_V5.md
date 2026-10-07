# HOTFIX V5 — SILEC VIDEO 001-100

Corrige el bloqueo de Memoria Editorial por `reject-duplicate`.

Causa: los primeros inputs SILEC tenían tesis y razonamientos demasiado parecidos entre sí. El precheck detectaba `video-002` como duplicado de `video-001`.

Corrección: se reemplazan los 100 `content/video-###.silec.json` y sus `examples/video-###.video.json` por versiones con tesis, problema, riesgo y ángulo operativo diferenciados por tema.

Aplicación recomendada:

```bash
cd /workspaces/remotion-templates
unzip -o SILEC_VIDEO_001_100_HOTFIX_V5.zip -d .

grep -n "Sincronizar ejemplos SILEC\|sync-silec-video-examples" .github/workflows/main.yml
python3 -m json.tool content/video-002.silec.json > /dev/null && echo "CONTENT 002 OK"
python3 -m json.tool examples/video-002.video.json > /dev/null && echo "EXAMPLE 002 OK"

git add content examples README_HOTFIX_SILEC_VIDEO_001_100_V5.md
git commit -m "Hotfix V5 differentiate SILEC video catalog"
git push
```

Luego ejecutar Actions con `video_number: 2` y `production_code` vacío.
