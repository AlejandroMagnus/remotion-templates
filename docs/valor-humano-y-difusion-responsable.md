# Valor humano y difusión responsable

Directriz transversal del proyecto, aplicable por defecto a la planificación,
elaboración y revisión de videos, guiones, publicaciones y demás contenido público.
Las instrucciones específicas de cada solicitud prevalecen. Se conservan los
componentes técnicos validados.

## Criterios editoriales

1. Cada pieza aporta un beneficio reconocible: ayudar, enseñar, resolver, aclarar,
   inspirar, motivar, entretener, hacer reír o provocar una reflexión útil. Elegir
   el beneficio según la intención del usuario.
2. Antes de producir, responder internamente: «¿Qué obtiene esta persona a cambio
   de su atención?». Esa respuesta es el eje; no pedir al usuario que complete una ficha.
3. Entregar valor con ejemplos, demostraciones, historias, explicaciones o acciones
   aplicables. Evitar promesas vacías y motivación genérica. No inventar casos, hechos
   ni fuentes para simular concreción; identificar los ejemplos hipotéticos.
4. Usar lenguaje comprensible y situaciones reconocibles para una necesidad
   concreta, manteniendo el rigor y la identidad del proyecto.
5. Diseñar una apertura honesta, un desarrollo que cumpla la promesa y un cierre
   significativo. Adaptar la estructura al formato, evitando piezas uniformes.
6. Coordinar voz, imágenes, montaje, sonido y subtítulos para reforzar el significado
   y la experiencia del espectador.
7. Merecer ser compartido por utilidad, emoción, humor o claridad. Sin engaños,
   spam, interacción artificial ni promesas de viralidad.
8. Vincular autoridad, comunidad y ofertas cuando sea pertinente. No convertir
   cada pieza en una venta.
9. Revisar beneficio, claridad, exactitud, originalidad, derechos y coherencia.
   Para contenido jurídico, aplicar la revisión especializada correspondiente.

## Aplicación en el flujo de videos

- El puente SILEC incorpora un plan de valor humano al paquete estratégico. Usa
  problema, público, razonamiento y conclusión de la fuente, sin añadir afirmaciones
  jurídicas ni modificar la ficha o su hash de revisión.
- El beneficio predeterminado del flujo jurídico es **aclarar**. El guion conserva
  las ocho arquitecturas creativas. Las escenas antes dedicadas a enumerar capacidades
  profesionales muestran ahora una conclusión útil de la fuente.
- En modo automático, la categoría comercial HT conserva el CTA fuente. FI, DT y
  fichas sin categoría cierran con la conclusión y la idea de cierre. La voz y el
  texto visible siguen la misma decisión. Las instrucciones específicas pueden
  conservar el CTA fuente (`source`) u omitirlo (`none`).
- Un control antes de la voz verifica que la apertura, los pasos del razonamiento
  y el cierre estén en el guion. Detecta planes desactualizados, producciones cruzadas,
  falta de destinatario/necesidad/conclusión y desarrollos vacíos o repetidos.
- Antes del render se repite el control sobre el VideoSpec final y se registra la
  disponibilidad de voz, timeline, subtítulos y manifiesto de imágenes. No se modifican
  esos archivos ni los tiempos de palabra ni la selección o prerenderización 3D.
- Los informes aparecen en el resumen de GitHub Actions y en `editorial-audit`:
  `*-human-value-plan.json`, `*-human-value-script-review.{json,md}` y
  `*-human-value-final-review.{json,md}`.

La dirección opcional se escribe por el agente a partir de la solicitud, sin
formulario obligatorio. Ejemplo dentro de un SILEC de producción:

```json
"humanValue": { "benefit": "enseñar", "ctaMode": "none" }
```

Beneficios admitidos: `ayudar`, `enseñar`, `resolver`, `aclarar`, `inspirar`,
`motivar`, `entretener`, `hacer-reír`, `reflexionar`. `ctaMode`: `auto`, `source`, `none`.
Esta opción no modifica las afirmaciones fuente; una solicitud que cambie su contenido
requiere actualizar la ficha y la revisión correspondiente. La selección autónoma
genera su propia ficha: no editar un SILEC efímero esperando que sobreviva a esa selección.

## Alcance de la revisión

Los controles comprueban estructura, presencia de contenido y trazabilidad; no pueden
certificar que una explicación sea útil, que una promesa se cumpla semánticamente,
que una fuente jurídica esté vigente o que una imagen tenga todos los permisos.
Las señales sobre garantías o viralidad requieren interpretación contextual, incluidas
negaciones y citas. No son sentencias automáticas de incumplimiento.

La revisión jurídica registrada se reconoce únicamente para su texto fuente mediante
el mecanismo existente. Los borradores `draft-render-ok` siguen siendo borradores.
Las comprobaciones no los convierten en contenido jurídicamente aprobado.
Un proveedor o una URL de imagen tampoco equivalen a una licencia verificada.
Antes de difundir, revisar la pieza completa y sus derechos, incluida voz, música y fuentes.
El flujo produce archivos de revisión/render; no publica por sí mismo en redes sociales.

Para publicaciones o guiones fuera del flujo Remotion, aplicar estos mismos nueve
criterios durante su elaboración y revisión. No se instala aquí un publicador nuevo.

## Verificación técnica

```bash
npm run typecheck
npm run test:editorial
npm run test:3d
```
