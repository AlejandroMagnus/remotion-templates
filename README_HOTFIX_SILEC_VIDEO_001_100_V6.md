# HOTFIX V6 — Normalización de dimensión editorial SILEC

## Error corregido
El workflow fallaba en `Construir paquete estratégico SILEC` porque `editorial.dimension` contenía valores como:

- `procesal constitucional`

pero el schema vigente solo acepta:

- `doctrinal`
- `sustantiva`
- `procesal`
- `forense`

## Corrección
Se normalizaron los contenidos VIDEO-001 a VIDEO-100 para que `editorial.dimension` use únicamente los valores admitidos por el schema.

La serie de acciones constitucionales queda clasificada como:

```json
"dimension": "procesal"
```

porque se trata de vías procesales/constitucionales de defensa y control, y el schema no admite valores compuestos.

## Comandos recomendados

```bash
cd /workspaces/remotion-templates
unzip -o SILEC_VIDEO_001_100_HOTFIX_V6.zip -d .
python3 - <<'PY'
import json, glob
allowed={"doctrinal","sustantiva","procesal","forense"}
bad=[]
for p in glob.glob('content/video-*.silec.json'):
    d=json.load(open(p))
    dim=d.get('editorial',{}).get('dimension')
    if dim not in allowed:
        bad.append((p,dim))
print('BAD=', bad)
assert not bad
print('DIMENSIONES SILEC OK')
PY
git add content README_HOTFIX_SILEC_VIDEO_001_100_V6.md
git commit -m "Hotfix V6 normalize SILEC editorial dimensions"
git push
```

Luego correr Actions con:

- `video_number: 2`
- `production_code:` vacío
- `content_mode: existing`
