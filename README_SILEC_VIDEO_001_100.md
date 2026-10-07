# Paquete SILEC VIDEO-001 a VIDEO-100

Este paquete agrega al repositorio Remotion una biblioteca inicial de 100 videos jurídicos numerados.

## Qué contiene

- `content/video-001.silec.json` a `content/video-100.silec.json`
- `examples/video-001.video.json` a `examples/video-100.video.json`
- `content/silec-video-catalog-001-100.json`
- `.github/workflows/main.yml` actualizado para aceptar `video_number`

## Cómo usarlo en GitHub Actions

1. Entrar a **Actions**.
2. Abrir el workflow **Render Video Juridico V2 Sync**.
3. Presionar **Run workflow**.
4. En `video_number`, escribir `1`, `001` o `VIDEO-001`.
5. Dejar `content_mode` en `existing`.
6. Ejecutar.

El workflow normalizará el número y buscará automáticamente:

- `content/video-001.silec.json`
- `examples/video-001.video.json`

## Regla operativa

- Si introduces `VIDEO-001`, se produce `video-001`.
- Si introduces `12`, se produce `video-012`.
- Si introduces `VIDEO-100`, se produce `video-100`.

## Nota

Este paquete no revela metodología interna. Los textos están preparados como enseñanza jurídica pública, útil, prudente y estratégica.
