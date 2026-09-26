import { GAIN_CAP, LAYER_IDS } from './presets.js';
import {
  MOTIFS,
  SCALES,
  barSeconds,
  chordMini,
  clamp,
  fifthsMini,
  formatTime,
  harmonyLabel,
  miniNote,
  scaleName,
  spell,
  trackSeconds,
} from './theory.js';

const CODE_NAME = {
  drone: 'bed',
  pad: 'pad',
  melody: 'piano',
  shimmer: 'glow',
  pulse: 'hum',
  texture: 'air',
};

const RESERVED = new Set([
  'stack',
  'arrange',
  'bed',
  'pad',
  'piano',
  'glow',
  'hum',
  'air',
  'silence',
  'setcpm',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

const DELAY_TIME = {
  melody: '0.375',
  shimmer: '0.5',
  pad: '0.45',
  drone: '0.6',
  texture: '0.25',
  pulse: '0.33',
};

function sanitize(text) {
  return String(text)
    .replace(/[\r\n\u2028\u2029*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function fixed(n, digits, fallback) {
  const x = Number(n);
  return (Number.isFinite(x) ? x : fallback).toFixed(digits);
}

function integer(n, fallback, min, max) {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return fallback;
  return Math.min(max, Math.max(min, x));
}

function expr(head, chain) {
  const steps = chain.filter(Boolean);
  return [head, ...steps.map((step) => `  .${step}`)].join('\n');
}

function lpfPattern(center, layer) {
  const c = clamp(center, 80, 9000);
  if (layer.motion === 'still') return String(Math.round(c));
  const spread = layer.motion === 'drift' ? 0.62 : 0.32;
  const lo = Math.round(clamp(c * (1 - spread), 60, 9000));
  const hi = Math.round(clamp(c * (1 + spread), 80, 12000));
  const speed = layer.motion === 'drift' ? 24 : 14;
  return `sine.range(${lo}, ${hi}).slow(${speed})`;
}

function toneCenter(id, layer) {
  if (id !== 'texture') return Number(layer.lpf) || 800;
  const floor = layer.voice === 'mist' ? 1800 : 1200;
  return Math.max(Number(layer.lpf) || floor, floor);
}

function sourceSteps(id, layer) {
  const voice = layer.voice;
  if (id === 'drone') return ['s("sine")'];

  if (id === 'pad') return ['s("sine")', 'partials([1, 0.35, 0.12, 0.04])'];

  if (id === 'melody') {
    if (voice === 'soft') return ['s("sine")', 'partials([1, 0.28, 0.1, 0.03])'];
    return ['s("sine")', 'partials([1, 0.2, 0.08, 0.02])'];
  }

  if (id === 'shimmer') return ['s("sine")', 'partials([1, 0.15, 0.05])'];

  if (id === 'pulse') return ['s("sine")', 'partials([1, 0.4, 0.15])'];

  if (id === 'texture') return ['s("sine")', 'partials([1, 0.25, 0.08])'];

  return [];
}

function envelope(id, layer) {
  const release = clamp(Number(layer.release) || 2, 0.05, 12);
  if (id === 'pulse') {
    return ['attack(2.4)', 'decay(0.6)', 'sustain(0.85)', `release(${Math.max(release, 4).toFixed(2)})`, 'legato(2.2)'];
  }
  if (id === 'texture') {
    return ['attack(2)', 'decay(0.5)', 'sustain(0.75)', `release(${Math.max(release, 5).toFixed(2)})`, 'legato(2.5)'];
  }
  if (id === 'melody') {
    return ['attack(0.12)', 'decay(1.8)', 'sustain(0.12)', `release(${Math.min(release, 4).toFixed(2)})`];
  }
  if (id === 'shimmer') {
    return ['attack(0.5)', 'decay(0.9)', 'sustain(0.2)', `release(${release.toFixed(2)})`, 'legato(1.4)'];
  }
  if (id === 'pad') {
    return ['attack(1.6)', 'decay(0.8)', 'sustain(0.7)', `release(${release.toFixed(2)})`, 'legato(1.8)'];
  }
  return ['attack(2)', 'decay(0.5)', 'sustain(0.9)', `release(${release.toFixed(2)})`, 'legato(2)'];
}

function colorSteps(id, layer) {
  const center = toneCenter(id, layer);
  const steps = [`lpf(${lpfPattern(center, layer)})`];
  if (id === 'pad') steps.push('lpq(0.7)');

  if (id === 'texture') {
    steps.unshift(`hpf(${layer.voice === 'mist' ? 1200 : 700})`);
  } else if (id === 'pad') {
    steps.unshift('hpf(160)');
  }
  return steps;
}

function spaceOnInstrument(id, layer) {
  const steps = [];
  const delay = Number(layer.delay) || 0;
  if (delay > 0.03) {
    steps.push(`delay(${delay.toFixed(2)})`, `delaytime(${DELAY_TIME[id] ?? '0.4'})`, 'delayfeedback(0.22)');
  }
  if ((id === 'shimmer' || id === 'texture') && layer.motion !== 'still') {
    const speed = id === 'texture' ? 22 : 18;
    steps.push(`pan(sine.range(0.22, 0.78).slow(${speed}))`);
  }
  const sparsity = Number(layer.sparsity) || 0;
  if (sparsity > 0.03) steps.push(`degradeBy(${sparsity.toFixed(2)})`);
  if (id === 'shimmer') steps.push('late(0.35)');
  const pace = integer(layer.slow, 2, 1, 16);
  if (pace !== 1) steps.push(`slow(${pace})`);
  return steps;
}

function instrument(id, state) {
  const layer = state.layers[id];
  const name = CODE_NAME[id];
  const root = state.root;

  if (id === 'drone') {
    const body = expr(`note("[${miniNote(root, 0, 2, state.scale)},${miniNote(root, 7, 2, state.scale)}]")`, [
      ...sourceSteps(id, layer),
      ...envelope(id, layer),
      ...colorSteps(id, layer),
      ...spaceOnInstrument(id, layer),
    ]);
    return `// Soft pedal. The swell restarts every ${integer(layer.slow, 8, 1, 16)} bars.\nconst ${name} = ${body}`;
  }

  if (id === 'pad') {
    const head =
      state.progression === 'fifths'
        ? `note("${fifthsMini(state, 3)}")`
        : `chord("${chordMini(state)}").dict("ireal").anchor("${spell(root, 0, state.scale)}3").voicing()`;
    const body = expr(head, [
      ...sourceSteps(id, layer),
      ...envelope(id, layer),
      ...colorSteps(id, layer),
      ...spaceOnInstrument(id, layer),
    ]);
    return `// Harmony: ${sanitize(harmonyLabel(state))}\nconst ${name} = ${body}`;
  }

  if (id === 'melody') {
    const motif = MOTIFS[state.motif]?.pattern ?? MOTIFS.sparse.pattern;
    const body = expr(`n("${motif}").scale("${scaleName(state, 4)}")`, [
      ...sourceSteps(id, layer),
      ...envelope(id, layer),
      ...colorSteps(id, layer),
      ...spaceOnInstrument(id, layer),
    ]);
    return `// Felt piano. Most of the bar is silence.\nconst ${name} = ${body}`;
  }

  if (id === 'shimmer') {
    const body = expr(`n("~ 2 ~ ~ 4 ~ ~ 0 ~").scale("${scaleName(state, 4)}")`, [
      ...sourceSteps(id, layer),
      ...envelope(id, layer),
      ...colorSteps(id, layer),
      ...spaceOnInstrument(id, layer),
    ]);
    return `// High synth glow, very gentle.\nconst ${name} = ${body}`;
  }

  if (id === 'pulse') {
    const humNotes = `[${miniNote(root, 0, 3, state.scale)},${miniNote(root, 4, 3, state.scale)}]`;
    const body = expr(`note("${humNotes}")`, [
      ...sourceSteps(id, layer),
      ...envelope(id, layer),
      ...colorSteps(id, layer),
      ...spaceOnInstrument(id, layer),
    ]);
    return `// A slow mid-register hum under the piano.\nconst ${name} = ${body}`;
  }

  const wash =
    layer.motion === 'drift'
      ? `[${miniNote(root, 0, 2, state.scale)},${miniNote(root, 7, 2, state.scale)},${miniNote(root, 4, 2, state.scale)}]`
      : `[${miniNote(root, 0, 2, state.scale)},${miniNote(root, 7, 2, state.scale)}]`;
  const body = expr(`note("${wash}")`, [
    ...sourceSteps(id, layer),
    ...envelope(id, layer),
    ...colorSteps(id, layer),
    ...spaceOnInstrument(id, layer),
  ]);
  return `// Soft synth air — no noise.\nconst ${name} = ${body}`;
}

function gainCall(id, layer, level) {
  const cap = GAIN_CAP[id] ?? 0.12;
  const peak = clamp((Number(layer.gain) || 0) * level, 0, cap);
  if (peak <= 0.0005) return '0';
  if (layer.motion === 'still') return peak.toFixed(3);
  const lo = clamp(peak * 0.68, 0, cap);
  const speed = layer.motion === 'drift' ? 18 : 10;
  return `sine.range(${lo.toFixed(3)}, ${peak.toFixed(3)}).slow(${speed})`;
}

function place(id, layer, level, extraSpace) {
  const room = clamp((Number(layer.room) || 0) + extraSpace, 0, 0.98);
  const parts = [`gain(${gainCall(id, layer, level)})`];
  if (room >= 0.02) {
    parts.push(`room(${room.toFixed(2)})`, `size(${clamp(room + 0.12, 0, 0.99).toFixed(2)})`);
  }
  return `${CODE_NAME[id]}.${parts.join('.')}`;
}

function loopMask(state) {
  const soloed = LAYER_IDS.filter((id) => state.layers[id].solo);
  if (soloed.length) return soloed;
  return LAYER_IDS.filter((id) => state.layers[id].enabled);
}

function trackMask(state) {
  const used = new Set();
  for (const section of state.sections) {
    for (const id of LAYER_IDS) {
      if (state.layers[id].enabled && section.layers?.[id]) used.add(id);
    }
  }
  return LAYER_IDS.filter((id) => used.has(id));
}

function stackOf(parts) {
  if (!parts.length) return 's("~")';
  if (parts.length === 1) return parts[0];
  return `stack(\n  ${parts.join(',\n  ')},\n)`;
}

function slug(name, used) {
  let base = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16);
  if (!base || /^[0-9]/.test(base) || RESERVED.has(base)) base = `part${base || 'x'}`;
  let id = base;
  let n = 2;
  while (used.has(id) || RESERVED.has(id)) id = `${base}${n++}`;
  used.add(id);
  return id;
}

function header(state, mode) {
  const bpm = integer(state.bpm, 48, 36, 72);
  const scale = SCALES[state.scale]?.label ?? 'Minor';
  const seconds = trackSeconds({ ...state, bpm });
  const lines = [
    `// ${sanitize(state.title) || 'Untitled'}`,
    `// ${state.root} ${scale.toLowerCase()} · ${bpm} bpm · one cycle is one bar (${barSeconds(bpm).toFixed(1)}s)`,
    `// ${sanitize(harmonyLabel(state))}`,
  ];
  if (mode === 'track') {
    lines.push(`// ${formatTime(seconds)} full track. It loops: when Return ends, Arrive begins again.`);
  }
  lines.push('// Paste into https://strudel.cc and press Ctrl+Enter. Leave it running to loop.');
  lines.push('');
  lines.push(`setcpm(${bpm}/4)`);
  lines.push('');
  return lines.join('\n');
}

export function compile(state, mode) {
  const ids = mode === 'track' ? trackMask(state) : loopMask(state);
  const level = clamp(Number(state.master) || 1, 0.5, 1);
  const blocks = ids.map((id) => instrument(id, state));
  const lines = [header(state, mode)];

  if (!blocks.length) {
    lines.push('// Enable a layer to hear the loop.');
    lines.push('s("~")');
    return `${lines.join('\n')}\n`;
  }

  lines.push(blocks.join('\n\n'));
  lines.push('');

  if (mode === 'track') {
    const used = new Set(Object.values(CODE_NAME));
    const bindings = state.sections.map((section) => {
      const name = slug(section.name, used);
      const parts = LAYER_IDS.filter((id) => state.layers[id].enabled && section.layers?.[id]).map((id) =>
        place(id, state.layers[id], level * clamp(Number(section.level) || 1, 0.2, 1.2), Number(section.space) || 0),
      );
      const cycles = integer(section.cycles, 8, 1, 64);
      return { name, cycles, code: `const ${name} = ${stackOf(parts)}` };
    });
    lines.push(bindings.map((item) => item.code).join('\n\n'));
    lines.push('');
    lines.push('// Full track. arrange() repeats, so this loop plays until you stop.');
    const arrangeBody = bindings.map((item) => `  [${item.cycles}, ${item.name}],`).join('\n');
    lines.push(`arrange(\n${arrangeBody}\n)`);
  } else {
    if (LAYER_IDS.some((id) => state.layers[id].solo)) lines.push('// Solo is on, so the loop is only the soloed layers.');
    lines.push('// Loop. It repeats until you stop.');
    const parts = ids.map((id) => place(id, state.layers[id], level, 0));
    lines.push(stackOf(parts));
  }

  return `${lines.join('\n')}\n`;
}
