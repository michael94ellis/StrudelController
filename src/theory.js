/** Pitch, harmony, and time helpers shared by the score generator and the UI. */

export const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const PITCH = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const SCALES = {
  minor: {
    label: 'Minor',
    strudel: 'minor',
    steps: [0, 2, 3, 5, 7, 8, 10],
    chords: [
      { i: 0, q: 'maj7' },
      { i: 3, q: 'sus2' },
      { i: 5, q: 'maj9' },
      { i: 4, q: 'maj7' },
    ],
  },
  major: {
    label: 'Major',
    strudel: 'major',
    steps: [0, 2, 4, 5, 7, 9, 11],
    chords: [
      { i: 0, q: 'maj9' },
      { i: 3, q: 'maj7' },
      { i: 4, q: 'add9' },
      { i: 1, q: 'sus2' },
    ],
  },
  dorian: {
    label: 'Dorian',
    strudel: 'dorian',
    steps: [0, 2, 3, 5, 7, 9, 10],
    chords: [
      { i: 0, q: 'maj7' },
      { i: 3, q: 'maj9' },
      { i: 5, q: 'sus2' },
      { i: 1, q: 'maj7' },
    ],
  },
  phrygian: {
    label: 'Phrygian',
    strudel: 'phrygian',
    steps: [0, 1, 3, 5, 7, 8, 10],
    chords: [
      { i: 0, q: 'm7' },
      { i: 1, q: 'maj7' },
      { i: 5, q: 'maj7' },
      { i: 3, q: 'm7' },
    ],
  },
  lydian: {
    label: 'Lydian',
    strudel: 'lydian',
    steps: [0, 2, 4, 6, 7, 9, 11],
    chords: [
      { i: 0, q: 'maj7' },
      { i: 1, q: 'maj7' },
      { i: 3, q: 'maj7' },
      { i: 4, q: 'maj7' },
    ],
  },
  mixolydian: {
    label: 'Mixolydian',
    strudel: 'mixolydian',
    steps: [0, 2, 4, 5, 7, 9, 10],
    chords: [
      { i: 0, q: 'maj7' },
      { i: 5, q: 'maj7' },
      { i: 3, q: 'maj7' },
      { i: 1, q: 'm7' },
    ],
  },
  harmonic: {
    label: 'Harmonic minor',
    strudel: 'harmonic:minor',
    steps: [0, 2, 3, 5, 7, 8, 11],
    chords: [
      { i: 0, q: 'm9' },
      { i: 5, q: 'maj7' },
      { i: 3, q: 'm7' },
      { i: 4, q: '7' },
    ],
  },
  pentatonic: {
    label: 'Pentatonic',
    strudel: 'pentatonic',
    steps: [0, 2, 4, 7, 9],
    chords: [
      { i: 0, q: 'sus2' },
      { i: 1, q: 'sus2' },
      { i: 3, q: 'sus2' },
      { i: 4, q: 'sus2' },
    ],
  },
  minorPentatonic: {
    label: 'Minor pentatonic',
    strudel: 'minor:pentatonic',
    steps: [0, 3, 5, 7, 10],
    chords: [
      { i: 0, q: 'm7' },
      { i: 1, q: 'sus2' },
      { i: 2, q: 'sus2' },
      { i: 4, q: 'sus2' },
    ],
  },
};

export const PROGRESSIONS = {
  still: 'Still',
  sway: 'Sway',
  cycle: 'Cycle',
  fifths: 'Fifths',
};

export const MOTIFS = {
  sparse: { label: 'Sparse', pattern: '~ 0 ~ ~ 2 ~ ~ 4 ~' },
  steps: { label: 'Steps', pattern: '~ 0 2 ~ 3 ~ 2 ~ 0 ~' },
  call: { label: 'Call', pattern: '~ 0 ~ 2 ~ 4 ~ ~ 2 ~' },
  wide: { label: 'Wide', pattern: '~ 0 ~ ~ 4 ~ ~ 2 ~' },
  pedal: { label: 'Pedal', pattern: '~ 0 ~ 0 ~ 2 ~ 0 ~' },
};

export function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(max, Math.max(min, x));
}

const FLAT_SCALES = new Set(['minor', 'dorian', 'phrygian', 'harmonic', 'minorPentatonic']);

export function useFlats(root, scale = 'major') {
  if (String(root).includes('b')) return true;
  if (String(root).includes('#')) return false;
  return FLAT_SCALES.has(scale);
}

export function spell(root, semis, scale = 'major') {
  const table = useFlats(root, scale) ? FLAT : SHARP;
  const base = PITCH[root] ?? 0;
  const pc = ((base + semis) % 12 + 12) % 12;
  return table[pc];
}

export function miniNote(root, semis, octave, scale = 'major') {
  const base = PITCH[root] ?? 0;
  const total = base + semis;
  const pc = ((total % 12) + 12) % 12;
  const oct = octave + Math.floor(total / 12);
  const table = useFlats(root, scale) ? FLAT : SHARP;
  return `${table[pc].toLowerCase()}${oct}`;
}

export function progressionDegrees(state) {
  const scale = SCALES[state.scale] ?? SCALES.minor;
  if (state.progression === 'still') return scale.chords.slice(0, 1);
  if (state.progression === 'sway') return scale.chords.slice(0, 2);
  return scale.chords;
}

export function chordSymbols(state) {
  const scale = SCALES[state.scale] ?? SCALES.minor;
  return progressionDegrees(state).map((chord) => {
    const semi = scale.steps[chord.i];
    return `${spell(state.root, semi, state.scale)}${chord.q}`;
  });
}

export function chordMini(state) {
  const symbols = chordSymbols(state);
  if (symbols.length === 1) return symbols[0];
  return `<${symbols.join(' ')}>/4`;
}

export function fifthsMini(state, octave) {
  const scale = SCALES[state.scale] ?? SCALES.minor;
  const pairs = progressionDegrees(state).map((chord) => {
    const semi = scale.steps[chord.i];
    return `[${miniNote(state.root, semi, octave, state.scale)},${miniNote(state.root, semi + 7, octave, state.scale)}]`;
  });
  if (pairs.length === 1) return pairs[0];
  return `<${pairs.join(' ')}>/4`;
}

export function scaleName(state, octave) {
  const scale = SCALES[state.scale] ?? SCALES.minor;
  return `${spell(state.root, 0, state.scale)}${octave}:${scale.strudel}`;
}

export function harmonyLabel(state) {
  if (state.progression === 'fifths') {
    const scale = SCALES[state.scale] ?? SCALES.minor;
    const names = progressionDegrees({ ...state, progression: 'cycle' }).map((chord) =>
      spell(state.root, scale.steps[chord.i], state.scale),
    );
    return `open fifths on ${names.join(' · ')}`;
  }
  return chordSymbols(state).join('  ·  ');
}

/** Seconds in one cycle when a cycle is a 4/4 bar: setcpm(bpm/4). */
export function barSeconds(bpm) {
  return 240 / clamp(bpm, 1, 400);
}

export function trackCycles(state) {
  return (state.sections ?? []).reduce((sum, section) => sum + Number(section.cycles || 0), 0);
}

export function trackSeconds(state) {
  return trackCycles(state) * barSeconds(state.bpm);
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
