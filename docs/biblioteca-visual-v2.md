# Biblioteca audiovisual V2

Actualización del selector existente sobre `edd217a`. Conserva los intervalos del
plan semántico, la narración E.5 y WordBoundary. El director mantiene la decisión
entre fotografía, clip y 3D. No introduce publicación en redes ni servicios de pago.

## Fuentes operativas

| Fuente | Integración | Activación |
| --- | --- | --- |
| Pexels | API: fotografías y varios clips por consulta | `PEXELS_API_KEY` existente |
| Pixabay | API: fotografías, ilustraciones y clips | Añadir `PIXABAY_API_KEY` a los secretos de Actions |
| Biblioteca propia | Archivos locales con procedencia, etiquetas y revisión | Importar y revisar cada archivo |
| Mixkit | Importación de clips seleccionados y descargados por el usuario | Comprobar la licencia de ese recurso; no se raspa su web |
| Poly Haven | Importación por ID de modelos glTF 1K; conversión a GLB autosuficiente | `npm run assets:library -- polyhaven ID "etiquetas"` |
| ambientCG | Importación de modelos preparados como GLB | Los materiales y texturas se incorporan dentro del GLB mediante la herramienta de modelado |

La disponibilidad del conector no equivale a tener una clave ni a haber incorporado
material. Pexels continúa disponible con su configuración actual. El instalador no
crea cuentas, no obtiene credenciales y no declara activado Pixabay sin su clave.

Para Pixabay: GitHub → repositorio → Settings → Secrets and variables → Actions →
New repository secret. Nombre: `PIXABAY_API_KEY`; valor: la clave de su cuenta de
Pixabay. Obtenerla en https://pixabay.com/api/docs/. No introducirla en archivos
versionados ni en el chat.

## Selección y repetición

- Se recorren hasta tres páginas por consulta: la primera, la segunda y una página
  adicional estable según el código de producción. Se conservan hasta cinco
  consultas semánticas; cambiar de número no garantiza contenido ni imágenes nuevas.
- Se valoran varios clips por consulta por significado, encuadre vertical, resolución
  y duración suficiente. La consulta expresa la intención; sus palabras ya no se
  cuentan como prueba de que una imagen contenga esos elementos.
- Pexels y Pixabay mantienen identidades distintas; fotografía y video tampoco
  colisionan cuando tienen el mismo ID numérico.
- Los recursos empleados en las últimas doce producciones diferentes quedan
  temporalmente excluidos. Una reanudación del mismo código puede reutilizar sus
  recursos, pero no duplicarlos dentro del mismo video.
- Después de descargar se verifican tamaño real, duración, SHA-256 y una huella
  perceptual dHash con color. En clips se muestrean tres fotogramas. Esta comparación
  detecta parte de las copias y variaciones cercanas; no sustituye una revisión
  visual ni garantiza detectar cualquier recorte o montaje derivado.
- Un candidato defectuoso se descarta y se prueba otro. Si el director pide video
  y no hay clip válido, se conserva el fallback explícito a fotografía.
- Si se agotan los recursos distintos y adecuados, se guarda el diagnóstico y se
  detiene con `VISUAL_LIBRARY_NEEDS_FRESH_ASSETS`. No se rellena con una repetición
  reciente ni con una escena vacía.
- No se fuerza una cuota idéntica de movimiento para todos los guiones.

Las consultas API se almacenan por 24 horas y tienen un límite por ejecución. Los
errores de una fuente permiten probar las otras. Un 429 desactiva esa fuente durante
la ejecución, sin eludir el límite. El cache no almacena claves en las rutas.

La memoria se conserva en `.cache/visual-memory-v2.json`, el cache de Actions de la
rama y Supabase si está configurado, usando la tabla existente y su campo `metadata`.
Se importa también la memoria anterior de `data/visual-memory.json`. Las filas antiguas
sin huella siguen sirviendo para comparar ID y URL; adquieren huella cuando se reutilizan
legítimamente. Una memoria local dañada se señala en lugar de borrarla.

Actions conserva además el artefacto `visual-library-…` con manifiesto, plan 3D,
catálogo y memoria. Los caches pueden caducar; Supabase es la persistencia duradera
cuando está configurado. Si falla, el diagnóstico lo muestra y queda la copia local.
Se mantiene la serialización existente del canal para reducir conflictos de memoria.
La reserva se registra al resolver los recursos, por lo que una ejecución que falle
más tarde conserva esa reserva; reintentar el mismo código está permitido.

## Importar material seleccionado

Crear un JSON con la descripción del archivo real (ejemplo; no es una licencia otorgada):

```json
{
  "id": "mi-clip-documentos",
  "provider": "own",
  "mediaType": "video",
  "title": "Organizar documentos en un escritorio",
  "tags": ["documentos", "expediente", "organizar"],
  "sourceUrl": "https://example.org/procedencia-del-archivo",
  "creator": "Autor del material",
  "license": "Licencia o autorización verificada",
  "licenseUrl": "https://example.org/autorizacion"
}
```

Desde la raíz del repositorio:

```bash
npm run assets:library -- import metadata.json clip.mp4
npm run assets:library -- status
```

La importación comprueba el archivo, calcula su huella y lo deja `pending`. Tras
revisar apariencia, etiquetas y derechos:

```bash
npm run assets:library -- approve mi-clip-documentos "Nombre del revisor"
```

Guardar en Git tanto `content/visual-library/catalog.json` como los nuevos archivos
de `public/library/` para que Actions los reciba. No usar `git add .` si hay cambios
ajenos. Se rechazan IDs repetidos, rutas fuera de `public` y archivos modificados
después de su revisión. Los modelos aceptados son GLB sin dependencias externas ni
decodificadores adicionales; máximo 25 MiB. Los medios tienen límite de 80 MiB.

## Modelo 3D de ejemplo

Se incluye `ph-book_encyclopedia_set_01`, procedente de Poly Haven, bajo CC0. Está
**pendiente de revisión visual y excluido de producción**. El modelo se descargó,
sus dependencias se verificaron con los checksums de la fuente y se empaquetó como
GLB local. El bundle del ejecutor compiló; el servidor de vista previa del entorno
de desarrollo falló con `uv_interface_addresses` antes de producir fotogramas.

En Codespaces:

```bash
npm run assets:preview -- ph-book_encyclopedia_set_01
```

Abrir `out/previews/visual-library/ph-book_encyclopedia_set_01/15.png` y `90.png`.
Comprobar carga, encuadre, materiales y pertinencia. Después de una revisión favorable:

```bash
npm run assets:library -- approve ph-book_encyclopedia_set_01 "Nombre del revisor"
```

Guardar ese cambio del catálogo en Git. Para producción, activar `enable_3d` en el
workflow. El planificador compara etiquetas con el contexto de la escena, conserva
el máximo de dos escenas, la separación y el presupuesto del 30%, y excluye modelos
usados recientemente. Las escenas de expediente existentes siguen funcionando.
Las animaciones embebidas y el movimiento de presentación se evalúan por fotograma;
no se usa un reloj independiente. El prerender selectivo existente continúa operando.

## Verificación

```bash
npm run typecheck
npm run test:visual
npm run test:3d
npm run test:editorial
```

Las pruebas usan respuestas API simuladas y archivos de prueba reales para verificar
selección, memoria, duración, detección de copias, catálogo, GLB y pipeline. No equivalen
a una prueba autenticada de Pexels/Pixabay ni a aprobación estética de un video final.

Fuentes técnicas consultadas el 1 de octubre de 2026:
- https://www.pexels.com/api/
- https://pixabay.com/api/docs/ (cache de 24 horas, cuotas y restricciones de descarga masiva)
- https://mixkit.co/license/ (licencias distintas por recurso)
- https://polyhaven.com/license
- https://github.com/Poly-Haven/Public-API/blob/master/ToS.md (identificación y crédito de la API)
- https://docs.ambientcg.com/license/
- https://www.remotion.dev/docs/three-canvas

La aprobación de un recurso visual no constituye revisión jurídica del guion.
