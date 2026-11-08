import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { stageNames, filesForStage } from './checkpoints.mjs';
const root = new URL('../dist/', import.meta.url);
const guide = await readFile(new URL('guia/index.html', root), 'utf8');
assert.doesNotMatch(guide, /AGREGAR DESPUÉS DE|REEMPLAZAR FUNCIÓN|cordova run browser|cordova platform add ios/);
assert.equal((guide.match(/class="lesson" id="(?:datos|busqueda|guardado|catalogo|edicion|aleatorio)"/g) || []).length, 6);
for (const stage of stageNames) {
  for (const file of filesForStage) assert.ok(guide.includes(`data-source="checkpoints/${stage}/${file}"`));
  if (stage !== stageNames[0]) assert.ok(!guide.includes(`data-copy-url="checkpoints/${stage}/www/js/config.local.js"`));
}
for (const path of ['index.html', 'guia/index.html', 'exposicion/index.html', 'slides/teoria.html']) {
  const url = new URL(path, root), html = await readFile(url, 'utf8');
  for (const [, href] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    if (/^(https?:|data:)/.test(href)) continue;
    const target = new URL(href, url);
    if (target.pathname.endsWith('.pdf') && !process.argv.includes('--pdf')) continue;
    await access(target);
    if (target.hash && target.pathname.endsWith('.html')) {
      const contents = await readFile(target, 'utf8');
      assert.ok(contents.includes(`id="${target.hash.slice(1)}"`), `Ancla rota: ${path} → ${href}`);
    }
  }
}
console.log('Guía: 6 fases completas, clave conservada, rutas y anclas correctas.');
