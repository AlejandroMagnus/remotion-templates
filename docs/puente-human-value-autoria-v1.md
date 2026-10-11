# Puente Human Value ↔ Autoría V1

## Problema resuelto

El Director de Autoría puede seleccionar una presentación distinta usando únicamente proposiciones ya presentes en la ficha jurídica revisada. V5 puede además retirar una apertura metodológica repetitiva.

El revisor Human Value original exigía literalmente todos los textos del plan anterior. Eso podía bloquear una pieza válida aunque el nuevo guion siguiera siendo source-bound, útil y jurídicamente gobernado.

## Solución

No se modifica `HumanValueDirector`.

El runner `review-human-value.ts` mantiene primero todos los controles originales:

- sourceHash;
- producción correcta;
- plan vigente;
- legalReview de la ficha original;
- escenas;
- recursos finales.

Cuando existe un `authorial-plan.json` source-bound, solo se reconcilia el bloque estructural de narración:

- apertura: acepta la apertura original o una apertura proveniente de los fragmentos fuente del plan autoral;
- desarrollo: exige al menos dos proposiciones source-bound del razonamiento autoral;
- cierre: conserva takeaway, closing idea y CTA cuando corresponda.

No se fabrica una aprobación jurídica nueva y no se reescribe el contentHash.
