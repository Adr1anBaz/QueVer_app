import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = join(root, 'dist', 'pdf');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startStaticServer() {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const file = normalize(join(root, pathname === '/' ? 'src/manual/index.html' : pathname));

    if (!file.startsWith(`${root}/`)) {
      response.writeHead(403).end('Acceso denegado');
      return;
    }

    try {
      const content = await readFile(file);
      response.writeHead(200, { 'Content-Type': mimeTypes[extname(file)] ?? 'application/octet-stream' }).end(content);
    } catch {
      response.writeHead(404).end('No encontrado');
    }
  });

  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => resolveServer(server));
  });
}

async function waitForDocument(page, reveal = false) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.complete
      ? Promise.resolve()
      : new Promise((resolveImage) => {
        image.addEventListener('load', resolveImage, { once: true });
        image.addEventListener('error', resolveImage, { once: true });
      })));
  });
  if (reveal) {
    await page.waitForFunction(() => document.querySelector('.reveal')?.classList.contains('ready'));
  }
}

async function exportPdf(browser, url, filename, options, reveal = false) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await waitForDocument(page, reveal);
    await page.pdf({ path: join(output, filename), printBackground: true, ...options });
    console.log(`Generado dist/pdf/${filename}`);
  } finally {
    await page.close();
  }
}

const server = await startStaticServer();
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await exportPdf(browser, `${baseUrl}/src/manual/index.html`, 'manual.pdf', {
      format: 'A4',
      preferCSSPageSize: true,
    });
    const slideOptions = {
      width: '16in',
      height: '9in',
      margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' },
      preferCSSPageSize: true,
    };
    await exportPdf(browser, `${baseUrl}/src/slides/instalacion.html?print-pdf`, 'instalacion.pdf', slideOptions, true);
    await exportPdf(browser, `${baseUrl}/src/slides/teoria.html?print-pdf`, 'teoria.pdf', slideOptions, true);
  } finally {
    await browser.close();
  }
} finally {
  await new Promise((resolveServer) => server.close(resolveServer));
}
