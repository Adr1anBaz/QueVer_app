import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filesForStage, functionOperations, stageNames, transition } from './check-checkpoint-fragments.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = join(root, 'src');
const dist = join(root, 'dist');
const revealSource = join(root, 'node_modules', 'reveal.js', 'dist');
const revealTarget = join(dist, 'vendor', 'reveal');
const checkpoints = join(source, 'guia', 'checkpoints');
const guideSource = join(source, 'guia', 'index.html');
const guideTarget = join(dist, 'guia', 'index.html');

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function linesWithHighlights(content, previousContent) {
  const endsWithLineFeed = content.endsWith('\n');
  const lines = content.replace(/\n$/, '').split('\n');
  const oldLines = previousContent?.replace(/\n$/, '').split('\n') ?? [];
  return lines.map((line, index) => {
    const changed = oldLines[index] !== line;
    return `<span class="code-line${changed ? ' linea-nueva' : ''}"${changed ? ' data-label="Nueva"' : ''}>${escapeHtml(line)}</span>`;
  }).join('\n') + (endsWithLineFeed ? '\n' : '');
}

function card({ action, path, content, previousContent, copyUrl, copyId, label, collapsible = false }) {
  const buttons = copyUrl
    ? `<button type="button" class="copy-button" data-copy-url="${copyUrl}">Copiar</button><button type="button" class="copy-button copy-button--file" data-copy-url="${copyUrl}">Copiar archivo completo</button>`
    : `<button type="button" class="copy-button" data-copy-inline="${copyId}">Copiar</button>`;
  const title = label ? `${action} ${label}` : action;
  const body = `<article class="code-card">
  <header class="code-card__header"><div><span class="code-action">${escapeHtml(title)}</span><p class="code-path">${escapeHtml(path)}</p></div><div class="code-actions">${buttons}</div></header>
  <p class="copy-status" aria-live="polite" aria-atomic="true"></p>
  <p class="copy-fallback">Si el botón no funciona, selecciona solo el texto del panel y cópialo manualmente.</p>
  <pre class="code-panel" tabindex="0" aria-label="Código de ${escapeHtml(path)}"><code class="code-source"${copyId ? ` id="${copyId}"` : ''}>${linesWithHighlights(content, previousContent)}</code></pre>
</article>`;
  return collapsible ? `<details class="archivo-completo">${body}</details>` : body;
}

async function fileCard(stage, file, previousStage, collapsible = false) {
  const content = await readFile(join(checkpoints, stage, file), 'utf8');
  const previousContent = previousStage ? await readFile(join(checkpoints, previousStage, file), 'utf8').catch(() => undefined) : undefined;
  return card({
    action: previousStage ? 'REEMPLAZAR ARCHIVO' : 'CREAR ARCHIVO',
    path: file,
    content,
    previousContent,
    copyUrl: `checkpoints/${stage}/${file}`,
    collapsible,
  });
}

async function functionCards(stage, previousStage) {
  const previous = await readFile(join(checkpoints, previousStage, 'www/js/index.js'), 'utf8');
  const next = await readFile(join(checkpoints, stage, 'www/js/index.js'), 'utf8');
  const operations = functionOperations(previous, next);
  return operations.map((operation, index) => card({
    action: operation.type,
    label: operation.type === 'REEMPLAZAR FUNCIÓN' ? operation.name : `<${operation.topLevel ? operation.anchor : operation.anchorText}>`,
    path: 'www/js/index.js',
    content: operation.content,
    copyId: `fragment-${stage}-${index}`,
  })).join('\n');
}

async function stageCards(stage) {
  const position = stageNames.indexOf(stage);
  const previousStage = stageNames[position - 1];
  const files = [...filesForStage, ...(stage === '01-datos' ? ['www/js/config.local.js'] : [])];
  let changes = '';
  if (!previousStage) {
    changes = (await Promise.all(files.map((file) => fileCard(stage, file, undefined)))).join('\n');
  } else {
    const fragments = await functionCards(stage, previousStage);
    const nonJsFiles = await Promise.all(filesForStage.filter((file) => file !== 'www/js/index.js').map(async (file) => {
      const before = await readFile(join(checkpoints, previousStage, file), 'utf8').catch(() => undefined);
      const after = await readFile(join(checkpoints, stage, file), 'utf8');
      return before === after ? '' : fileCard(stage, file, previousStage);
    }));
    changes = `${fragments}${nonJsFiles.filter(Boolean).join('\n')}`;
  }
  const fullFiles = (await Promise.all(files.map((file) => fileCard(stage, file, previousStage, true)))).join('\n');
  const optionalTest = `<aside class="prueba-opcional"><strong>Prueba opcional en Browser.</strong> Después de aplicar esta etapa puedes ejecutar <code>cordova run browser</code>. Es una práctica rápida: SQLite no persiste al recargar.</aside>`;
  return `<div class="code-stage__intro"><strong>Aplica primero los cambios</strong><span>Los fragmentos y archivos se generan desde <code>src/guia/checkpoints/${stage}/</code>.</span></div>${changes}${optionalTest}<details class="archivo-completo-etapa"><summary>Archivo completo de la etapa</summary><p>Respaldo acumulativo: usa <strong>Copiar archivo completo</strong> si necesitas recuperar un archivo entero.</p>${fullFiles}</details>`;
}

async function buildGuide() {
  let guide = await readFile(guideSource, 'utf8');
  guide = await Promise.all(stageNames.map(async (stage) => ({ stage, marker: `<div class="code-stage" data-code-stage="${stage}"></div>`, cards: await stageCards(stage) }))).then((stages) => stages.reduce((html, { stage, marker, cards }) => {
    if (!html.includes(marker)) throw new Error(`No se encontró el marcador de ${marker}`);
    return html.replace(marker, `<div class="code-stage" data-code-stage="${stage}">${cards}</div>`);
  }, guide));
  await writeFile(guideTarget, guide);
}

await rm(dist, { recursive: true, force: true });
await cp(source, dist, { recursive: true, filter: (path) => !path.includes(`${source}/vendor`) });
await cp(revealSource, revealTarget, { recursive: true });
await mkdir(join(dist, 'pdf'), { recursive: true });
await writeFile(join(dist, '.nojekyll'), '');
await buildGuide();
console.log('Generado dist/ limpio con código mixto de checkpoints para la guía.');
