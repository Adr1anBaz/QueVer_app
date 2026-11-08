import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { stageNames, filesForStage } from './checkpoints.mjs';

for (const [index, stage] of stageNames.entries()) {
  const base = new URL(`../src/guia/checkpoints/${stage}/`, import.meta.url);
  for (const file of [...filesForStage, 'www/js/config.local.js']) {
    const url = new URL(file, base);
    const text = await readFile(url, 'utf8');
    if (file.endsWith('.js')) assert.equal(spawnSync(process.execPath, ['--check', url.pathname]).status, 0, `${stage}/${file}: sintaxis`);
    if (file.endsWith('config.local.js')) assert.equal(text.trim(), 'const OMDB_API_KEY = "TU_API_KEY";', 'La plantilla no debe incluir una clave real');
    if (index < 2 && file.endsWith('db.js')) assert.doesNotMatch(text, /function (insertMovie|getMoviesByStatus|updateMovie|deleteMovie)\(/, 'No adelantar CRUD');
    if (index < 4 && file.endsWith('db.js')) assert.doesNotMatch(text, /function (updateMovie|deleteMovie)\(/, 'No adelantar edición');
    if (index < 5 && file.endsWith('index.js')) assert.doesNotMatch(text, /function getRandomMovieFromAPI\(/, 'No adelantar recomendación');
  }
  const html = await readFile(new URL('www/index.html', base), 'utf8');
  for (const [, path] of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) {
    if (path === 'cordova.js' || path.startsWith('https:')) continue;
    await readFile(new URL(`www/${path}`, base));
  }
  console.log(`${stage}: archivos, sintaxis, rutas y progresión correctos`);
}
