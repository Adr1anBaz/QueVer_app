# QueVer: entregables de Apache Cordova

Sitio estático con el manual, dos presentaciones y sus PDF para GitHub Pages. No contiene ni ejecuta la aplicación Cordova.

## Construir localmente

```sh
npm install
npm run build && npm run pdf
```

El resultado queda en `dist/`. La construcción crea `dist/.nojekyll` para que GitHub Pages publique los archivos sin procesarlos con Jekyll.

## Publicar en GitHub Pages

```sh
npm run deploy
```

El comando reconstruye el sitio, genera los tres PDF y publica únicamente `dist/` en la rama `gh-pages`. En GitHub, configurar una vez **Settings → Pages → Build and deployment → Source: Deploy from a branch**, y seleccionar **Branch: `gh-pages`** y **Folder: `/ (root)`**.

La publicación estará disponible en `https://adr1anbaz.github.io/QueVer_app/`.
