import { createPiece, LAYER_IDS } from './presets.js';
import { trackSeconds, formatTime } from './theory.js';

export const MOODS = [
  {
    id: 'sleep',
    name: 'Sleep',
    blurb: 'Warm hums and a distant piano. Nothing bright, nothing busy.',
    bpm: [38, 44],
    scales: ['pentatonic', 'major', 'lydian'],
    progressions: ['still', 'fifths'],
    motifs: ['sparse', 'pedal'],
    piano: 'rare',
    hum: true,
    glow: false,
  },
  {
    id: 'meditation',
    name: 'Meditation',
    blurb: 'Soft piano over slow pads and a steady hum.',
    bpm: [40, 48],
    scales: ['major', 'dorian', 'pentatonic'],
    progressions: ['still', 'sway', 'fifths'],
    motifs: ['sparse', 'pedal', 'steps'],
    piano: 'some',
    hum: true,
    glow: true,
  },
  {
    id: 'focus',
    name: 'Focus',
    blurb: 'Clear piano and gentle synth. Calm, not gloomy.',
    bpm: [46, 56],
    scales: ['major', 'lydian', 'pentatonic'],
    progressions: ['sway', 'fifths', 'still'],
    motifs: ['sparse', 'pedal'],
    piano: 'steady',
    hum: false,
    glow: true,
  },
  {
    id: 'relax',
    name: 'Relax',
    blurb: 'Soothing chords, soft keys, and a breathing hum.',
    bpm: [42, 52],
    scales: ['major', 'dorian', 'pentatonic', 'lydian'],
    progressions: ['sway', 'fifths', 'still'],
    motifs: ['sparse', 'pedal', 'steps'],
    piano: 'some',
    hum: true,
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
    voice: 'pure',
    motion: 'breathe',
    gain: between(random, 0.22, 0.32),
    lpf: Math.round(between(random, 140, 240)),
    room: between(random, 0.76, 0.9),
    delay: between(random, 0, 0.06),
    release: between(random, 6, 8),
    slow: 8,
    sparsity: 0,
  };
}

function pad(random) {
  return {
    enabled: true,
    voice: random() < 0.7 ? 'haze' : 'warm',
    motion: 'breathe',
    gain: between(random, 0.14, 0.22),
    lpf: Math.round(between(random, 520, 980)),
    room: between(random, 0.78, 0.92),
    delay: between(random, 0.1, 0.2),
    release: between(random, 5, 7),
    slow: random() < 0.5 ? 2 : 3,
    sparsity: 0,
  };
}

function piano(random, mood) {
  return {
    enabled: true,
    voice: 'felt',
    motion: 'still',
    gain: between(random, mood.piano === 'steady' ? 0.18 : 0.14, mood.piano === 'steady' ? 0.24 : 0.2),
    lpf: Math.round(between(random, 1100, 1800)),
    room: between(random, 0.58, 0.72),
    delay: between(random, 0.14, 0.24),
    release: between(random, 2.4, 3.6),
    slow: mood.piano === 'steady' ? 2 : 3,
    sparsity: between(random, mood.piano === 'steady' ? 0.45 : 0.55, mood.piano === 'steady' ? 0.62 : 0.78),
  };
}

function air(random) {
  return {
    enabled: true,
    voice: 'air',
    motion: random() < 0.6 ? 'breathe' : 'still',
    gain: between(random, 0.04, 0.08),
    lpf: Math.round(between(random, 380, 620)),
    room: between(random, 0.82, 0.94),
    delay: between(random, 0, 0.06),
    release: between(random, 4, 6),
    slow: 4,
    sparsity: 0,
  };
}

function hum(random) {
  return {
    enabled: true,
    voice: 'hum',
    motion: 'breathe',
    gain: between(random, 0.1, 0.16),
    lpf: Math.round(between(random, 320, 520)),
    room: between(random, 0.72, 0.86),
    delay: between(random, 0.06, 0.14),
    release: between(random, 5, 7),
    slow: 8,
    sparsity: 0,
  };
}

function glow(random) {
  return {
    enabled: true,
    voice: 'harmonic',
    motion: 'still',
    gain: between(random, 0.05, 0.09),
    lpf: Math.round(between(random, 1400, 2200)),
    room: between(random, 0.82, 0.92),
    delay: between(random, 0.12, 0.22),
    release: between(random, 3, 4.5),
    slow: 4,
    sparsity: between(random, 0.55, 0.72),
  };
}

export function generateTrack(moodId = 'relax', seconds = 60, random = Math.random, profile = {}) {
  const mood = moodById(moodId);
  const bpm = Math.round(profile.bpm ?? between(random, mood.bpm[0], mood.bpm[1]));
  const total = fitBars(seconds, bpm);
  const [arriveBars, openBars, settleBars, returnBars] = splitBars(total);
  const arriveLevel = between(random, 0.82, 0.92);
  const arriveSpace = between(random, 0.12, 0.18);
  const pianoOn = { drone: true, pad: true, melody: true, texture: true };
  const openLayers =
    mood.piano === 'rare'
      ? { drone: true, pad: true, texture: true, pulse: mood.hum }
      : { ...pianoOn, pulse: mood.hum };
  const settleLayers = {
    pad: true,
    melody: mood.piano !== 'rare',
    texture: true,
    shimmer: mood.glow,
    pulse: mood.hum,
  };

  const piece = createPiece({
    title: profile.title ?? 'Untitled',
    bpm,
    root: profile.root ?? pick(random, ROOTS),
    scale: profile.scale ?? pick(random, mood.scales),
    progression: profile.progression ?? pick(random, mood.progressions),
    motif: profile.motif ?? pick(random, mood.motifs),
    master: profile.master ?? 0.82,
    mood: mood.id,
    targetSeconds: LENGTHS.some((item) => item.seconds === Number(seconds)) ? Number(seconds) : 60,
    view: 'track',
    layers: {
      drone: bed(random),
      pad: pad(random),
      melody: piano(random, mood),
      shimmer: glow(random),
      pulse: hum(random),
      texture: air(random),
    },
    sections: [
      { name: 'Arrive', cycles: arriveBars, level: arriveLevel, space: arriveSpace, layers: { drone: true, texture: true, pulse: mood.hum } },
      { name: 'Open', cycles: openBars, level: 0.92, space: between(random, 0.08, 0.14), layers: openLayers },
      { name: 'Settle', cycles: settleBars, level: 0.88, space: between(random, 0.1, 0.16), layers: settleLayers },
      { name: 'Return', cycles: returnBars, level: arriveLevel, space: arriveSpace, layers: { drone: true, texture: true, pulse: mood.hum } },
    ],
  });

  for (const id of LAYER_IDS) {
    piece.layers[id].enabled = piece.sections.some((section) => section.layers[id]);
  }
  if (!mood.glow) piece.layers.shimmer.enabled = false;
  if (!mood.hum) piece.layers.pulse.enabled = false;
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
