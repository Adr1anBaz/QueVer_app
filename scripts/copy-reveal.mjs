import { cp, rm } from 'node:fs/promises';

const source = new URL('../node_modules/reveal.js/dist/', import.meta.url);
const destination = new URL('../src/vendor/reveal/', import.meta.url);

await rm(destination, { force: true, recursive: true });
await cp(source, destination, { recursive: true });
console.log('Reveal copiado en src/vendor/reveal/.');
