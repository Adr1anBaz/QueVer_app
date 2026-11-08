import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { startSite } from './site-server.mjs';
const { server, url } = await startSite();
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${url}guia/index.html`, { waitUntil: 'networkidle' });
  const phases = page.locator('details.lesson');
  assert.equal(await phases.count(), 6);
  for (const phase of await phases.all()) {
    await phase.locator(':scope > summary').click();
    for (const recovery of await phase.locator('details.recovery').all()) await recovery.locator(':scope > summary').click();
    for (const card of await phase.locator('.code-card').all()) {
      const resource = await card.getAttribute('data-source');
      const expected = await (await context.request.get(`${url}guia/${resource}`)).text();
      await card.getByRole('button', { name: 'Copiar archivo completo', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('.copy-status').length > 0);
      await page.waitForFunction(expected => navigator.clipboard.readText().then(text => text === expected), expected);
      const next = card.locator('[data-next-change]');
      if (await next.count()) { await next.click(); assert.ok(await card.locator('[data-change]:focus').count()); }
    }
    await phase.locator(':scope > summary').click();
  }
  await page.goto(`${url}guia/index.html#busqueda`);
  await page.waitForFunction(() => document.getElementById('busqueda').open);
  assert.equal(await page.locator('#aleatorio').getAttribute('open'), null);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#busqueda .file-actions a').first().click();
  assert.ok((await downloadPromise).suggestedFilename());
  await page.route('**/checkpoints/02-busqueda/www/index.html', route => route.fulfill({ status: 503, body: 'No disponible' }));
  await page.locator('#busqueda .code-card').first().getByRole('button', { name: 'Copiar archivo completo' }).click();
  await page.locator('#busqueda .copy-status').first().filter({ hasText: 'No se pudo copiar' }).waitFor();
  await page.unrouteAll();
  await mkdir('test-results', { recursive: true });
  for (const [width, height] of [[375, 812], [768, 1024], [1280, 720], [1440, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const path of ['index.html', 'guia/index.html#busqueda', 'exposicion/index.html']) {
      await page.goto(url + path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, `${path}: desbordamiento a ${width}px`);
      if (width === 1280) await page.screenshot({ path: `test-results/${path.split('/')[0]}-${width}.png` });
    }
  }
  await page.goto(`${url}slides/teoria.html`);
  await page.waitForSelector('.reveal.ready');
  assert.ok(await page.locator('.slides > section').count() >= 10);
  assert.deepEqual(errors, []);
  console.log('E2E: copia exacta de todos los archivos, descargas, error de copia, enlaces de fases, responsive y slides correctos.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
