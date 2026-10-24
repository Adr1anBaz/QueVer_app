import { mkdir } from 'node:fs/promises';

await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
console.log('Directorio dist listo para los entregables estáticos.');
