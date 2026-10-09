# Capa Maestra de Auditoría de Autoría y Singularidad V1

## Finalidad

Esta capa no reescribe el video. **Decide si merece producirse.**

Se instala después de la generación del VideoSpec y antes del TTS, y vuelve a ejecutarse antes del render final.

## Qué controla

1. Diferenciación conceptual frente a videos ya producidos.
2. Similitud de tesis.
3. Similitud de narración completa.
4. Repetición de aperturas.
5. Repetición de cierres.
6. Repetición de arquitectura narrativa.
7. Riesgo de sustitución de tema.
8. Densidad de lenguaje específico.
9. Uso de retórica jurídica genérica.
10. Identidad visual de escenas.
11. Valor operativo.
12. Variedad vocal y de activos en la fase final.

## Principio rector

> Si se puede cambiar el tema y el mismo discurso sigue funcionando, la pieza no se produce.

## Dos gates

### Gate 1 — Script

Se ejecuta después de la revisión Human Value del guion y antes del TTS.

Compara la pieza contra hasta 20 videos efectivamente registrados en la memoria editorial de Supabase.

### Gate 2 — Final

Se ejecuta después de la revisión Human Value final y antes del render.

Añade controles de prosodia y ejecución visual sin modificar sincronización, audio, 3D ni renderer.

## Umbral

- Score mínimo: 76/100.
- Narración: no puede superar 72% de similitud con una pieza previa.
- Tesis: no puede superar 80%.
- Apertura: no puede superar 78%.
- La especificidad debe ser al menos 55/100.
- Una pieza con 65% o más de escenas genéricas queda bloqueada.

## Artefactos

Cada ejecución produce:

- `public/generated/<production_code>-authorship-audit.json`
- `public/generated/<production_code>-authorship-audit.md`

Estos archivos se conservan en el artefacto `editorial-audit` de GitHub Actions.

## Qué NO hace

- No inventa Derecho.
- No cambia la ficha jurídica.
- No toca Human Value.
- No toca Aula.
- No toca Marketing.
- No modifica WordBoundary.
- No modifica Remotion.
- No altera 3D.
- No sustituye la revisión jurídica.

Su única función es impedir que otro video correcto pero genérico llegue al render.
