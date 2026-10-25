import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = join(root, 'src');
const dist = join(root, 'dist');
const revealSource = join(root, 'node_modules', 'reveal.js', 'dist');
const revealTarget = join(dist, 'vendor', 'reveal');

await rm(dist, { recursive: true, force: true });
await cp(source, dist, {
  recursive: true,
  filter: (path) => !path.includes(`${source}/vendor`),
});
await cp(revealSource, revealTarget, { recursive: true });
await mkdir(join(dist, 'pdf'), { recursive: true });
await writeFile(join(dist, '.nojekyll'), '');

console.log('Generado dist/ limpio con el sitio estático y Reveal local.');
