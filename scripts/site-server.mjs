import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
export async function startSite() {
  const root = fileURLToPath(new URL('../dist/', import.meta.url));
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.woff2': 'font/woff2' };
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (!pathname.startsWith('/QueVer_app/')) { res.writeHead(404).end(); return; }
      const relative = pathname.slice('/QueVer_app/'.length);
      const file = resolve(root, relative.endsWith('/') || !relative ? `${relative}index.html` : relative);
      if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
      res.writeHead(200, { 'Content-Type': `${mime[extname(file)] || 'text/plain'}; charset=utf-8` }).end(await readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/QueVer_app/` };
}
