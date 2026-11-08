# Guía práctica: estilo y texto

Estado: dirección aprobada; implementar sin cambiar exposición ni aplicación.

## Alcance

- Solo `src/guia/index.html` y una hoja de estilos exclusiva.
- Georgia en el título, Alumni Sans en secciones y Albert Sans en texto. Fuentes descargadas al sitio; código monoespaciado.
- Papel `#fcfbf8`, tinta `#242621`, gris `#63655e`, líneas `#dedfd7` y acento verde `#28554a`. Las diferencias de código mantienen violeta y signo +.
- Secciones abiertas, menos contenedores, navegación lateral conservada. No quitar controles, fases, instrucciones ni advertencias necesarias.
- Texto directo: títulos de acciones, frases cortas y explicaciones técnicas sin eslóganes.
- Referencias investigadas: impeccable.style, su CSS tipográfico y las guías públicas `distill`, `polish` y `mode-read`. La guía debe leerse como documento, no como una portada publicitaria.

## Ejecución

1. Añadir comprobaciones de tipografías y aislamiento a las pruebas web; confirmar fallo antes del cambio.
2. Añadir fuentes y CSS exclusivo; ajustar el texto conservando comandos, rutas y marcadores de generación.
3. Verificar copia exacta, navegación, teclado, móvil, proyección y PDF. Revisar capturas. Publicar en gh-pages y verificar HTTP público.

No ejecutar pruebas Android: no cambia ningún archivo de la app. No modificar `taller.css`, diapositivas ni guion. Preservar los cambios preexistentes de instalación y hoja de exposición.

## Verificación

- Fuentes locales con licencias OFL: 46 KB de WOFF2 en total.
- `npm run build`: pruebas de diferencias, seis checkpoints y E2E correctos. Incluye tipografías cargadas, teclado, proyección, copia exacta y vistas de 375, 768, 1280 y 1440 px.
- `npm run pdf` y comprobación de enlaces PDF: correctos.
- Capturas revisadas de portada, móvil, fase abierta y código en proyección. Corregido el espacio extra entre líneas de código solo en la guía.
- Comparación automática: comandos de Terminal idénticos. Sin cambios en checkpoints, diapositivas, guion ni estilos compartidos.
