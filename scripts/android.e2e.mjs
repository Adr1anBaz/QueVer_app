// Prueba opcional: requiere SDK, JDK 17, Cordova y un emulador ya iniciado.
// SQLite es nativo. Las respuestas OMDb son fixtures; no se usa ninguna clave real.
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, cp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { stageNames } from './checkpoints.mjs';

const java = spawnSync('/usr/libexec/java_home', ['-v', '17'], { encoding: 'utf8' });
assert.equal(java.status, 0, 'Se necesita JDK 17');
const env = { ...process.env, JAVA_HOME: java.stdout.trim(), ANDROID_HOME: process.env.ANDROID_HOME || join(process.env.HOME, 'Library/Android/sdk') };
env.PATH = `${env.JAVA_HOME}/bin:${env.ANDROID_HOME}/platform-tools:${env.ANDROID_HOME}/cmdline-tools/latest/bin:${env.PATH}`;
await mkdir(join(tmpdir(), 'opencode'), { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'opencode/quever-native-'));
const app = join(temporary, 'app');
const appId = 'com.ejemplo.quevertaller.validation';
function run(command, args, cwd = app) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 240000, maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}
run('cordova', ['create', 'app', appId, 'QueVerValidation'], temporary);
run('cordova', ['platform', 'add', 'android@15.1.0']);
run('cordova', ['plugin', 'add', 'cordova-sqlite-storage@7.0.0']);
run('cordova', ['requirements', 'android']);
console.log(`Proyecto aislado: ${app}; identificador ${appId}. No reemplaza la app original.`);
const fixture = id => ({ Response: 'True', imdbID: id, Title: id === 'tt0000001' ? 'Inception Taller' : 'Otra Película Taller', Year: '2010', Runtime: '148 min', Genre: 'Sci-Fi', Director: 'Dirección de prueba', Actors: 'Reparto de prueba', Plot: 'Sinopsis de prueba controlada.', Poster: 'N/A', imdbRating: '8.8' });
let browser, page, port;
async function attach() {
  const pid = run('adb', ['shell', 'pidof', appId]).trim();
  port = run('adb', ['forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid}`]);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  page = browser.contexts()[0].pages()[0];
  await page.waitForFunction(() => window.sqlitePlugin && document.getElementById('app-status')?.textContent !== 'Preparando tu catálogo…');
  await page.route('https://www.omdbapi.com/**', route => {
    const url = new URL(route.request().url());
    const body = url.searchParams.has('i') ? fixture(url.searchParams.get('i')) : { Response: 'True', Search: [fixture('tt0000001'), fixture('tt0000002')], totalResults: '2' };
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
}
async function disconnect() {
  if (browser) { await browser.close(); browser = undefined; }
  if (port) run('adb', ['forward', '--remove', `tcp:${port}`]);
}
async function searchDetail(index = 0) {
  await page.locator('#search-input').fill('Inception');
  await page.locator('#search-form').evaluate(form => form.requestSubmit());
  await page.locator('.movie-result').first().waitFor();
  await page.locator('.movie-result').nth(index).getByRole('button', { name: 'Ver detalle' }).click();
  await page.locator('.detail').waitFor();
}
try {
  for (const [index, stage] of stageNames.entries()) {
    await disconnect();
    const src = new URL(`../src/guia/checkpoints/${stage}/`, import.meta.url);
    await cp(new URL('www/', src), join(app, 'www'), { recursive: true, filter: path => index === 0 || !path.endsWith('/config.local.js') });
    if (index === 0) await writeFile(join(app, 'www/js/config.local.js'), 'const OMDB_API_KEY = "fixture-not-a-real-key";\n');
    assert.equal(await readFile(join(app, 'www/js/config.local.js'), 'utf8'), 'const OMDB_API_KEY = "fixture-not-a-real-key";\n', 'La clave se conserva al reemplazar los archivos');
    const config = (await readFile(new URL('config.xml', src), 'utf8')).replace('com.ejemplo.quever', appId);
    await writeFile(join(app, 'config.xml'), config);
    run('cordova', ['run', 'android', '--emulator']);
    await attach();
    if (index === 0) {
      assert.match(await page.locator('#app-status').textContent(), /listo/);
      assert.equal(await page.locator('#search-form').count(), 0);
    }
    if (index === 1) {
      await searchDetail();
      assert.match(await page.locator('.detail').textContent(), /Inception Taller/);
      await page.locator('#search-input').fill('');
      await page.locator('#search-form').evaluate(form => form.requestSubmit());
      await page.waitForFunction(() => document.getElementById('app-status').textContent.includes('Escribe el título'));
    }
    if (index === 2) {
      await searchDetail();
      await page.getByRole('button', { name: 'La quiero ver', exact: true }).click();
      await page.waitForFunction(() => document.getElementById('app-status').textContent.includes('guardada como pendiente'));
      await page.getByRole('button', { name: 'La quiero ver', exact: true }).click();
      await page.waitForFunction(() => document.getElementById('app-status').textContent.includes('ya está'));
      await searchDetail(1);
      await page.getByRole('button', { name: 'Ya la vi', exact: true }).click();
      await page.locator('textarea').fill('Opinión persistente');
      await page.getByRole('button', { name: 'Guardar como vista' }).click();
      await page.waitForFunction(() => document.querySelectorAll('.saved-movie').length === 2);
    }
    if (index >= 3) {
      // Las actualizaciones por fase no deben perder el SQLite de la instalación previa.
      await page.locator('#watched-movies .movie-card').first().waitFor();
      assert.match(await page.locator('#watched-movies').textContent(), /Otra Película Taller/);
    }
    if (index === 3) {
      await page.locator('#pending-movies .movie-card button').first().click();
      assert.match(await page.locator('#results .detail').textContent(), /Inception Taller/);
    }
    if (index === 4) {
      await page.locator('#watched-movies .movie-card button').first().click();
      await page.getByRole('button', { name: 'Editar opinión y calificación' }).click();
      await page.locator('textarea').fill('Opinión editada');
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await page.waitForFunction(() => document.getElementById('app-status').textContent.includes('Cambios guardados'));
      await page.locator('#pending-movies .movie-card button').first().click();
      await page.getByRole('button', { name: 'Marcar como vista', exact: true }).click();
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await page.waitForFunction(() => document.querySelectorAll('#watched-movies .movie-card').length === 2);
      page.once('dialog', dialog => dialog.dismiss());
      await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
      assert.equal(await page.locator('#watched-movies .movie-card').count(), 2);
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('#watched-movies .movie-card').length === 1);
    }
    if (index === 5) {
      await page.getByRole('button', { name: 'Recomiéndame una' }).click();
      await page.locator('.random-modal').waitFor();
      await page.locator('.random-modal').getByRole('button', { name: 'Cerrar', exact: true }).click();
      // Cambiar la fixture para asegurar que se prueba un guardado nuevo, no un duplicado.
      await page.unroute('https://www.omdbapi.com/**');
      await page.route('https://www.omdbapi.com/**', route => {
        const url = new URL(route.request().url());
        const movie = { ...fixture('tt0000003'), Title: 'Recomendación Taller' };
        return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(url.searchParams.has('i') ? movie : { Response: 'True', Search: [movie] }) });
      });
      await page.getByRole('button', { name: 'Recomiéndame una' }).click();
      await page.locator('.random-modal').getByRole('button', { name: 'La quiero ver' }).click();
      await page.locator('#pending-movies .movie-card').first().waitFor();
      assert.match(await page.locator('#watched-movies').textContent(), /Opinión editada/);
      await page.unroute('https://www.omdbapi.com/**');
      await page.route('https://www.omdbapi.com/**', route => route.abort());
      await page.getByRole('button', { name: 'Recomiéndame una' }).click();
      await page.waitForFunction(() => document.getElementById('app-status').textContent.includes('No se pudo cargar'));
      assert.equal(await page.locator('.random-modal').count(), 0);
    }
    console.log(`${stage}: compilación, ejecución y prueba funcional Android correctas (OMDb simulado).`);
  }
  await disconnect();
  run('adb', ['shell', 'am', 'force-stop', appId]);
  run('adb', ['shell', 'monkey', '-p', appId, '1']);
  await attach();
  await page.locator('#pending-movies .movie-card').waitFor();
  assert.match(await page.locator('#watched-movies').textContent(), /Opinión editada/);
  console.log('Reinicio real: datos y opinión editada conservados. API real pendiente de clave personal.');
} finally { await disconnect(); }
