# HOTFIX V7 — Memoria Editorial SILEC numerada

## Problema corregido
El workflow bloqueaba videos VIDEO-003 y siguientes cuando la Memoria Editorial los clasificaba como `related-new-angle` con recomendación `reformulate`, aunque no fueran duplicados exactos.

## Política corregida
Para el catálogo numerado `video-001` a `video-100`:

- `reject-duplicate` sigue bloqueando.
- `reformulate` se convierte en advertencia no bloqueante.
- La producción continúa cuando el contenido es un ángulo relacionado pero nuevo.

Esto evita corregir video por video y mantiene protección contra duplicados reales.

## Comando recomendado

```bash
cd /workspaces/remotion-templates
unzip -o SILEC_VIDEO_001_100_HOTFIX_V7.zip -d .
grep -n "advertencia no bloqueante\|isSilecNumberedCatalog" scripts/editorial-memory.ts
git add scripts/editorial-memory.ts README_HOTFIX_SILEC_VIDEO_001_100_V7.md
git commit -m "Hotfix V7 allow related SILEC angles in editorial memory"
git push
```

Luego renderizar `video_number: 3`.
