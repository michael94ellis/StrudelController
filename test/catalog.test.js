import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCatalog } from '../src/catalog.js';
import { compile } from '../src/codegen.js';

const HARSH = /s\("(sawtooth|square|brown|crackle|pink)"\)|\.fm\(/;

test('the library is ten named ambient songs', () => {
  const tracks = buildCatalog();
  assert.equal(tracks.length, 10);
  const titles = new Set(tracks.map((track) => track.title));
  assert.equal(titles.size, 10);
  for (const track of tracks) {
    assert.ok(track.seconds >= 30 && track.seconds <= 120, track.title);
    const code = compile(track.piece, 'track');
    assert.match(code, /arrange\(/);
    assert.match(code, new RegExp(`// ${track.title}`));
    assert.equal(HARSH.test(code), false, track.title);
    assert.doesNotThrow(() => new Function(code), track.title);
  }
});
