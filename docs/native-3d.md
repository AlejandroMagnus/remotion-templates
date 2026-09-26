# Expediente y conexiones probatorias en 3D

Este módulo incorpora un ejecutor Three.js/React Three Fiber dentro de `ResolvedAssetLayer`. El selector editorial y la validación del contenido jurídico siguen siendo responsabilidades de los módulos existentes. La escena es un esquema ilustrativo: no representa documentos de un caso real ni acredita hechos.

## Estado de entrega

- TypeScript y 43 pruebas pasan, incluidas 11 pruebas nuevas de contratos, tiempos, compatibilidad y pipeline 3D.
- El bundle del piloto compiló. La previsualización local quedó bloqueada por `uv_interface_addresses` al iniciar el servidor de Remotion en el entorno de desarrollo del asistente.
- **Pendiente: inspección visual de los fotogramas y render del MP4 piloto.** No se ha aprobado todavía su apariencia ni se afirma que exista un MP4 verificado.
- `enable_3d` permanece desactivado por defecto.

## Prueba visual en Codespaces

Desde la raíz del repositorio, después de instalar:

```bash
npm run video:3d:preview
```

Genera cuatro fotogramas en `out/previews/native-3d-pilot/`: apertura, activación, punto medio y cierre. El piloto usa el mismo ejecutor y la misma capa de assets que producción, con un punto de entrada aislado para la revisión visual. Su VideoSpec es `examples/native-3d-pilot.video.json`. Dura ocho segundos, es vertical y deliberadamente silencioso.

Revisar que la carpeta tenga volumen, los documentos no se atraviesen de manera molesta, las conexiones aparezcan gradualmente y los textos se lean dentro del encuadre. Una vez aprobados los fotogramas:

```bash
npm run video:3d:render
```

El MP4 será `out/native-3d-pilot.mp4`. La prueba no consume servicios generativos ni registra una nueva producción editorial. Los archivos de prueba se guardan en su propio directorio.

## Producción

En Actions → Run workflow, seleccionar la rama `baseline-audiovisual-v3.16` y activar `enable_3d` después de revisar el piloto. El planificador opera tras la sincronización y el plan semántico existentes. No modifica la narración, el audio, los tiempos de palabra ni los intervalos de las escenas.

Solo las escenas `expediente` y `prueba` con una palabra compatible dentro de su intervalo son candidatas. Se admiten hasta dos escenas de tres a seis segundos, con separación de cinco segundos, un máximo del 30% de la duración y reserva para la firma final. Si ninguna cumple, el pipeline conserva los visuales originales y lo registra como `no-compatible-3d-scene`.

La fuente de verdad es `VideoSpec.threeD`. La auditoría `public/generated/<production>-three-d-plan.json` explica la selección; `resolved-assets.json` registra los assets nativos con `provider: native-three` y `mediaType: threeD`. Los intents 3D antiguos no compatibles siguen registrando explícitamente su fallback a video; no se contabilizan como geometría 3D.

Un plan 3D desactualizado, ausente del manifiesto o con tiempos ambiguos provoca un error explicativo. Al desactivar `enable_3d`, el planificador retira la configuración 3D de esa ejecución. Para revisar una producción completa, `npm run video:preview -- examples/<production>.video.json` incluye fotogramas específicos de sus escenas 3D.

El motor usa geometría y luces locales, y animación determinista por fotograma. No utiliza un reloj de animación independiente ni crea assets mediante IA. El render 3D usa ANGLE y concurrencia 1 para moderar el uso de memoria; puede tardar más que el render de fotografías.
