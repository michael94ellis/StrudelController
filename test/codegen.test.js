import assert from 'node:assert/strict';
import test from 'node:test';
import { compile } from '../src/codegen.js';
import { fitBars, generateTrack, LENGTHS, loopDocument, MOODS } from '../src/generate.js';
import { chordSymbols, formatTime, miniNote, trackSeconds } from '../src/theory.js';

function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HARSH = /s\("(sawtooth|square|brown|crackle)"\)/;

test('spells fifths into the right octave', () => {
  assert.equal(miniNote('B', 7, 2), 'f#3');
  assert.equal(miniNote('Bb', 7, 2), 'f3');
  assert.equal(miniNote('Eb', 7, 2), 'bb2');
  assert.equal(miniNote('C', 7, 2), 'g2');
});

test('minor cycle spells a pedal-friendly progression', () => {
  assert.deepEqual(chordSymbols({ root: 'C', scale: 'minor', progression: 'cycle' }), [
    'Cm9',
    'Fm7',
    'Abmaj7',
    'Ebmaj7',
  ]);
});

test('every mood and length is a short looping track', () => {
  for (const mood of MOODS) {
    for (const length of LENGTHS) {
      for (let seed = 1; seed <= 4; seed += 1) {
        const piece = generateTrack(mood.id, length.seconds, mulberry32(seed * 17 + length.seconds));
        const seconds = trackSeconds(piece);
        assert.ok(seconds >= 30 && seconds <= 120, `${mood.id} ${length.label} lasted ${seconds}s`);
        const code = compile(piece, 'track');
        assert.match(code, /arrange\(/);
        assert.match(code, /const bed = /);
        assert.equal(HARSH.test(code), false, code);
        assert.equal(code.includes('undefined'), false);
        assert.equal(code.includes('NaN'), false);
        const arrive = piece.sections[0];
        const ret = piece.sections.at(-1);
        assert.equal(arrive.layers.melody, false);
        assert.equal(ret.layers.melody, false);
        assert.equal(arrive.layers.drone, true);
        assert.equal(ret.layers.drone, true);
        if (mood.id === 'sleep') {
          assert.equal(piece.sections.some((section) => section.layers.pulse), false);
        }
      }
    }
  }
});

test('fitBars stays inside half a minute to two minutes', () => {
  for (const bpm of [36, 48, 64, 72]) {
    for (const seconds of [30, 45, 60, 90, 120]) {
      const bars = fitBars(seconds, bpm);
      const duration = (bars * 240) / bpm;
      assert.ok(duration >= 30 && duration <= 120, `${bpm} bpm ${seconds}s -> ${duration}`);
    }
  }
});

test('download page embeds the looping score', () => {
  const piece = generateTrack('meditation', 45, mulberry32(3));
  const code = compile(piece, 'track');
  const html = loopDocument({
    title: piece.title,
    code,
    mood: 'Meditation',
    secondsLabel: formatTime(trackSeconds(piece)),
  });
  assert.match(html, /arrange\(/);
  assert.match(html, /@strudel\/web@1\.3\.0/);
  assert.match(html, new RegExp(piece.title));
  assert.equal(html.includes('hush()'), true);
});

test('titles cannot break out of the score comment', () => {
  const state = generateTrack('relax', 60, mulberry32(9));
  state.title = 'Hello\nhush()';
  const code = compile(state, 'track');
  const live = code.split('\n').filter((line) => line.trim() && !line.trim().startsWith('//'));
  assert.equal(live.some((line) => line.includes('hush')), false);
});

test('open fifths skip the chord dictionary', () => {
  const state = generateTrack('focus', 60, mulberry32(4));
  state.progression = 'fifths';
  const code = compile(state, 'track');
  assert.match(code, /const pad = note\("/);
  assert.equal(code.includes('.voicing()'), false);
});
