import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist');
const basePath = '/QueVer_app/';
const port = Number(process.env.PORT ?? 4173);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  if (!pathname.startsWith(basePath)) {
    response.writeHead(404).end('No encontrado');
    return;
  }

  const relativePath = pathname.slice(basePath.length) || 'index.html';
  const file = normalize(join(dist, relativePath));
  if (!file.startsWith(`${dist}/`)) {
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

server.listen(port, '127.0.0.1', () => {
  console.log(`Sirviendo dist/ en http://127.0.0.1:${port}${basePath}`);
});
