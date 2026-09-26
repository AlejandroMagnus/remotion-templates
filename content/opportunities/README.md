# Cartera editorial Q∞ — V3.17-C

El selector existente admite fichas adicionales desde `catalog.json`. No crea un sistema jurídico paralelo ni atribuye revisiones a PhD 12: comprueba la constancia registrada y que corresponda al texto que se va a producir.

`agenda.json` contiene **40 propuestas de investigación**: 18 de firma intelectual (FI), 12 de dominio transversal (DT) y 10 de alto impacto/high ticket (HT). Abarcan dimensiones doctrinales, sustantivas, procesales y forenses. Son preguntas pendientes, no conocimiento validado ni entradas renderizables. El catálogo aprobado se entrega vacío porque el repositorio no contiene las fuentes ni las constancias de validación de esas propuestas.

## Incorporar una pieza

1. `npm run editorial:catalog -- draft fi-01` crea una ficha pendiente en `content/opportunities/drafts/fi-01.json`. Complete su problema, tesis, razonamiento, conclusión, aportación intelectual, audiencia y elementos narrativos a partir del contenido revisado por PhD 12. Complete también la valoración editorial de 0 a 100.
2. La revisión debe identificar jurisdicción, fuentes con localizadores, responsable, fecha y referencia verificable de la constancia. El comando `npm run editorial:catalog -- hash content/opportunities/drafts/fi-01.json` calcula la huella del texto completo. Registre esa huella como `editorial.legalReview.contentHash` y el estado `approved` únicamente cuando exista la revisión correspondiente. Calcular una huella no valida una afirmación jurídica.
3. `npm run editorial:catalog -- import content/opportunities/drafts/fi-01.json` incorpora la ficha al catálogo. El comando rechaza fichas incompletas, pendientes, revocadas, vencidas o modificadas después de su revisión. Guarde y suba `catalog.json` junto con su documentación de revisión al repositorio mediante el procedimiento habitual.

Cambiar una tesis, conclusión, gancho, cierre o llamada a la acción invalida la huella. Para revocar una ficha existente, cambie su estado en el catálogo a `revoked`. Para corregirla, actualice su revisión allí. Una pieza sustancialmente nueva debe tener otro ID; cambiar solamente el ID o el título no evita el control de tesis repetidas.

Las diez oportunidades heredadas mantienen su comportamiento compatible y la marca `legalVerificationRequired: true`; **no se presentan como jurídicamente validadas**. Las nuevas fichas requieren revisión registrada. La comprobación técnica no autentica por sí sola al revisor ni comprueba las fuentes: el responsable del catálogo debe conservar la constancia y controlar quién puede modificarla.

## Selección y memoria

- La ventana móvil considera los últimos 20 videos producidos: FI 9, DT 6 y HT 5. Prioriza el déficit de categoría entre las fichas elegibles; después ordena por puntuación estratégica/editorial. Si falta una categoría elegible, puede elegir otra. Las categorías históricas desconocidas se muestran expresamente.
- Una prioridad de Q∞ 01 puede cambiar ese orden con ID y motivo. Un veto también exige motivo. Una prioridad repetida, no revisada o inexistente produce un diagnóstico; no se sustituye silenciosamente. Estas opciones están disponibles en el workflow.
- El modo `directed` exige coincidencia con el tema o ángulo solicitado. La rotación automática no cambia la intención expresa. Se conservan los controles de repetición y revisión.
- La memoria distingue tesis, conclusión, narración e identidad de oportunidad. Lee los registros antiguos separados por `|` y escribe un sobre JSON versionado en el campo de texto `objective` existente. No borra historial. Los lectores anteriores deben actualizarse junto con el escritor; los consumidores externos de `objective` también deben conocer este formato.
- La lectura pagina el historial completo del canal 3. Los intentos fallidos o borradores no cuentan como producidos. La comparación mantiene el historial antiguo para detectar duplicados, aunque la diversidad reciente use una ventana corta.
- `produce-new-angle` requiere una tesis materialmente distinta y una contribución revisada que identifique las piezas relacionadas en `editorial.newAngle.comparedWith`. El selector no reescribe una ficha automáticamente.
- Si se agotaron las fichas distintas, la producción se detiene antes de generar voz o imágenes con `CATALOG_NEEDS_REVIEWED_CONTENT`. Cambiar 022 por 023 no amplía la cartera.

La ficha editorial previa y el diagnóstico completo se muestran en el registro y se conservan como artefactos de GitHub Actions, incluso cuando falla la selección. La concurrencia del workflow serializa las producciones de este canal; no controla escritores externos a ese workflow.

## Verificación

```bash
npm run typecheck
npm run test:editorial
npm run editorial:catalog -- check
```

Las pruebas incluyen registros antiguos, duplicados renombrados, paginación de 1.201 registros, revisiones inválidas y una simulación de 40 producciones con memoria persistida. Sus fuentes y revisores son fixtures sintéticos, no validaciones jurídicas.

No se modifican voz, subtítulos, sincronización, resolución de imágenes ni renderizado. Para evaluar la ejecución real hacen falta la memoria de Supabase y fichas nuevas efectivamente revisadas. Las métricas léxicas son un control operativo; no garantizan detectar todas las paráfrasis ni sustituyen el criterio jurídico/editorial.
