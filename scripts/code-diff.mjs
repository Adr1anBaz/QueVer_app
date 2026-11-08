const split = text => text ? text.replace(/\n$/, '').split('\n') : [];

// LCS conserva alineadas las líneas existentes aunque se inserten otras antes.
export function diffLines(previous, current) {
  const old = split(previous), next = split(current);
  const table = Array.from({ length: old.length + 1 }, () => new Uint32Array(next.length + 1));
  for (let i = old.length - 1; i >= 0; i--) {
    for (let j = next.length - 1; j >= 0; j--) {
      table[i][j] = old[i] === next[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const lines = [], removed = [];
  let i = 0, j = 0;
  while (i < old.length || j < next.length) {
    if (i < old.length && j < next.length && old[i] === next[j]) {
      lines.push({ text: next[j], number: j + 1, kind: 'unchanged' }); i++; j++;
    } else {
      const deleted = [], added = [];
      while ((i < old.length || j < next.length) && !(i < old.length && j < next.length && old[i] === next[j])) {
        if (i < old.length && (j === next.length || table[i + 1][j] >= table[i][j + 1])) {
          deleted.push({ text: old[i], number: i + 1 }); i++;
        } else {
          added.push({ text: next[j], number: j + 1 }); j++;
        }
      }
      removed.push(...deleted);
      lines.push(...added.map(line => ({ ...line, kind: deleted.length ? 'modified' : 'added' })));
    }
  }
  return { lines, removed, finalNewlineChanged: previous !== undefined && previous.endsWith('\n') !== current.endsWith('\n') };
}
