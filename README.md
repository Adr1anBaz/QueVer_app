# QueVer: taller Android de Apache Cordova

Dos áreas publicadas en GitHub Pages:

- **Práctica:** `guia/index.html`. Instalación en Mac, app base Android, seis fases con archivos completos, diferencias visibles, comprobaciones y soluciones.
- **Exposición y guion:** `exposicion/index.html`. Agenda de 120 minutos, guion oral y acceso a `slides/teoria.html`.

Los checkpoints son la fuente de los archivos copiables; el sitio no ejecuta Cordova. Cada fase incluye solo el código correspondiente a ese momento. La clave OMDb se crea una vez y se conserva. No se publica ninguna clave real.

Las fuentes históricas de manual, instalación y hoja de exposición se conservan; al construir, sus rutas públicas envían al material vigente. Los PDF antiguos siguen disponibles por compatibilidad, pero las descargas principales son `guia.pdf`, `guion.pdf` y `teoria.pdf`. La guía PDF es un apoyo sin cientos de páginas de código; los archivos completos están en la web.

## Construir localmente

```sh
npm install
npm test
npm run build && npm run pdf
npm run check:guide
npm run test:e2e
npm run serve
```

El resultado queda en `dist/`. La construcción crea `dist/.nojekyll` para que GitHub Pages publique los archivos sin procesarlos con Jekyll.

El servidor local usa `http://127.0.0.1:4173/QueVer_app/`. Las pruebas E2E levantan su propio servidor y verifican el portapapeles contra los archivos fuente, descargas, errores de copia, navegación, tamaños de pantalla y diapositivas. Instala Chromium si falta: `npx playwright install chromium`.

### Validación Android opcional

Con JDK 17, SDK, Gradle, Cordova y un solo emulador ya iniciado:

```sh
node scripts/android.e2e.mjs
```

Crea un proyecto temporal y usa un identificador distinto (`com.ejemplo.quevertaller.validation`) para no reemplazar la app original. Compila e instala cada fase; comprueba el SQLite real y la persistencia entre actualizaciones y al reiniciar. Las respuestas OMDb son fixtures interceptadas en DevTools, no llamadas autenticadas al servicio real. Para el taller se debe probar adicionalmente OMDb con la clave personal activada y una Mac de la escuela. No corre en GitHub Actions.

## Publicar en GitHub Pages

La publicación principal es automática: cada `push` a `main` ejecuta el workflow de GitHub Actions, instala dependencias, ejecuta pruebas, genera sitio y PDF y despliega `dist/` en GitHub Pages. En Settings → Pages, la fuente debe ser **GitHub Actions**. El workflow también admite ejecución manual.

Como respaldo manual, si Actions no está disponible, se puede publicar la misma salida en la rama `gh-pages`:

```sh
npm run deploy
```

El comando reconstruye el sitio, genera los tres PDF y publica únicamente `dist/` en `gh-pages`.

La publicación estará disponible en `https://adr1anbaz.github.io/QueVer_app/`.
