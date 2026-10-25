# QueVer: entregables de Apache Cordova

Sitio estático con el manual, dos presentaciones y sus PDF para GitHub Pages. No contiene ni ejecuta la aplicación Cordova.

## Construir localmente

```sh
npm install
npm run build && npm run pdf
```

El resultado queda en `dist/`. La construcción crea `dist/.nojekyll` para que GitHub Pages publique los archivos sin procesarlos con Jekyll.

## Publicar en GitHub Pages

La publicación principal es automática: cada `push` a `main` ejecuta el workflow de GitHub Actions, instala las dependencias, genera el sitio y los tres PDF, y despliega `dist/` en GitHub Pages.

Como respaldo manual, si Actions no está disponible, se puede publicar la misma salida en la rama `gh-pages`:

```sh
npm run deploy
```

El comando reconstruye el sitio, genera los tres PDF y publica únicamente `dist/` en `gh-pages`.

La publicación estará disponible en `https://adr1anbaz.github.io/QueVer_app/`.
