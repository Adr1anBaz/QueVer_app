import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffLines } from './code-diff.mjs';

test('sin diferencias no hay marcas', () => {
  assert.deepEqual(diffLines('a\nb\n', 'a\nb\n').lines.map(x => x.kind), ['unchanged', 'unchanged']);
});
test('insertar no marca las líneas que siguen', () => {
  assert.deepEqual(diffLines('a\nb\nc', 'a\nx\nb\nc').lines.map(x => x.kind), ['unchanged', 'added', 'unchanged', 'unchanged']);
});
test('modificación y eliminación localizadas', () => {
  const result = diffLines('a\nb\nc', 'a\nx\nc');
  assert.equal(result.lines[1].kind, 'modified');
  assert.deepEqual(result.removed.map(x => x.text), ['b']);
  assert.deepEqual(diffLines('a\nb\nc', 'a\nc').lines.map(x => x.text), ['a', 'c']);
});
test('repeticiones, nuevo, vacío, caracteres y salto final', () => {
  assert.equal(diffLines('a\na\nb', 'a\nx\na\nb').lines.filter(x => x.kind !== 'unchanged').length, 1);
  assert.equal(diffLines(undefined, 'á <b> &\n').lines[0].text, 'á <b> &');
  assert.equal(diffLines('a', '').lines.length, 0);
  assert.equal(diffLines('a', 'a\n').finalNewlineChanged, true);
});
