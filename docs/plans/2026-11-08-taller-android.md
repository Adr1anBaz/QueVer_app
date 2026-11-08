# Taller Android de QueVer — auditoría y plan de implementación

**Estado:** aprobado por el usuario; implementación en verificación. El usuario autorizó además publicar los materiales con GitHub Pages.
**Objetivo:** impartir una sesión de 120 minutos en Mac, construir QueVer por fases copiando archivos completos y comprobarla en un emulador Android existente.
**Arquitectura:** conservar el sitio estático y los checkpoints como fuente del código. Generar la práctica desde esos archivos, con diferencias reales entre fases y copia exacta del archivo completo. Separar el sitio en dos entradas: Práctica y Exposición.
**Tecnologías:** HTML, CSS, JavaScript, Node.js, Reveal.js; Cordova Android y SQLite para la app.
**Especificación:** requisitos del usuario recogidos en este documento.

## 1. Requisitos confirmados

- Clase de 120 minutos; las computadoras son Mac y ya se han usado emuladores Android.
- Solo Android en este taller. No pedir Xcode, CocoaPods, iOS ni Browser.
- Construcción gradual: cada fase entrega únicamente la aplicación alcanzada hasta ese momento.
- Copiar y reemplazar archivos completos, aunque cambie una sola línea; no insertar funciones ni fragmentos.
- Mostrar dónde cambió cada archivo respecto a la fase anterior.
- Facilitar tanto seguir instrucciones como explicar qué hace cada pieza.
- Todo lo práctico en un mismo lugar; todo lo expositivo en otro.
- No prometer una instalación instantánea: faltantes, permisos, red y primera compilación siguen siendo condiciones externas.

## 2. Auditoría del estado actual

Inspección de fuentes y scripts locales. No se ejecutó Cordova ni se verificó una Mac de la escuela. No se hizo revisión visual en navegador todavía.

| Prioridad | Hallazgo y evidencia | Consecuencia | Corrección propuesta |
| --- | --- | --- | --- |
| Alta | `scripts/build.mjs:69–87` prioriza fragmentos de funciones y oculta los archivos completos como respaldo. | No cumple el método solicitado; obliga a localizar anclas y funciones. | Un único flujo principal: reemplazar archivos completos de esa fase. |
| Alta | `scripts/build.mjs:19–26` compara líneas por índice. | Una inserción desplaza el resto y produce resaltados falsos. | Diferencias por secuencia de líneas, con pruebas de inserción, modificación y eliminación. |
| Alta | `src/guia/index.html:209–215` mezcla creación, Android, iOS y ejecución en un solo bloque. | Copiar todo exige herramientas ajenas al taller y puede ejecutar destinos no disponibles. | Bloques cortos y consecutivos para Mac → Android, con una acción por bloque. |
| Alta | La práctica reparte requisitos entre manual, guía, slides y hoja de exposición. | El alumno pierde el punto actual y no sabe qué documento manda. | Una práctica autosuficiente; el manual deja de ser un requisito externo. |
| Alta | La agenda reserva la comprobación final para 101–112 min, aunque incluye un comando de arranque antes. | No existe una puerta de comprobación clara antes de construir. | Primera app abierta en Android antes de fase 1 y prueba obligatoria al finalizar cada fase. |
| Alta | `src/guia/checkpoints/01-datos/www/js/db.js` ya contiene `insertMovie` y `getMoviesByStatus`. | Introduce guardado y consulta antes de sus fases. | Introducir funciones al usarlas; mantener el esquema estable si facilita conservar los datos. |
| Alta | Se exige clave propia de OMDb pero no hay un recorrido completo de solicitud, correo, activación y prueba dentro de la práctica. | El grupo puede bloquearse al llegar a búsqueda. | Solicitud al inicio, activación y comprobación antes de fase 2; pedirla previamente cuando sea posible. |
| Media | El manual pide instalar Java y Gradle, pero deriva el procedimiento de instalación a otros sitios. | No es una receta lista para seguir en Mac. | Diagnóstico primero, instalación específica solo de faltantes y verificación posterior. |
| Media | `~/.zprofile` se menciona sin explicar cómo abrir, editar y cargar el archivo sin borrar configuraciones existentes. | Riesgo de pegar contenido en Terminal en lugar del perfil o perder cambios previos. | Ruta principal con variables de sesión; persistencia explicada aparte, sin sobrescribir perfiles. |
| Media | Se propone descargar una imagen API 37 aunque ya puede existir un AVD utilizable. | Descarga pesada innecesaria y confusión entre SDK de compilación y Android del emulador. | Reutilizar el AVD existente y distinguir ambas versiones. |
| Media | Botones “Copiar” y “Copiar archivo completo” pueden copiar exactamente lo mismo. | No queda clara la acción correcta. | Un botón principal “Copiar archivo completo” y descarga secundaria. |
| Media | La captura de fase 1 muestra buscador y botón aleatorio que no están en su HTML. | El alumno compara con un resultado que todavía no debe existir. | Capturas reales por fase o instrucciones textuales precisas mientras no haya captura. |
| Media | Referencias Q40, afirmaciones de pruebas y avisos “no ejecutado” conviven sin alcance claro. | Confunde evidencia de otro equipo con el estado del taller. | Retirar jerga interna y separar instrucciones de evidencia fechada de pruebas. |
| Media | Inicio con cinco entradas equivalentes, portada grande y código de guía a `0.82rem`. | Jerarquía de documentos y lectura proyectada poco claras. | Dos entradas, fases visibles, modo de lectura amplio y código ampliable. |
| Media | El mecanismo publicado permite acceder a todos los checkpoints desde el inicio. | Puede invitar a saltar a la versión final. | Presentar una fase a la vez, sin descarga final destacada ni paquete de todas las fases. No fingir control de acceso: los archivos estáticos seguirán siendo accesibles. |

### Comprobaciones efectuadas

- `node scripts/check-checkpoint-fragments.mjs`: las cinco transiciones actuales reconstruyen exactamente el checkpoint siguiente.
- Esa prueba valida reconstrucción por fragmentos, no ejecución Android, copia desde la interfaz ni calidad didáctica.
- Tamaños observados: `index.js` crece de 29 a 178, 304, 407, 543 y 697 líneas; hay que enseñar los cambios sin exigir leer todo el archivo.
- Las seis plantillas de `config.local.js` contienen el marcador `TU_API_KEY`; no se deben sustituir sobre la clave real del alumno.
- Hay cambios locales preexistentes en slides, estilos, portada y exportador PDF, además de la hoja de exposición sin seguimiento. Preservarlos y trabajar sobre su contenido actual; no revertirlos.

## 3. Diseño propuesto

### Separación del material

**Inicio:** dos accesos claros y nada más al mismo nivel.

1. **Práctica · Construye QueVer en Android.** Una página autosuficiente con índice fijo: preparativos, entorno Mac, primera ejecución, fases 1–6, comprobación final y solución de problemas. Todo comando, explicación y archivo necesario estará ahí. El alumno no tendrá que abrir slides o manual para avanzar.
2. **Exposición · Entiende Cordova.** Diapositivas de teoría y guion del presentador, con agenda de 120 minutos, explicaciones orales y transiciones hacia la práctica. La instalación ejecutable vive solo en Práctica, no duplicada en otro deck.

Reutilizar `src/guia/index.html` como práctica y `src/slides/teoria.html` como deck. Crear `src/exposicion/index.html` como entrada expositiva. Integrar en esas dos áreas los contenidos útiles de manual, instalación y hoja. Mantener las rutas antiguas con avisos y enlaces de compatibilidad; no borrar fuentes ajenas ni dejar instrucciones contradictorias activas.

### Contrato de cada fase

1. Objetivo visible: “Al terminar podrás…”.
2. Explicación breve: qué hace Cordova y qué hace nuestro código en este bloque.
3. Mapa de archivos: **nuevo / cambió / sin cambios / conservar clave**.
4. Para cada archivo nuevo o cambiado: ruta exacta, acción “crear” o “reemplazar todo”, código completo de esa fase, números de línea y botón “Copiar archivo completo”.
5. Resaltado de líneas agregadas o modificadas, con etiquetas además de color; resumen separado de eliminaciones. Navegación al cambio siguiente, sin obligar a buscarlo dentro de 697 líneas.
6. Los archivos sin cambios siguen disponibles completos en una sección secundaria para recuperación; nunca se repite una instrucción de pegado innecesaria.
7. El archivo de clave se crea una vez. Desde entonces se marca “Conservar: no reemplazar”. No incluirlo en acciones de reemplazo posteriores.
8. Prueba Android: comando, acción en pantalla, resultado esperado y fallos frecuentes específicos.
9. Cierre de fase: lista corta “ya funciona / todavía no está incluido” y acceso a la siguiente fase.

El resaltado, los números y las etiquetas son solo presentación: el portapapeles y la descarga deben entregar exactamente el archivo fuente, sin anotaciones ni líneas eliminadas.

### Progresión funcional

| Bloque | Se incorpora | No adelantar |
| --- | --- | --- |
| Preparación | Diagnóstico Mac, CLI, Android, plugin y app base en el AVD existente. | Código de la app final. |
| 1 · Base y SQLite | Pantalla inicial, `deviceready`, apertura de base y creación de tabla. | Funciones de guardado, consulta de catálogo y edición. |
| 2 · Búsqueda | Clave OMDb, petición HTTP, resultados y detalle. | Formulario de guardado y CRUD del catálogo. |
| 3 · Guardado | Pendiente/vista, opinión, calificación, inserción y listado mínimo. | Edición y recomendación. |
| 4 · Catálogo | Tarjetas, separación por estado y lista completa. | Edición y recomendación. |
| 5 · Edición | Actualizar, cambiar estado, eliminar con confirmación. | Recomendación. |
| 6 · Recomendación | Selección y consulta OMDb, reutilizando el guardado existente. | Nuevas dependencias o sistemas de recomendación. |

### Agenda propuesta — 120 minutos

| Minutos | Actividad |
| --- | --- |
| 0–5 | Objetivo, materiales y solicitud/activación de OMDb si falta. |
| 5–17 | Teoría esencial; aprovechar para que terminen descargas iniciadas. |
| 17–35 | Entorno Mac, crear proyecto y confirmar app base en Android. |
| 35–45 | Fase 1: pantalla y SQLite. |
| 45–60 | Fase 2: buscar y abrir detalle. |
| 60–75 | Fase 3: guardar y recuperar. |
| 75–87 | Fase 4: catálogo. |
| 87–99 | Fase 5: edición. |
| 99–107 | Fase 6: recomendación. |
| 107–120 | Persistencia al cerrar/abrir, recuperación, preguntas y cierre. |

Los tiempos son objetivos, no garantía de descarga. Preparativos previos: confirmar permisos para instalar, Node, Java 17, SDK y Gradle, red y clave OMDb en una Mac escolar. Si un equipo se retrasa, recuperar con los archivos completos de la fase actual, conservando clave y base; si es instalación, trabajar temporalmente en pareja sin introducir Browser como otra ruta.

## 4. Plan de implementación

### Tarea 1 — Comprobar y cerrar la receta Mac → Android

**Archivos:** `src/guia/index.html`, `src/manual/index.html`, metadatos nuevos `scripts/checkpoints.mjs`.

- [ ] Extraer nombres y archivos de fases a `scripts/checkpoints.mjs`, sin depender del mecanismo de fragmentos.
- [ ] Verificar los requisitos de las versiones fijadas: CLI 13.0.0, Android 15.1.0 y SQLite 7.0.0; no actualizarlas silenciosamente. Consultar los metadatos instalados y documentación oficial.
- [ ] Escribir diagnóstico con `node --version`, `npm --version`, `/usr/libexec/java_home -V`, `gradle --version` y detección de SDK/AVD. Mostrar qué salida permite avanzar y qué hacer si falta cada herramienta.
- [ ] Proporcionar una instalación concreta por faltante, diferenciando Mac Intel/Apple Silicon cuando corresponda y permisos escolares. No exigir Homebrew sin comprobar que existe; no recomendar `sudo npm install` como solución general.
- [ ] Configurar variables para la sesión sin borrar `~/.zprofile`; documentar persistencia como opción explícita.
- [ ] Crear proyecto en una carpeta identificada, agregar solo Android y SQLite con versiones fijadas, ejecutar `cordova requirements android` y abrir la app base en el AVD existente.
- [ ] Separar compilación, despliegue y diagnóstico: no poner comandos alternativos en un mismo bloque “copiar todo”.
- [ ] Incorporar solicitud/activación OMDb y una comprobación que no publique la clave ni la introduzca en capturas o logs compartidos.
- [ ] Comprobar la receta desde carpeta nueva; si no se dispone de Mac escolar, registrar esa limitación expresamente.

### Tarea 2 — Hacer que los checkpoints sean realmente progresivos

**Archivos:** `src/guia/checkpoints/{01-datos,02-busqueda,03-guardado,04-catalogo,05-edicion,06-aleatorio}/`; nuevo `scripts/check-checkpoints.mjs`.

- [ ] Añadir un comprobador de archivos requeridos, sintaxis JS, rutas HTML, marcador de clave y ausencia de funciones adelantadas según la tabla de progresión.
- [ ] Ejecutar el comprobador antes de modificar y confirmar que detecta las funciones adelantadas de fase 1.
- [ ] Mover funciones de base de datos a su primera fase de uso, preservando las funcionalidades y el esquema entre fases.
- [ ] Sustituir mensajes operativos iOS/Browser por instrucciones Android coherentes.
- [ ] Ejecutar `node scripts/check-checkpoints.mjs`: todos los checkpoints pasan. Registrar por separado lo que aún requiere prueba nativa.

### Tarea 3 — Archivos completos y diferencias precisas

**Archivos:** `scripts/build.mjs`; nuevos `scripts/code-diff.mjs`, `scripts/code-diff.test.mjs` y `scripts/check-guide.mjs`; `package.json`.

**Interfaces propuestas:** `diffLines(previous, current)` devuelve líneas actuales etiquetadas `unchanged`, `added` o `modified`, y rangos de eliminaciones referidos al archivo anterior. `stageNames` y `filesForStage` se importan desde `scripts/checkpoints.mjs`.

- [ ] Escribir pruebas con `node:test`: archivo idéntico sin marcas; una inserción no marca el resto; modificación localizada; eliminación sin insertar líneas antiguas en el archivo actual; líneas repetidas; archivo nuevo; archivo vacío; salto final y texto con `<`, `&` y caracteres españoles.
- [ ] Ejecutar `node --test scripts/code-diff.test.mjs` y comprobar fallos antes de implementar.
- [ ] Implementar comparación por secuencias de líneas, no por posición; no añadir una biblioteca grande para este problema.
- [ ] Cambiar el generador: archivos completos como contenido principal, sin instrucciones de insertar/reemplazar funciones, sin duplicación de botones y sin pruebas Browser.
- [ ] Mantener copia desde el recurso fuente; mostrar números, etiquetas, rangos y navegación de cambios solo en el HTML de presentación.
- [ ] Añadir `npm test` que ejecute pruebas de diferencias y comprobación de checkpoints; añadir `npm run check:guide` para verificar el sitio generado.
- [ ] Ejecutar pruebas y build; `check-guide` confirma rutas, archivos de cada fase, ausencia de fragmentos operativos y conservación de la clave después de fase 1.

### Tarea 4 — Unificar la práctica y separar la exposición

**Archivos:** `src/index.html`, `src/guia/index.html`, nuevo `src/exposicion/index.html`, `src/slides/teoria.html`, `src/slides/instalacion.html`, `src/hoja-exposicion/index.html`, `src/manual/index.html`, `src/assets/css/presentacion.css`.

- [ ] Portada con dos entradas principales: Práctica y Exposición.
- [ ] Integrar toda la receta y las seis fases en Práctica usando el contrato definido arriba. Enlaces externos solo para descargas/registro, no para pasos internos faltantes.
- [ ] Añadir explicaciones por fase con el recorrido concreto de un dato: evento → función → API o SQLite → actualización de pantalla.
- [ ] Crear el área Exposición con teoría esencial, guion oral y agenda; convertir instalación y manual antiguos en referencias a la práctica vigente, sin borrar trabajo preexistente.
- [ ] Mejorar jerarquía y lectura: índice de fases, acción actual clara, tamaño de código ampliable, diseño ancho para proyección, foco visible y contraste comprobable. Sin animaciones que retrasen la clase.
- [ ] Actualizar capturas para que coincidan con su fase; si falta evidencia real, usar resultado esperado textual, no una captura de otra fase.
- [ ] Quitar referencias Q40 y contradicciones de evidencia. No afirmar pruebas que no se hayan realizado.
- [ ] Comprobar en navegador escritorio, proyección 1280×720 y móvil; revisar teclado, navegación y ausencia de desbordamientos del documento.

### Tarea 5 — Prueba completa como alumno y actualización de entregables

**Archivos:** nuevo `scripts/guide.e2e.mjs`, `scripts/export-pdf.mjs`, `README.md`; evidencia de validación en este plan.

- [ ] Crear prueba Playwright contra el sitio generado: recorrer fases, copiar cada archivo y comparar el portapapeles con el recurso fuente; probar descarga alternativa y error de copia con mensaje útil.
- [ ] Verificar que “siguiente cambio” enfoca una marca del archivo correcto y que eliminaciones se explican sin contaminar la copia.
- [ ] Seguir el taller en proyecto temporal nuevo: sin reutilizar `platforms/` ni `node_modules/` de la app original. No modificar `../quever/`.
- [ ] Aplicar fases 1–6 reemplazando archivos completos como haría un alumno; conservar `config.local.js` y los datos de SQLite.
- [ ] Compilar y ejecutar cada fase en Android: pantalla, búsqueda, detalle, guardado, reinicio/persistencia, catálogo, edición/eliminación y recomendación.
- [ ] Probar clave ausente o no activada, red caída, búsqueda vacía, duplicado y emulador apagado; la guía debe conducir a un siguiente paso concreto.
- [ ] Sin acceso a OMDb o al emulador, marcar pruebas pendientes; una simulación en navegador no sustituye la verificación nativa.
- [ ] Actualizar exportación PDF y README para reflejar las dos áreas. Mantener el código completo en web; usar una guía PDF breve de apoyo, no duplicar cientos de páginas por defecto.
- [ ] Ejecutar `npm test`, `npm run build`, `npm run check:guide`, `node scripts/guide.e2e.mjs` y `npm run pdf`; comprobar PDFs y enlaces internos generados.
- [ ] No publicar, hacer push ni crear commits sin autorización. Presentar evidencia y limitaciones antes de declarar listo el taller.

## 5. Condiciones de aceptación

- Hay exactamente dos áreas principales y la práctica no depende de navegar al área expositiva.
- Un alumno en Mac con emulador existente sigue una sola receta Android, sin instalar herramientas iOS ni otro AVD por defecto.
- Cada fase ofrece archivos completos propios, nunca el archivo final anticipado ni fragmentos que insertar.
- Una sola línea insertada no provoca que todo lo posterior aparezca como nuevo.
- El código copiado coincide exactamente con el archivo de esa fase; no incluye numeración o etiquetas.
- La clave se configura una vez y no se pierde al avanzar o recuperar una fase.
- Cada fase tiene explicación para el expositor, prueba concreta y resultado acorde a lo que existe en ese momento.
- Hay prueba nativa por fase o una lista explícita de pendientes; pasar build/pruebas web no se presenta como validación Android.
- Cambios locales preexistentes preservados; app original intacta.

## 6. Riesgos que la documentación no elimina

Permisos de instalación en las Mac escolares; versiones realmente presentes; tiempo y estabilidad de red; llegada del correo de OMDb; disponibilidad de un emulador funcional y compatibilidad con el hardware. La práctica puede reducir decisiones y errores, pero “plug and play” exige comprobar estas condiciones antes de la sesión.

## 7. Evidencia de ejecución

- Implementadas las dos áreas: práctica autosuficiente y exposición/guion. Rutas históricas conservadas mediante páginas de compatibilidad generadas.
- `npm test`: cuatro pruebas de diferencias correctas y seis checkpoints con sintaxis, rutas, plantilla de clave y progresión correctas. Se comprobó primero que las pruebas fallaban sin comparador y por CRUD adelantado.
- `npm run build` y `npm run check:guide`: correctos.
- `npm run test:e2e`: copia exacta de todos los archivos, descargas, error de copia, navegación por anclas, seis fases cerradas por defecto y vistas de 375, 768, 1280 y 1440 px; sin errores JavaScript.
- `npm run pdf` y `node scripts/check-guide.mjs --pdf`: correctos. Guía de apoyo: 9 páginas; guion: 5; diapositivas: 18.
- Revisión visual de portada, práctica, exposición y slides de arquitectura/caso QueVer. Slides muestreados sin desbordamiento vertical a 1280×720.
- Metadatos de npm para Android 15.1.0: Node `>=20.17.0 || >=22.9.0`.
- GitHub Pages ya estaba en modo workflow y el usuario tiene permiso de publicación. Falta registrar el resultado del despliegue de esta revisión.
- El token Git rechazó modificar `.github/workflows/pages.yml` por falta de scope `workflow`. Se conserva ese workflow y las verificaciones se integran mediante `prebuild`, `postbuild` y `postpdf` de npm, que ese workflow ya ejecuta. No se ampliaron permisos ni se cambiaron credenciales.
- Primera prueba Android: compilación correcta; despliegue bloqueado al indicar `--target=Pixel_4` sobre un AVD ya encendido. En Cordova Android 15.1.0 el destino online se compara con el ID ADB, no con el nombre del AVD. Corregida la prueba para usar el comando principal de la guía, sin target, y documentada la diferencia en ayuda.
- La validación nativa usa un proyecto temporal y otro identificador, para no tocar `../quever/` ni reemplazar su app. OMDb se simula con fixtures; no se usa una clave real.
- Pendientes externos incluso después de las pruebas locales: ejecutar en una Mac de la escuela, permisos y red escolar, y búsqueda autenticada con la clave OMDb personal activada.
