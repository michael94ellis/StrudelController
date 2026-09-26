import {
  MOTIFS,
  PROGRESSIONS,
  ROOTS,
  SCALES,
  clamp,
} from './theory.js';

export const LAYER_IDS = ['drone', 'pad', 'melody', 'shimmer', 'pulse', 'texture'];

export const MOOD_IDS = ['sleep', 'meditation', 'focus', 'relax'];

export const TRACK_LENGTHS = [30, 45, 60, 90, 120];

export const GAIN_CAP = {
  drone: 0.7,
  pad: 0.55,
  melody: 0.5,
  shimmer: 0.28,
  pulse: 0.4,
  texture: 0.22,
};

export const MOTIONS = [
  { id: 'still', label: 'Still' },
  { id: 'breathe', label: 'Breathe' },
  { id: 'drift', label: 'Drift' },
];

export const LAYER_INFO = {
  drone: {
    name: 'Bed',
    hint: 'A quiet pedal under everything',
    voices: [
      { id: 'pure', label: 'Sine' },
      { id: 'warm', label: 'Triangle' },
    ],
  },
  pad: {
    name: 'Pad',
    hint: 'Slow, soft chords',
    voices: [
      { id: 'warm', label: 'Warm' },
      { id: 'choir', label: 'Choir' },
      { id: 'haze', label: 'Haze' },
    ],
  },
  melody: {
    name: 'Piano',
    hint: 'Felt piano, mostly rests',
    voices: [
      { id: 'felt', label: 'Felt' },
      { id: 'soft', label: 'Soft' },
      { id: 'box', label: 'Music box' },
    ],
  },
  shimmer: {
    name: 'Glow',
    hint: 'A few high notes, very quiet',
    voices: [{ id: 'harmonic', label: 'Soft sine' }],
  },
  pulse: {
    name: 'Harp',
    hint: 'Sparse plucks, not a beat',
    voices: [
      { id: 'harp', label: 'Harp' },
      { id: 'bowl', label: 'Bowl' },
    ],
  },
  texture: {
    name: 'Air',
    hint: 'Soft noise. Keep it barely there.',
    voices: [
      { id: 'air', label: 'Air' },
      { id: 'mist', label: 'Mist' },
    ],
  },
};

const OFF = () => Object.fromEntries(LAYER_IDS.map((id) => [id, false]));

export function baseLayers() {
  return {
    drone: layer({ voice: 'pure', motion: 'breathe', gain: 0.48, lpf: 220, room: 0.78, delay: 0.04, release: 6, slow: 8 }),
    pad: layer({ voice: 'warm', motion: 'breathe', gain: 0.38, lpf: 720, room: 0.8, delay: 0.16, release: 5, slow: 2 }),
    melody: layer({ voice: 'felt', motion: 'still', gain: 0.34, lpf: 1400, room: 0.62, delay: 0.22, release: 2.4, slow: 3, sparsity: 0.55 }),
    shimmer: layer({ voice: 'harmonic', motion: 'drift', gain: 0.14, lpf: 2400, room: 0.86, delay: 0.2, release: 3.2, slow: 4, sparsity: 0.45 }),
    pulse: layer({ enabled: false, voice: 'harp', motion: 'still', gain: 0.24, lpf: 1600, room: 0.7, delay: 0.18, release: 2.2, slow: 4, sparsity: 0.4 }),
    texture: layer({ voice: 'air', motion: 'breathe', gain: 0.12, lpf: 2200, room: 0.88, delay: 0.05, release: 2.4, slow: 2, sparsity: 0.2 }),
  };
}

function layer(patch) {
  return {
    enabled: true,
    solo: false,
    voice: 'pure',
    motion: 'still',
    gain: 0.08,
    lpf: 800,
    room: 0.7,
    delay: 0,
    release: 3,
    slow: 2,
    sparsity: 0,
    ...patch,
  };
}

function section(index, spec) {
  const slug = String(spec.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 12);
  return {
    id: `sec-${index}-${slug || index}`,
    name: spec.name,
    cycles: spec.cycles,
    level: spec.level ?? 0.8,
    space: spec.space ?? 0.08,
    layers: { ...OFF(), ...spec.layers },
  };
}

export function createPiece(spec) {
  const layers = baseLayers();
  for (const id of LAYER_IDS) {
    if (spec.layers?.[id]) Object.assign(layers[id], spec.layers[id]);
  }
  return {
    version: 2,
    title: spec.title,
    bpm: spec.bpm,
    root: spec.root,
    scale: spec.scale,
    progression: spec.progression,
    motif: spec.motif,
    master: spec.master ?? 0.75,
    view: spec.view === 'loop' ? 'loop' : 'track',
    mood: MOOD_IDS.includes(spec.mood) ? spec.mood : 'relax',
    targetSeconds: TRACK_LENGTHS.includes(spec.targetSeconds) ? spec.targetSeconds : 60,
    presetId: null,
    layers,
    sections: spec.sections.map((item, index) => section(index, item)),
  };
}

export function nudge(state) {
  const next = structuredClone(state);
  for (const id of LAYER_IDS) {
    const item = next.layers[id];
    item.lpf = clamp(Math.round(item.lpf * (0.9 + Math.random() * 0.2)), 120, 3200);
    item.room = clamp(item.room + (Math.random() - 0.4) * 0.06, 0.45, 0.95);
    item.delay = clamp(item.delay + (Math.random() - 0.5) * 0.04, 0, 0.28);
    item.gain = clamp(item.gain * (0.9 + Math.random() * 0.12), 0.015, GAIN_CAP[id]);
  }
  next.master = clamp(next.master, 0.7, 1);
  return next;
}

function pickNum(value, fallback, min, max) {
  const x = Number(value);
  if (!Number.isFinite(x)) return fallback;
  return clamp(x, min, max);
}

function fallbackPiece() {
  return createPiece({
    title: 'Soft Room',
    bpm: 48,
    root: 'C',
    scale: 'major',
    progression: 'fifths',
    motif: 'sparse',
    master: 1,
    mood: 'relax',
    targetSeconds: 60,
    view: 'track',
    layers: {},
    sections: [
      { name: 'Arrive', cycles: 3, level: 0.7, space: 0.12, layers: { drone: true, texture: true } },
      { name: 'Open', cycles: 4, level: 0.82, space: 0.08, layers: { drone: true, pad: true, melody: true, texture: true } },
      { name: 'Settle', cycles: 4, level: 0.78, space: 0.1, layers: { pad: true, melody: true, texture: true } },
      { name: 'Return', cycles: 3, level: 0.68, space: 0.14, layers: { drone: true, texture: true } },
    ],
  });
}

export function normalize(raw) {
  const next = fallbackPiece();
  if (!raw || typeof raw !== 'object') return next;

  next.title = String(raw.title || next.title).slice(0, 48);
  next.bpm = Math.round(pickNum(raw.bpm, next.bpm, 36, 72));
  next.root = ROOTS.includes(raw.root) ? raw.root : next.root;
  next.scale = SCALES[raw.scale] ? raw.scale : next.scale;
  next.progression = PROGRESSIONS[raw.progression] ? raw.progression : next.progression;
  next.motif = MOTIFS[raw.motif] ? raw.motif : next.motif;
  next.master = pickNum(raw.master, 1, 0.5, 1);
  next.view = raw.view === 'loop' ? 'loop' : 'track';
  next.mood = MOOD_IDS.includes(raw.mood) ? raw.mood : 'relax';
  next.targetSeconds = TRACK_LENGTHS.includes(Number(raw.targetSeconds)) ? Number(raw.targetSeconds) : 60;

  for (const id of LAYER_IDS) {
    const incoming = raw.layers?.[id];
    if (!incoming) continue;
    const voices = LAYER_INFO[id].voices;
    next.layers[id] = {
      ...next.layers[id],
      enabled: Boolean(incoming.enabled),
      solo: false,
      voice: voices.some((voice) => voice.id === incoming.voice) ? incoming.voice : next.layers[id].voice,
      motion: MOTIONS.some((motion) => motion.id === incoming.motion) ? incoming.motion : next.layers[id].motion,
      gain: pickNum(incoming.gain, next.layers[id].gain, 0, GAIN_CAP[id]),
      lpf: pickNum(incoming.lpf, next.layers[id].lpf, 80, 4000),
      room: pickNum(incoming.room, next.layers[id].room, 0.3, 0.95),
      delay: pickNum(incoming.delay, next.layers[id].delay, 0, 0.35),
      release: pickNum(incoming.release, next.layers[id].release, 0.4, 8),
      slow: Math.round(pickNum(incoming.slow, next.layers[id].slow, 1, 16)),
      sparsity: pickNum(incoming.sparsity, next.layers[id].sparsity, 0, 0.85),
    };
  }

  if (Array.isArray(raw.sections) && raw.sections.length) {
    next.sections = raw.sections.slice(0, 8).map((item, index) => ({
      id: String(item?.id || `sec-${index}`).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 24) || `sec-${index}`,
      name: String(item?.name || `Section ${index + 1}`).slice(0, 32),
      cycles: Math.round(pickNum(item?.cycles, 4, 1, 48)),
      level: pickNum(item?.level, 0.8, 0.4, 1),
      space: pickNum(item?.space, 0.08, -0.2, 0.3),
      layers: Object.fromEntries(LAYER_IDS.map((id) => [id, Boolean(item?.layers?.[id])])),
    }));
  }

  next.version = 2;
  return next;
}

export function exportPiece(state) {
  const pieceState = structuredClone(state);
  for (const id of LAYER_IDS) pieceState.layers[id].solo = false;
  pieceState.version = 2;
  return pieceState;
}
