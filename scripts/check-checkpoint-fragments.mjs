import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const stageNames = ['01-datos', '02-busqueda', '03-guardado', '04-catalogo', '05-edicion', '06-aleatorio'];
export const filesForStage = ['config.xml', 'www/index.html', 'www/css/index.css', 'www/js/db.js', 'www/js/index.js'];
const checkpointFiles = [...filesForStage, 'www/js/config.local.js'];
const checkpoints = join(root, 'src', 'guia', 'checkpoints');

export function functionsIn(source) {
  const starts = [...source.matchAll(/^(?:async )?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)];
  return starts.map((match, index) => ({
    name: match[1],
    start: match.index,
    end: index + 1 < starts.length ? starts[index + 1].index : source.length,
    text: source.slice(match.index, index + 1 < starts.length ? starts[index + 1].index : source.length),
  }));
}

export function functionOperations(previous, next) {
  const oldFunctions = new Map(functionsIn(previous).map((item) => [item.name, item]));
  const newFunctions = functionsIn(next);
  const removed = functionsIn(previous).filter((item) => !newFunctions.some((nextItem) => nextItem.name === item.name));
  let replacementIndex = 0;
  const operations = [];
  const previousPrefix = previous.slice(0, functionsIn(previous)[0]?.start ?? 0);
  const nextPrefix = next.slice(0, newFunctions[0]?.start ?? 0);
  if (nextPrefix.startsWith(previousPrefix) && nextPrefix.length > previousPrefix.length) {
    operations.push({
      type: 'AGREGAR DESPUÉS DE',
      name: null,
      anchor: previousPrefix.trimEnd().split('\n').at(-1),
      content: nextPrefix.slice(previousPrefix.length),
      topLevel: true,
      previousPrefix,
      nextPrefix,
    });
  }
  for (const [index, item] of newFunctions.entries()) {
    if (oldFunctions.get(item.name)?.text === item.text) continue;
    const replacement = !oldFunctions.has(item.name) ? removed[replacementIndex++] : null;
    operations.push({
      type: oldFunctions.has(item.name) || replacement ? 'REEMPLAZAR FUNCIÓN' : 'AGREGAR DESPUÉS DE',
      name: replacement?.name ?? item.name,
      anchor: oldFunctions.has(item.name) || replacement ? null : newFunctions[index - 1]?.name ?? null,
      anchorText: oldFunctions.has(item.name) || replacement ? null : newFunctions[index - 1]?.text.split('\n')[0].trim() ?? null,
      content: item.text,
    });
  }
  return operations;
}

export function applyFunctionOperations(previous, operations) {
  let output = previous;
  for (const operation of operations) {
    if (operation.topLevel) {
      output = operation.nextPrefix + output.slice(operation.previousPrefix.length);
      continue;
    }
    const known = new Map(functionsIn(output).map((item) => [item.name, item]));
    if (operation.type === 'REEMPLAZAR FUNCIÓN') {
      const target = known.get(operation.name);
      if (!target) throw new Error(`No existe la función ${operation.name}`);
      output = output.slice(0, target.start) + operation.content + output.slice(target.end);
    } else {
      const anchor = known.get(operation.anchor);
      if (!anchor) throw new Error(`No existe el ancla ${operation.anchor}`);
      output = output.slice(0, anchor.end) + operation.content + output.slice(anchor.end);
    }
  }
  return output;
}

export async function transition(stage) {
  const index = stageNames.indexOf(stage);
  if (index < 1) throw new Error(`No hay transición previa para ${stage}`);
  const previousStage = stageNames[index - 1];
  const previous = await readFile(join(checkpoints, previousStage, 'www/js/index.js'), 'utf8');
  const next = await readFile(join(checkpoints, stage, 'www/js/index.js'), 'utf8');
  const operations = functionOperations(previous, next);
  return { previousStage, stage, previous, next, operations };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let failures = 0;
  for (const stage of stageNames.slice(1)) {
    const { previousStage, next, operations, previous } = await transition(stage);
    const reconstructed = new Map();
    for (const file of checkpointFiles) {
      const before = await readFile(join(checkpoints, previousStage, file), 'utf8');
      const after = await readFile(join(checkpoints, stage, file), 'utf8');
      reconstructed.set(file, file === 'www/js/index.js'
        ? applyFunctionOperations(previous, operations)
        : (before === after ? before : after));
    }
    const comparisons = await Promise.all([...reconstructed].map(async ([file, value]) => value === await readFile(join(checkpoints, stage, file), 'utf8')));
    const exact = comparisons.every(Boolean);
    console.log(`${previousStage} -> ${stage}: ${operations.length} fragmentos y archivos complementarios, ${exact ? 'exacto' : 'falló'}`);
    if (!exact) failures += 1;
  }
  if (failures) process.exitCode = 1;
}
