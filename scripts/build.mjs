import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { stageNames, filesForStage } from './checkpoints.mjs';
import { diffLines } from './code-diff.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = join(root, 'src'), dist = join(root, 'dist');
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const load = (stage, file) => readFile(join(source, 'guia/checkpoints', stage, file), 'utf8');

async function stageCards(stage, index) {
  const previous = stageNames[index - 1];
  const cards = [], unchanged = [];
  const files = [...filesForStage, ...(index === 0 ? ['www/js/config.local.js'] : [])];
  for (const file of files) {
    const text = await load(stage, file);
    const before = previous ? await load(previous, file) : undefined;
    const same = before === text;
    const diff = diffLines(before, text);
    const id = `${stage}-${file.replace(/[^a-z0-9]/gi, '-')}`;
    const url = `checkpoints/${stage}/${file}`;
    let lastChanged = false;
    const changes = [];
    const code = diff.lines.map(line => {
      const changed = line.kind !== 'unchanged';
      const start = changed && !lastChanged;
      if (start) changes.push(line.number);
      lastChanged = changed;
      return `<span class="code-line ${line.kind}"${start ? ' data-change tabindex="-1"' : ''}><span class="line-number" aria-hidden="true">${line.number}</span><span class="line-mark" aria-hidden="true">${changed ? '+' : ' '}</span><span class="line-text">${escape(line.text) || ' '}</span></span>`;
    }).join('\n');
    const removed = diff.removed.length ? `<details class="removed"><summary>${diff.removed.length} línea(s) retiradas de la fase anterior</summary><p>No las copies. Ya están excluidas del archivo completo.</p><pre>${diff.removed.map(x => `${x.number}: ${escape(x.text)}`).join('\n')}</pre></details>` : '';
    const card = `<article class="code-card" id="${id}" data-source="${url}">
      <header><div><span class="file-state">${same ? 'Sin cambios · recuperación' : previous ? 'Reemplazar todo el archivo' : 'Crear o reemplazar archivo'}</span><h4>${file}</h4></div>
      <div class="file-actions"><button type="button" data-copy-url="${url}">Copiar archivo completo</button><a href="${url}" download>Descargar</a></div></header>
      <p class="copy-status" role="status"></p>
      <div class="code-tools"><span>${diff.lines.length} líneas · ${same ? 'igual a la fase anterior' : index === 0 ? 'archivo inicial' : `${changes.length} bloque(s) con cambios`}</span>${changes.length && previous ? '<button type="button" class="secondary" data-next-change>Ir al siguiente cambio</button>' : ''}</div>
      ${!same && previous ? '<p class="legend">Las líneas con <b>+</b> y fondo violeta son nuevas o modificadas. Copia el archivo completo, no solo esas líneas.</p>' : ''}
      ${diff.finalNewlineChanged ? '<p class="legend">También cambió el salto de línea al final del archivo.</p>' : ''}
      <pre class="code-panel" tabindex="0" aria-label="Archivo completo ${file}"><code>${code}</code></pre>${removed}
      ${file.endsWith('config.local.js') ? '<p class="warning">Reemplaza TU_API_KEY por tu clave. Este archivo se conserva en todas las fases posteriores. No lo publiques ni lo proyectes con tu clave real.</p>' : ''}
    </article>`;
    (same ? unchanged : cards).push(card);
  }
  const states = await Promise.all(filesForStage.map(async file => `<li><code>${file}</code><span>${!previous ? 'Crear / reemplazar' : await load(previous, file) === await load(stage, file) ? 'Sin cambios' : 'Reemplazar completo'}</span></li>`));
  return `<ul class="file-map">${states.join('')}<li><code>www/js/config.local.js</code><span>${index === 0 ? 'Crear una vez' : 'Conservar tu clave'}</span></li></ul>${cards.join('\n')}${unchanged.length ? `<details class="recovery"><summary>Archivos sin cambios · abrir solo si necesitas recuperar esta fase</summary>${unchanged.join('\n')}</details>` : ''}`;
}

await rm(dist, { recursive: true, force: true });
await cp(source, dist, { recursive: true, filter: path => !path.includes(`${source}/vendor`) });
await cp(join(root, 'node_modules/reveal.js/dist'), join(dist, 'vendor/reveal'), { recursive: true });
await mkdir(join(dist, 'pdf'), { recursive: true });
await writeFile(join(dist, '.nojekyll'), '');
await writeFile(join(dist, 'build.json'), JSON.stringify({ source: process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), generatedAt: new Date().toISOString() }, null, 2));
let guide = await readFile(join(source, 'guia/index.html'), 'utf8');
for (const [index, stage] of stageNames.entries()) {
  const marker = `<!-- files:${stage} -->`;
  if (!guide.includes(marker)) throw new Error(`Falta ${marker}`);
  guide = guide.replace(marker, await stageCards(stage, index));
}
await writeFile(join(dist, 'guia/index.html'), guide);
// Las fuentes históricas se conservan; sus rutas públicas apuntan al taller vigente.
for (const [path, target] of [['manual/index.html', '../guia/index.html#entorno'], ['slides/instalacion.html', '../guia/index.html#entorno'], ['hoja-exposicion/index.html', '../exposicion/index.html#guion']]) {
  await mkdir(join(dist, path, '..'), { recursive: true });
  await writeFile(join(dist, path), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${target}"><title>Material actualizado · QueVer</title></head><body><p>Este material se integró al taller Android. <a href="${target}">Abrir la versión vigente</a>.</p></body></html>`);
}
console.log('Sitio generado: práctica Android, exposición y guion; archivos completos por fase.');
