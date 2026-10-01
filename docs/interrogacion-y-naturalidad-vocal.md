# Interrogación y naturalidad humana — E.5

Directriz predeterminada para los próximos videos y su interpretación vocal.

1. Articular las sílabas tónicas de **qué, cómo, cuándo, dónde, cuál, quién y
   por qué** cuando sean interrogativas. Mantener las tildes y la escritura
   correctas; no introducir mayúsculas, repeticiones de letras ni grafías fonéticas
   para forzar al motor.
2. Interpretar la pregunta completa según su sentido: curiosidad, duda, reflexión,
   sorpresa o cuestionamiento. No imponer una subida final idéntica.
3. Distribuir las pausas por unidades de sentido. Conservar juntas las condiciones,
   incisos y subordinadas de una pregunta; dejar tiempo para comprender preguntas
   consecutivas sin añadir silencio después de cada fragmento.
4. Variar moderadamente velocidad, intensidad y entonación. Conversación clara y
   profesional, sin monotonía ni sobreactuación.
5. Comprobar el texto real enviado al motor. Usar los controles disponibles y
   registrar sus límites; no confundir una instrucción editorial con un control
   acústico que el proveedor no ofrece.
6. Escuchar antes de aprobar. Corregir y regenerar el pensamiento afectado si
   pierde claridad o su pausa resulta artificial.
7. Si cambia la duración, actualizar subtítulos y escenas con el mecanismo
   existente. Conservar el motor validado de sincronización.

**Aceptación:** preguntas comprensibles y expresivas al escucharlas sin leer los
subtítulos, con pausas que acompañen el pensamiento.

## Implementación

- La fuente sigue siendo `audio.narrationText`. El plan verifica que el texto TTS
  conserva letras, tildes, mayúsculas originales y signos. Solo se normalizan espacios.
  Una apertura declarativa ya no se transforma automáticamente en pregunta.
- Los dos directores comparten la detección de preguntas completas. El análisis
  contextual es una heurística editable, no una comprensión infalible del sentido.
- Se mantiene la voz `es-BO-MarceloNeural`. Edge TTS recibe `rate`, `pitch` y
  `volume` moderados por pensamiento. Su desplazamiento global de tono **no** es
  un control de la curva final ni del énfasis por sílaba. La realización del acento
  depende también de la voz y debe escucharse.
- Los finales e inicios naturales del audio se cuentan antes de añadir silencio.
  No se recorta la voz ni se estiman posiciones de palabras.
- Se conserva el mapeo de `WordBoundary`, el formato de timeline, el escritor SRT
  y el cálculo adaptativo de duración. Los planes semánticos, de escenas y 3D se
  reconstruyen después del audio en el orden existente.
- Cada pensamiento guarda audio y límites reales por palabra. La caché incluye
  texto, voz, versión y controles; valida la huella del archivo antes de reutilizarlo.
  Al cambiar uno, los demás pensamientos disponibles se reutilizan. Sin caché
  local se sintetizan los que falten: no se inventan ni reutilizan tiempos ajenos.

Capacidades del proveedor: [documentación de edge-tts](https://github.com/rany2/edge-tts/blob/master/README.md#custom-ssml),
consultada el 29 de septiembre de 2026. No se envía SSML personalizado ni instrucciones
de emociones como si fueran controles admitidos por este motor.

## Escucha y corrección

Muestra breve, independiente de los videos jurídicos:

```bash
python3 -B scripts/vocal-review.py preview
```

Escuchar `public/generated/vocal-question-preview-narration.mp3`. El informe
`vocal-question-preview-vocal-listening-review.json` identifica cada pensamiento,
sus interrogativos, controles, tiempos y archivo de audio individual.

En GitHub Actions, descargar el artefacto `vocal-review-…`. Incluye narración,
fragmentos, informe, timeline y subtítulos. Los fragmentos se guardan allí durante
siete días. Una ejecución nueva de Actions no conserva automáticamente su caché:
para corregir localmente, recuperar el artefacto bajo `public/generated/`, además
del VideoSpec y decisiones de la misma producción, sin mezclar ejecuciones.

Ejemplo de corrección **después de escuchar** el pensamiento 3:

```bash
python3 -B scripts/vocal-review.py revise video-juridico-030 --thought 3 --intent reflexión --rate -4 --pitch -1 --pause-after-ms 320
```

Usar el código y número reales del informe. La orden regenera ese pensamiento,
recompone el audio y ejecuta el pipeline existente desde la duración adaptativa
hasta la resolución de assets y la validación. Necesita las entradas y credenciales
habituales del proyecto. No renderiza ni publica el MP4; el video anterior no cambia.
Si falla una etapa, resolver el error y completar la reconstrucción antes del render.

La dirección queda vinculada al guion mediante su hash en
`content/<código>.vocal-direction.json`. Un guion diferente invalida esos ajustes
para evitar aplicarlos a otra pregunta. También puede fijarse esta dirección antes
de una nueva producción, a partir de instrucciones concretas del usuario.

Registro de aprobación, exclusivamente cuando una persona haya escuchado y
aceptado el audio correspondiente:

```bash
python3 -B scripts/vocal-review.py approve video-juridico-030 --reviewer "Nombre de quien escuchó"
```

La aprobación se vincula al hash del audio y del guion. Un cambio de audio anula
la aprobación anterior. Los controles técnicos nunca crean ese registro por sí
solos. El estado `pending-listening` permite generar un borrador para revisión;
no acredita naturalidad ni autoriza publicar.

## Verificación técnica

```bash
python3 -B -m unittest discover -s tests -p test_vocal_delivery.py
npm run typecheck
npm run test:editorial
npm run test:3d
npx vitest run tests/narration-timing.test.ts
```

Las pruebas usan audio sintético de laboratorio para comprobar caché, conservación
de texto y reconstrucción de tiempos. Ese audio no se entrega como muestra de voz
ni sirve para aprobar pronunciación. La aceptación auditiva requiere voz real.

## Ritmo para escucha y recuerdo — V1

Directriz: la cadencia debe facilitar la comprensión al escuchar y el recuerdo
de la idea central. La interpretación sigue unidades de sentido completas,
con énfasis moderado y variaciones profesionales.

La heurística reduce el ritmo de pensamientos largos o con varios conceptos
jurídicos técnicos y reserva una pausa de asimilación en su frontera. Evita
aceleraciones automáticas superiores a +2%, reduce ideas densas hasta -5%
y calma el cierre declarativo. Son ajustes relativos al motor, no una garantía
de palabras por minuto ni de mejora de memoria. Las correcciones expresas del
revisor conservan prioridad.

Los silencios que el motor ya produjo se descuentan antes de añadir una pausa.
No se corta audio dentro de una idea ni se reconstruyen límites de palabras.
La duración real vuelve a alimentar los mecanismos existentes de subtítulos
y escenas. Se mantiene la aprobación auditiva pendiente hasta escuchar el audio.

Revisión: entender sin subtítulos, identificar la enseñanza central y comprobar
que las pausas permiten asimilarla sin romper la continuidad. Los cambios se
aplican a próximas ejecuciones, no a MP4 ya exportados.
