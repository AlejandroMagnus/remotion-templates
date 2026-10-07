# HOTFIX V3 — SILEC VIDEO 001-100

## Qué corrige

El workflow llegaba al paso:

`Valor humano — Revisar guion antes de generar voz`

y fallaba porque faltaba:

`public/generated/video-001-human-value-plan.json`

Este hotfix agrega el constructor del plan de valor humano y lo ejecuta antes de la revisión.

## Archivos incluidos

- `.github/workflows/main.yml`
- `scripts/build-human-value-plan.ts`
- `content/video-001.silec.json` ... `content/video-100.silec.json`
- `examples/video-001.video.json` ... `examples/video-100.video.json`
- `content/silec-video-catalog-001-100.json`

## Instalación rápida

Desde la raíz del repositorio:

```bash
unzip -o SILEC_VIDEO_001_100_HOTFIX_V3.zip -d .

grep -n "Construir plan de valor humano\|build-human-value-plan" .github/workflows/main.yml

ls scripts/build-human-value-plan.ts content/video-001.silec.json examples/video-001.video.json

python3 -m json.tool content/video-001.silec.json > /dev/null && echo "SILEC 001 OK"
python3 -m json.tool examples/video-001.video.json > /dev/null && echo "VIDEOSPEC 001 OK"

git add .github/workflows/main.yml scripts/build-human-value-plan.ts content examples README*.md

git commit -m "Hotfix V3 SILEC human value plan"

git push
```

## Prueba

En GitHub Actions:

- `video_number`: `1`
- `production_code`: dejar realmente vacío
- `content_mode`: `existing`

Debe aparecer:

- `PAQUETE SILEC CONFIRMADO: video-001`
- `HUMAN VALUE PLAN CONFIRMADO`
- `VALOR HUMANO: structural-checks-passed`
