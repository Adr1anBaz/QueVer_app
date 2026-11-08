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
  assert.equal(await page.locator('body.practice-guide').count(), 1);
  assert.match(await page.locator('h1').evaluate(el => getComputedStyle(el).fontFamily), /Georgia/);
  assert.match(await page.locator('#antes h2').evaluate(el => getComputedStyle(el).fontFamily), /Alumni Sans/);
  assert.match(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily), /Albert Sans/);
  assert.equal(await page.locator('h1').textContent(), 'QueVer en Android');
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => document.fonts.check('400 18px "Albert Sans"') && document.fonts.check('500 40px "Alumni Sans"')));
  await page.getByRole('button', { name: 'Ampliar para proyectar' }).click();
  assert.equal(await page.locator('body.projector').count(), 1);
  await page.getByRole('button', { name: 'Vista normal' }).click();
  const phases = page.locator('details.lesson');
  assert.equal(await phases.count(), 6);
  for (const phase of await phases.all()) {
    await phase.locator(':scope > summary').click();
    for (const recovery of await phase.locator('details.recovery').all()) await recovery.locator(':scope > summary').click();
    for (const card of await phase.locator('.code-card').all()) {
      const spacing = await card.locator('.code-panel').evaluate(panel => {
        const lines = panel.querySelectorAll('.code-line');
        return lines.length < 2 ? 0 : lines[1].getBoundingClientRect().top - lines[0].getBoundingClientRect().top - parseFloat(getComputedStyle(lines[0]).lineHeight);
      });
      assert.ok(Math.abs(spacing) < 1, 'El código no debe añadir líneas vacías de presentación');
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
  await page.locator('#busqueda > summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#busqueda').getAttribute('open'), null);
  await page.keyboard.press('Enter');
  assert.notEqual(await page.locator('#busqueda').getAttribute('open'), null);
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
  await page.goto(`${url}exposicion/index.html`);
  assert.match(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily), /Avenir/);
  assert.deepEqual(errors, []);
  console.log('E2E: copia exacta de todos los archivos, descargas, error de copia, enlaces de fases, responsive y slides correctos.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
