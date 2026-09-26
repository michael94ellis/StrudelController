import { createPiece, LAYER_IDS } from './presets.js';
import { trackSeconds, formatTime } from './theory.js';

export const MOODS = [
  {
    id: 'sleep',
    name: 'Sleep',
    blurb: 'Very quiet. Bed, pad, and air, with the piano visiting only once.',
    bpm: [36, 44],
    scales: ['minor', 'pentatonic', 'minorPentatonic'],
    progressions: ['still', 'fifths'],
    motifs: ['sparse', 'pedal'],
    piano: 'rare',
    harp: false,
    glow: false,
  },
  {
    id: 'meditation',
    name: 'Meditation',
    blurb: 'A still room. Soft piano and a few harp notes, with lots of space.',
    bpm: [40, 48],
    scales: ['major', 'dorian', 'pentatonic', 'minor'],
    progressions: ['still', 'sway', 'fifths'],
    motifs: ['sparse', 'pedal', 'wide'],
    piano: 'some',
    harp: true,
    glow: true,
  },
  {
    id: 'focus',
    name: 'Focus',
    blurb: 'Gentle motion that stays out of the way. Piano and pads, no surprises.',
    bpm: [48, 60],
    scales: ['major', 'lydian', 'pentatonic', 'dorian'],
    progressions: ['sway', 'fifths'],
    motifs: ['sparse', 'pedal'],
    piano: 'steady',
    harp: false,
    glow: true,
  },
  {
    id: 'relax',
    name: 'Relax',
    blurb: 'Warm pads, a quiet piano, and air. Easy to leave running.',
    bpm: [42, 54],
    scales: ['major', 'minor', 'dorian', 'pentatonic', 'minorPentatonic'],
    progressions: ['sway', 'fifths', 'still'],
    motifs: ['sparse', 'pedal', 'wide'],
    piano: 'some',
    harp: true,
    glow: true,
  },
];

export const LENGTHS = [
  { seconds: 30, label: '0:30' },
  { seconds: 45, label: '0:45' },
  { seconds: 60, label: '1:00' },
  { seconds: 90, label: '1:30' },
  { seconds: 120, label: '2:00' },
];

const TITLES = {
  sleep: ['Night Ferry', 'Low Lamp', 'Snow Room', 'Quiet Harbor', 'Slow Tide', 'Dim Hall'],
  meditation: ['Still Water', 'Open Hands', 'Empty Chair', 'Soft Bell', 'Inner Room', 'Unmoved'],
  focus: ['North Light', 'Paper Window', 'Second Hour', 'Clear Desk', 'Even Pace', 'Gentle Task'],
  relax: ['Late Afternoon', 'Warm Glass', 'Garden Wall', 'Unhurried', 'Shade Tree', 'Loose Shoulders'],
};

const ROOTS = ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'];

export function moodById(id) {
  return MOODS.find((mood) => mood.id === id) ?? MOODS[3];
}

export function fitBars(seconds, bpm) {
  const target = Math.min(120, Math.max(30, Number(seconds) || 60));
  const bar = 240 / bpm;
  let bars = Math.max(4, Math.round(target / bar));
  while (bars * bar < 30) bars += 1;
  while (bars > 4 && bars * bar > 120) bars -= 1;
  return bars;
}

function pick(random, list) {
  return list[Math.floor(random() * list.length) % list.length];
}

function between(random, min, max) {
  return min + (max - min) * random();
}

function splitBars(total) {
  const weights = [0.22, 0.34, 0.28, 0.16];
  const raw = weights.map((weight) => Math.max(1, Math.floor(total * weight)));
  let diff = total - raw.reduce((sum, value) => sum + value, 0);
  let index = 0;
  while (diff > 0) {
    raw[index % raw.length] += 1;
    diff -= 1;
    index += 1;
  }
  while (diff < 0) {
    const tall = raw.findIndex((value) => value > 1);
    if (tall < 0) break;
    raw[tall] -= 1;
    diff += 1;
  }
  return raw;
}

function bed(random) {
  return {
    enabled: true,
    voice: random() < 0.5 ? 'pure' : 'warm',
    motion: 'breathe',
    gain: between(random, 0.42, 0.55),
    lpf: Math.round(between(random, 160, 280)),
    room: between(random, 0.72, 0.88),
    delay: between(random, 0, 0.08),
    release: between(random, 5, 7),
    slow: 8,
    sparsity: 0,
  };
}

function pad(random) {
  return {
    enabled: true,
    voice: random() < 0.75 ? 'warm' : 'choir',
    motion: 'breathe',
    gain: between(random, 0.3, 0.42),
    lpf: Math.round(between(random, 480, 900)),
    room: between(random, 0.74, 0.9),
    delay: between(random, 0.08, 0.2),
    release: between(random, 4, 6),
    slow: random() < 0.5 ? 2 : 3,
    sparsity: 0,
  };
}

function piano(random, mood) {
  return {
    enabled: true,
    voice: mood.id === 'focus' && random() < 0.25 ? 'soft' : 'felt',
    motion: 'still',
    gain: between(random, mood.piano === 'steady' ? 0.3 : 0.24, 0.4),
    lpf: Math.round(between(random, 900, 1600)),
    room: between(random, 0.55, 0.75),
    delay: between(random, 0.12, 0.26),
    release: between(random, 2, 3.2),
    slow: mood.piano === 'steady' ? 2 : 3,
    sparsity: between(random, mood.piano === 'steady' ? 0.38 : 0.5, mood.piano === 'steady' ? 0.55 : 0.72),
  };
}

function air(random) {
  return {
    enabled: true,
    voice: random() < 0.6 ? 'air' : 'mist',
    motion: random() < 0.5 ? 'breathe' : 'drift',
    gain: between(random, 0.08, 0.14),
    lpf: Math.round(between(random, 1600, 2600)),
    room: between(random, 0.8, 0.92),
    delay: between(random, 0, 0.08),
    release: between(random, 2, 3),
    slow: 2,
    sparsity: between(random, 0.1, 0.3),
  };
}

function harp(random) {
  return {
    enabled: true,
    voice: random() < 0.6 ? 'harp' : 'bowl',
    motion: 'still',
    gain: between(random, 0.16, 0.26),
    lpf: Math.round(between(random, 1200, 2000)),
    room: between(random, 0.65, 0.82),
    delay: between(random, 0.1, 0.22),
    release: between(random, 1.8, 2.8),
    slow: 4,
    sparsity: between(random, 0.35, 0.55),
  };
}

function glow(random) {
  return {
    enabled: true,
    voice: 'harmonic',
    motion: 'drift',
    gain: between(random, 0.08, 0.14),
    lpf: Math.round(between(random, 1800, 2800)),
    room: between(random, 0.8, 0.92),
    delay: between(random, 0.12, 0.24),
    release: between(random, 2.6, 4),
    slow: 4,
    sparsity: between(random, 0.4, 0.6),
  };
}

export function generateTrack(moodId = 'relax', seconds = 60, random = Math.random) {
  const mood = moodById(moodId);
  const bpm = Math.round(between(random, mood.bpm[0], mood.bpm[1]));
  const total = fitBars(seconds, bpm);
  const [arriveBars, openBars, settleBars, returnBars] = splitBars(total);
  const arriveLevel = between(random, 0.9, 1);
  const arriveSpace = between(random, 0.1, 0.16);
  const pianoOn = { drone: true, pad: true, melody: true, texture: true };
  const openLayers =
    mood.piano === 'rare'
      ? { drone: true, pad: true, texture: true }
      : { ...pianoOn };
  const settleLayers = {
    pad: true,
    melody: true,
    texture: true,
    shimmer: mood.glow,
    pulse: mood.harp,
  };

  const piece = createPiece({
    title: pick(random, TITLES[mood.id]),
    bpm,
    root: pick(random, ROOTS),
    scale: pick(random, mood.scales),
    progression: pick(random, mood.progressions),
    motif: pick(random, mood.motifs),
    master: 1,
    mood: mood.id,
    targetSeconds: LENGTHS.some((item) => item.seconds === Number(seconds)) ? Number(seconds) : 60,
    view: 'track',
    layers: {
      drone: bed(random),
      pad: pad(random),
      melody: piano(random, mood),
      shimmer: glow(random),
      pulse: harp(random),
      texture: air(random),
    },
    sections: [
      { name: 'Arrive', cycles: arriveBars, level: arriveLevel, space: arriveSpace, layers: { drone: true, texture: true } },
      { name: 'Open', cycles: openBars, level: 1, space: between(random, 0.06, 0.12), layers: openLayers },
      { name: 'Settle', cycles: settleBars, level: 1, space: between(random, 0.08, 0.14), layers: settleLayers },
      { name: 'Return', cycles: returnBars, level: arriveLevel, space: arriveSpace, layers: { drone: true, texture: true } },
    ],
  });

  for (const id of LAYER_IDS) {
    piece.layers[id].enabled = piece.sections.some((section) => section.layers[id]);
  }
  return piece;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function loopDocument({ title, code, mood, secondsLabel }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #141816; color: #e7ecdf; font-family: Palatino, Georgia, serif; }
    main { width: min(640px, calc(100% - 32px)); }
    p { color: #9aab9f; }
    button { font: 16px/1.2 "Avenir Next", sans-serif; margin: 0 8px 0 0; padding: 10px 16px; border-radius: 999px; border: 0; background: #e7ecdf; color: #17201b; cursor: pointer; }
    button.ghost { background: transparent; color: #e7ecdf; border: 1px solid rgba(231,236,223,.35); }
    pre { white-space: pre-wrap; color: #e0b15a; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(mood)} · ${escapeHtml(secondsLabel)} · this track loops until you stop it</p>
    <button id="play" type="button">Play loop</button>
    <button id="stop" class="ghost" type="button">Stop</button>
    <pre id="err"></pre>
  </main>
  <script type="module">
    import { initStrudel, evaluate, hush } from 'https://cdn.jsdelivr.net/npm/@strudel/web@1.3.0/dist/index.mjs';
    const code = ${JSON.stringify(code)};
    const err = document.querySelector('#err');
    await initStrudel();
    document.querySelector('#play').onclick = () => {
      err.textContent = '';
      Promise.resolve(evaluate(code)).catch((error) => {
        err.textContent = error?.message || String(error);
      });
    };
    document.querySelector('#stop').onclick = () => hush();
  </script>
</body>
</html>
`;
}

export function loopFilename(state) {
  const slug = String(state.title || 'strudelcontroller')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const label = formatTime(trackSeconds(state)).replace(':', 'm');
  return `${slug || 'strudelcontroller'}-${label}s.html`;
}
