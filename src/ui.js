import { playCode, bootAudio, stopAudio } from './audio.js';
import { bindScrub } from './scrub.js';
import { compile } from './codegen.js';
import { generateTrack, LENGTHS, loopDocument, loopFilename, MOODS, moodById } from './generate.js';
import {
  GAIN_CAP,
  LAYER_IDS,
  LAYER_INFO,
  MOTIONS,
  exportPiece,
  normalize,
  nudge,
} from './presets.js';
import {
  MOTIFS,
  PROGRESSIONS,
  ROOTS,
  SCALES,
  barSeconds,
  formatTime,
  harmonyLabel,
  trackCycles,
  trackSeconds,
} from './theory.js';

const STORAGE_KEY = 'strudelcontroller-piece-v2';
const LPF_MIN = 80;
const LPF_MAX = 4000;
const GAIN_MAX = GAIN_CAP;

const KNOBS = [
  { param: 'gain', label: 'Level', min: 0, max: 0.5, step: 0.01, format: (v) => Number(v).toFixed(2) },
  { param: 'lpf', label: 'Tone', log: true, format: (v) => formatHz(v) },
  { param: 'room', label: 'Space', min: 0, max: 0.95, step: 0.01, format: (v) => Number(v).toFixed(2) },
  { param: 'delay', label: 'Echo', min: 0, max: 0.7, step: 0.01, format: (v) => Number(v).toFixed(2) },
  { param: 'release', label: 'Bloom', min: 0.2, max: 8, step: 0.1, format: (v) => `${Number(v).toFixed(1)}s` },
  { param: 'slow', label: 'Pace', min: 1, max: 24, step: 1, format: (v) => `×${Math.round(v)}` },
  { param: 'sparsity', label: 'Gaps', min: 0, max: 0.85, step: 0.01, format: (v) => Number(v).toFixed(2) },
];

function formatHz(hz) {
  const n = Math.round(Number(hz) || 0);
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

function lpfToPos(hz) {
  const n = Math.min(LPF_MAX, Math.max(LPF_MIN, Number(hz) || LPF_MIN));
  return Math.round((100 * Math.log(n / LPF_MIN)) / Math.log(LPF_MAX / LPF_MIN));
}

function posToLpf(pos) {
  const t = Math.min(100, Math.max(0, Number(pos))) / 100;
  return Math.round(LPF_MIN * (LPF_MAX / LPF_MIN) ** t);
}

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function options(entries, current) {
  return entries
    .map(([value, label]) => `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`)
    .join('');
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function createStudio(root) {
  const saved = readStorage();
  const state = saved ? normalize(saved) : generateTrack('relax', 60);
  let dirty = false;
  let playing = false;
  let booted = false;
  let saveTimer = 0;
  let liveTimer = 0;

  root.innerHTML = shell();

  const design = root.querySelector('#design');
  const codeEl = root.querySelector('#code');
  const play = root.querySelector('#play');
  const stop = root.querySelector('#stop');
  const status = root.querySelector('#status');
  const note = root.querySelector('#score-note');
  const scoreMode = root.querySelector('#score-mode');
  const titleInput = root.querySelector('#title');
  const readout = root.querySelector('#readout');
  const harmony = root.querySelector('#harmony');
  const scrub = bindScrub({
    root: root.querySelector('[data-scrub]'),
    isActive: () => playing,
    getDurationSeconds: () => trackSeconds(state),
  });

  fillSelect(root.querySelector('#root'), ROOTS.map((item) => [item, item]), state.root);
  fillSelect(
    root.querySelector('#scale'),
    Object.entries(SCALES).map(([id, scale]) => [id, scale.label]),
    state.scale,
  );
  fillSelect(root.querySelector('#progression'), Object.entries(PROGRESSIONS), state.progression);
  fillSelect(
    root.querySelector('#motif'),
    Object.entries(MOTIFS).map(([id, motif]) => [id, motif.label]),
    state.motif,
  );
  fillSelect(
    root.querySelector('#length'),
    LENGTHS.map((item) => [String(item.seconds), item.label]),
    String(state.targetSeconds || 60),
  );

  design.addEventListener('click', onDesignClick);
  design.addEventListener('input', onDesignInput);
  design.addEventListener('change', onDesignChange);

  titleInput.addEventListener('input', () => {
    state.title = titleInput.value.slice(0, 48);
    commit();
  });

  for (const id of ['root', 'scale', 'progression', 'motif']) {
    root.querySelector(`#${id}`).addEventListener('change', (event) => {
      state[id] = event.target.value;
      commit({ hear: true });
    });
  }

  const bpm = root.querySelector('#bpm');
  const master = root.querySelector('#master');
  bpm.addEventListener('input', () => {
    state.bpm = Number(bpm.value);
    commit({ hear: true });
  });
  master.addEventListener('input', () => {
    state.master = Number(master.value);
    commit({ hear: true });
  });

  root.querySelector('#generate').addEventListener('click', () => freshTrack());
  root.querySelector('#length').addEventListener('change', (event) => {
    state.targetSeconds = Number(event.target.value);
    persistSoon();
  });
  play.addEventListener('click', () => playCurrent());
  stop.addEventListener('click', () => stopPlayback());
  root.querySelector('#rebuild').addEventListener('click', () => {
    dirty = false;
    writeScore(compile(state, state.view));
    paintNote();
    paintChrome();
    if (playing) playCurrent();
  });
  root.querySelector('#copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codeEl.value);
      setStatus('Copied. Paste it into strudel.cc and press Ctrl+Enter.');
    } catch {
      codeEl.focus();
      codeEl.select();
      setStatus('Select the score and copy it manually.');
    }
  });
  root.querySelector('#download').addEventListener('click', () => downloadLoop());
  root.querySelector('#save-piece').addEventListener('click', () => {
    const payload = { type: 'strudelcontroller-piece', version: 2, piece: exportPiece(state) };
    download(`${fileSlug(state.title) || 'strudelcontroller'}.json`, JSON.stringify(payload, null, 2), 'application/json');
  });
  root.querySelector('#load-piece').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const incoming =
        json?.type === 'strudelcontroller-piece' || json?.type === 'drift-piece' ? json.piece : json;
      const next = normalize(incoming);
      adopt(next);
      dirty = false;
      setStatus(`Loaded ${next.title}.`);
    } catch {
      setStatus('That file is not a Strudel Controller piece.');
    }
  });

  codeEl.addEventListener('input', () => {
    dirty = true;
    paintNote();
    paintChrome();
  });

  document.addEventListener('keydown', (event) => {
    const tag = event.target?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      playCurrent();
    } else if ((event.ctrlKey || event.metaKey) && event.key === '.') {
      event.preventDefault();
      stopPlayback();
    } else if (event.code === 'Space' && !typing) {
      event.preventDefault();
      if (playing) stopPlayback();
      else playCurrent();
    }
  });

  renderDesign();
  writeScore(compile(state, state.view));
  paintChrome();
  paintNote();
  setStatus('Starting Strudel…');
  play.disabled = true;

  bootAudio()
    .then(() => {
      booted = true;
      play.disabled = false;
      setStatus('Ready. Press play.');
    })
    .catch((error) => {
      setStatus(error?.message || 'Strudel failed to start. You can still copy the score.');
    });

  function adopt(next) {
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, next);
    renderDesign();
    writeScore(compile(state, state.view));
    paintChrome();
    paintNote();
    persistSoon();
    if (playing && !dirty) scheduleLive();
  }

  function commit({ render = false, hear = false } = {}) {
    persistSoon();
    if (render) renderDesign();
    paintChrome();
    if (!dirty) {
      writeScore(compile(state, state.view));
      if (hear && playing) scheduleLive();
    }
    paintNote();
  }

  function persistSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(exportPiece(state)));
    }, 200);
  }

  function renderDesign() {
    const y = design.scrollTop;
    design.innerHTML = designHTML(state);
    design.scrollTop = y;
  }

  function writeScore(text) {
    if (document.activeElement !== codeEl && codeEl.value !== text) codeEl.value = text;
    else if (!dirty && codeEl.value !== text) codeEl.value = text;
  }

  function paintNote() {
    note.hidden = !dirty;
  }

  function paintChrome() {
    setIfIdle(titleInput, state.title);
    setIfIdle(root.querySelector('#root'), state.root);
    setIfIdle(root.querySelector('#scale'), state.scale);
    setIfIdle(root.querySelector('#progression'), state.progression);
    setIfIdle(root.querySelector('#motif'), state.motif);
    setIfIdle(bpm, state.bpm);
    setIfIdle(master, state.master);
    root.querySelector('#bpm-val').textContent = `${Math.round(state.bpm)}`;
    root.querySelector('#master-val').textContent = Number(state.master).toFixed(2);
    const bar = barSeconds(state.bpm);
    const loop = formatTime(trackSeconds(state));
    readout.textContent = `Loop ${loop} · 1 bar = ${bar.toFixed(1)}s · repeats until you stop`;
    setIfIdle(root.querySelector('#length'), state.targetSeconds || 60);
    harmony.textContent = harmonyLabel(state);
    document.documentElement.style.setProperty('--bar', `${bar.toFixed(2)}s`);
    document.body.classList.toggle('is-playing', playing);
    const mode = dirty ? 'score' : state.view;
    play.textContent = dirty ? 'Play score' : 'Play';
    scoreMode.textContent = mode === 'track' ? 'Track' : mode === 'loop' ? 'Loop' : 'Edited';
    document.title = `${state.title || 'Strudel Controller'} — soft ambient`;
    const time = design.querySelector('#track-time');
    if (time) time.textContent = formatTime(trackSeconds(state));
  }

  function scheduleLive() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      if (playing && !dirty) playCurrent();
    }, 160);
  }

  function freshTrack() {
    const seconds = Number(root.querySelector('#length').value) || state.targetSeconds || 60;
    dirty = false;
    adopt(generateTrack(state.mood || 'relax', seconds));
    if (booted) playCurrent();
  }

  function downloadLoop() {
    const code = compile(state, 'track');
    const mood = moodById(state.mood).name;
    const secondsLabel = formatTime(trackSeconds(state));
    download(
      loopFilename(state),
      loopDocument({ title: state.title, code, mood, secondsLabel }),
      'text/html',
    );
    setStatus(`Saved ${loopFilename(state)}. Open it and press Play loop.`);
  }

  function playCurrent() {
    if (!booted) return;
    playing = true;
    document.body.classList.add('is-playing');
    paintChrome();
    const label = dirty ? 'edited score' : 'loop';
    setStatus(`Playing the ${label}. It repeats until you stop.`);
    scrub.start();
    playCode(codeEl.value, { loopCycles: trackCycles(state) }).catch((error) => {
      if (!playing) return;
      playing = false;
      document.body.classList.remove('is-playing');
      scrub.stop();
      paintChrome();
      setStatus(String(error?.message || error).slice(0, 280));
    });
  }

  function stopPlayback() {
    playing = false;
    clearTimeout(liveTimer);
    document.body.classList.remove('is-playing');
    scrub.stop();
    stopAudio();
    paintChrome();
    setStatus('Stopped.');
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function onDesignClick(event) {
    const el = event.target.closest('[data-action]');
    if (!el || !design.contains(el)) return;
    const action = el.dataset.action;

    if (action === 'mood') {
      state.mood = el.dataset.mood;
      freshTrack();
      return;
    }
    if (action === 'generate') {
      freshTrack();
      return;
    }
    if (action === 'view') {
      if (state.view === el.dataset.view) return;
      state.view = el.dataset.view;
      commit({ render: true, hear: true });
      return;
    }
    if (action === 'nudge') {
      const next = nudge(state);
      next.view = 'track';
      dirty = false;
      adopt(next);
      if (playing) playCurrent();
      return;
    }
    if (action === 'solo') {
      const id = el.dataset.layer;
      state.layers[id].solo = !state.layers[id].solo;
      el.classList.toggle('on', state.layers[id].solo);
      el.setAttribute('aria-pressed', String(state.layers[id].solo));
      commit({ hear: true });
      return;
    }
    if (action === 'chip') {
      const section = state.sections.find((item) => item.id === el.dataset.section);
      if (!section) return;
      const id = el.dataset.layer;
      section.layers[id] = !section.layers[id];
      el.classList.toggle('on', section.layers[id]);
      el.setAttribute('aria-pressed', String(section.layers[id]));
      commit({ hear: true });
      return;
    }
    if (action === 'add-section') {
      if (state.sections.length >= 12) return;
      const enabled = Object.fromEntries(LAYER_IDS.map((id) => [id, id === 'drone' || id === 'texture']));
      state.sections.push({
        id: `sec-${Math.random().toString(36).slice(2, 8)}`,
        name: 'Still',
        cycles: 8,
        level: 0.7,
        space: 0.12,
        layers: enabled,
      });
      commit({ render: true, hear: true });
      return;
    }

    const sectionIndex = state.sections.findIndex((item) => item.id === el.dataset.section);
    if (sectionIndex < 0) return;
    if (action === 'up' && sectionIndex > 0) {
      const [item] = state.sections.splice(sectionIndex, 1);
      state.sections.splice(sectionIndex - 1, 0, item);
      commit({ render: true, hear: true });
    } else if (action === 'down' && sectionIndex < state.sections.length - 1) {
      const [item] = state.sections.splice(sectionIndex, 1);
      state.sections.splice(sectionIndex + 1, 0, item);
      commit({ render: true, hear: true });
    } else if (action === 'duplicate' && state.sections.length < 12) {
      const copy = structuredClone(state.sections[sectionIndex]);
      copy.id = `sec-${Math.random().toString(36).slice(2, 8)}`;
      copy.name = `${copy.name} again`.slice(0, 32);
      state.sections.splice(sectionIndex + 1, 0, copy);
      commit({ render: true, hear: true });
    } else if (action === 'delete' && state.sections.length > 1) {
      state.sections.splice(sectionIndex, 1);
      commit({ render: true, hear: true });
    }
  }

  function onDesignInput(event) {
    const el = event.target;
    if (el.dataset.layer && el.dataset.param) {
      const layer = state.layers[el.dataset.layer];
      layer[el.dataset.param] = el.dataset.param === 'lpf' ? posToLpf(el.value) : Number(el.value);
      const display = el.closest('.knob')?.querySelector('.k-value');
      if (display) display.textContent = knobText(el.dataset.param, layer[el.dataset.param]);
      commit({ hear: true });
      return;
    }
    const section = state.sections.find((item) => item.id === el.dataset.section);
    if (!section) return;
    if (el.dataset.field === 'name') section.name = el.value.slice(0, 32);
    if (el.dataset.field === 'cycles') section.cycles = Number(el.value);
    if (el.dataset.field === 'level') {
      section.level = Number(el.value);
      const display = el.closest('label')?.querySelector('.k-value');
      if (display) display.textContent = Number(section.level).toFixed(2);
    }
    if (el.dataset.field === 'space') {
      section.space = Number(el.value);
      const display = el.closest('label')?.querySelector('.k-value');
      if (display) display.textContent = signed(section.space);
    }
    commit({ hear: true });
  }

  function onDesignChange(event) {
    const el = event.target;
    if (el.dataset.enable) {
      state.layers[el.dataset.enable].enabled = el.checked;
      commit({ render: true, hear: true });
      return;
    }
    if (el.dataset.voice) {
      state.layers[el.dataset.voice].voice = el.value;
      commit({ hear: true });
      return;
    }
    if (el.dataset.motion) {
      state.layers[el.dataset.motion].motion = el.value;
      commit({ hear: true });
    }
  }
}

function knobText(param, value) {
  const knob = KNOBS.find((item) => item.param === param);
  return knob ? knob.format(value) : String(value);
}

function signed(value) {
  const n = Number(value) || 0;
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}`;
}

function setIfIdle(el, value) {
  if (!el || document.activeElement === el) return;
  const next = String(value);
  if (el.value !== next) el.value = next;
}

function fillSelect(el, entries, current) {
  el.innerHTML = options(entries, current);
}

function fileSlug(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function shell() {
  return `
    <div class="app">
      <header class="top">
        <div class="brand-row">
          <div class="brand">
            <p class="mark">Strudel Controller</p>
            <p class="tag">Soft looping tracks for sleep, meditation, focus, and rest.</p>
          </div>
          <label class="title-field">Piece
            <input id="title" maxlength="48" spellcheck="false" autocomplete="off" />
          </label>
          <div class="transport">
            <button id="generate" type="button">New track</button>
            <button id="play" class="primary" type="button" title="Play (Ctrl+Enter or Space)">Play</button>
            <button id="stop" type="button" title="Stop (Ctrl+.)">Stop</button>
            <button id="download" type="button">Download</button>
          </div>
        </div>
        <div class="tune-row">
          <label>Root <select id="root"></select></label>
          <label>Scale <select id="scale"></select></label>
          <label>Harmony <select id="progression"></select></label>
          <label>Figure <select id="motif"></select></label>
          <label class="slider-field">Tempo
            <input id="bpm" type="range" min="36" max="72" step="1" />
            <span id="bpm-val"></span>
          </label>
          <label>Length <select id="length"></select></label>
          <label class="slider-field">Level
            <input id="master" type="range" min="0.35" max="0.9" step="0.01" />
            <span id="master-val"></span>
          </label>
        </div>
        <p class="harmony" id="harmony"></p>
        <p class="readout" id="readout"></p>
        <div class="scrub" data-scrub hidden>
          <span class="scrub-time" data-scrub-elapsed>0:00</span>
          <input type="range" data-scrub-bar aria-label="Scrub track position" />
          <span class="scrub-time" data-scrub-total>0:00</span>
        </div>
      </header>
      <div class="cycle" aria-hidden="true"><span></span></div>
      <div class="workspace">
        <div id="design" class="design"></div>
        <section class="score" aria-label="Strudel score">
          <div class="score-head">
            <h2>Score <span id="score-mode">Loop</span></h2>
            <div class="score-actions">
              <button id="rebuild" type="button">Rebuild</button>
              <button id="copy" type="button">Copy</button>
              <button id="download-score" type="button" hidden>Download</button>
            </div>
          </div>
          <p id="score-note" class="score-note" hidden>This score has your edits. Playback uses the text. Rebuild to follow the controls again.</p>
          <textarea id="code" spellcheck="false" aria-label="Strudel code"></textarea>
          <div class="score-foot">
            <button id="save-piece" type="button">Save piece</button>
            <label class="file-btn">Load piece
              <input id="load-piece" type="file" accept="application/json,.json" />
            </label>
            <p id="status" role="status"></p>
          </div>
        </section>
      </div>
    </div>
  `;
}

function designHTML(state) {
  const mood = moodById(state.mood);
  const moods = MOODS.map(
    (item) => `
      <button type="button" class="scene${item.id === mood.id ? ' on' : ''}" data-action="mood" data-mood="${item.id}">
        <span class="scene-name">${esc(item.name)}</span>
        <span class="scene-meta">${item.bpm[0]}–${item.bpm[1]} bpm</span>
      </button>`,
  ).join('');

  const body = state.view === 'track' ? trackHTML(state) : loopHTML(state);
  return `
    <div class="scenes">${moods}</div>
    <p class="blurb">${esc(mood.blurb)} New track writes a fresh arrangement in the length you chose.</p>
    <div class="tools">
      <div class="tabs" role="tablist">
        <button type="button" class="tab${state.view === 'track' ? ' on' : ''}" data-action="view" data-view="track" role="tab" aria-selected="${state.view === 'track'}">Track</button>
        <button type="button" class="tab${state.view === 'loop' ? ' on' : ''}" data-action="view" data-view="loop" role="tab" aria-selected="${state.view === 'loop'}">Layers</button>
      </div>
      <button type="button" data-action="generate">New track</button>
      <button type="button" data-action="nudge">Soften</button>
    </div>
    ${body}
    <details class="how">
      <summary>How a track loops</summary>
      <ol>
        <li><code>setcpm(bpm/4)</code> makes one cycle a 4/4 bar. At 48 bpm a bar is five seconds.</li>
        <li>The layers are bed, pad, piano, glow, harp, and air, kept quiet on purpose.</li>
        <li>A track is <code>arrange()</code>. Arrive and Return share the same bed, so the join is soft.</li>
        <li>Strudel repeats the arrangement, so the piece keeps looping until you stop.</li>
      </ol>
      <p>
        Download saves a page that plays this loop. Copy still pastes the score into
        <a href="https://strudel.cc" target="_blank" rel="noreferrer">strudel.cc</a>.
      </p>
    </details>
  `;
}

function loopHTML(state) {
  const cards = LAYER_IDS.map((id) => layerCard(id, state.layers[id])).join('');
  return `
    <p class="lede">The loop is the full texture. Solo a layer to hear it alone. The track uses the switches, not the solos.</p>
    <div class="cards">${cards}</div>
  `;
}

function layerCard(id, layer) {
  const info = LAYER_INFO[id];
  const knobs = KNOBS.map((knob) => {
    const max = knob.param === 'gain' ? GAIN_MAX[id] : knob.max;
    const value = knob.log ? lpfToPos(layer.lpf) : layer[knob.param];
    const shown = knob.format(layer[knob.param]);
    return `
      <label class="knob">
        <span class="k-label">${knob.label}</span>
        <input type="range" data-layer="${id}" data-param="${knob.param}" ${knob.log ? 'data-log="1"' : ''}
          min="${knob.log ? 0 : knob.min}" max="${knob.log ? 100 : max}" step="${knob.log ? 1 : knob.step}"
          value="${value}" aria-label="${esc(info.name)} ${knob.label}" />
        <span class="k-value">${shown}</span>
      </label>`;
  }).join('');

  return `
    <article class="card${layer.enabled ? '' : ' is-off'}" data-layer="${id}">
      <div class="card-top">
        <label class="switch">
          <input type="checkbox" data-enable="${id}" ${layer.enabled ? 'checked' : ''} />
          <span>${esc(info.name)}</span>
        </label>
        <p class="hint">${esc(info.hint)}</p>
        <label>Voice
          <select data-voice="${id}">${options(info.voices.map((voice) => [voice.id, voice.label]), layer.voice)}</select>
        </label>
        <label>Motion
          <select data-motion="${id}">${options(MOTIONS.map((motion) => [motion.id, motion.label]), layer.motion)}</select>
        </label>
        <button type="button" class="solo${layer.solo ? ' on' : ''}" data-action="solo" data-layer="${id}" aria-pressed="${layer.solo}">Solo</button>
      </div>
      <div class="knobs">${knobs}</div>
    </article>`;
}

function trackHTML(state) {
  const sections = state.sections
    .map((section, index) => {
      const chips = LAYER_IDS.filter((id) => state.layers[id].enabled)
        .map((id) => {
          const on = Boolean(section.layers?.[id]);
          return `<button type="button" class="chip${on ? ' on' : ''}" data-action="chip" data-section="${esc(section.id)}" data-layer="${id}" aria-pressed="${on}">${esc(LAYER_INFO[id].name)}</button>`;
        })
        .join('');
      return `
        <article class="section">
          <div class="section-top">
            <input data-section="${esc(section.id)}" data-field="name" maxlength="32" spellcheck="false" value="${esc(section.name)}" aria-label="Section name" />
            <label>Bars
              <input data-section="${esc(section.id)}" data-field="cycles" type="number" min="1" max="64" step="1" value="${section.cycles}" />
            </label>
            <label class="knob slim">Weight
              <input data-section="${esc(section.id)}" data-field="level" type="range" min="0.2" max="1.2" step="0.01" value="${section.level}" />
              <span class="k-value">${Number(section.level).toFixed(2)}</span>
            </label>
            <label class="knob slim">Space
              <input data-section="${esc(section.id)}" data-field="space" type="range" min="-0.35" max="0.4" step="0.01" value="${section.space}" />
              <span class="k-value">${signed(section.space)}</span>
            </label>
            <div class="section-actions">
              <button type="button" data-action="up" data-section="${esc(section.id)}" ${index === 0 ? 'disabled' : ''}>Up</button>
              <button type="button" data-action="down" data-section="${esc(section.id)}" ${index === state.sections.length - 1 ? 'disabled' : ''}>Down</button>
              <button type="button" data-action="duplicate" data-section="${esc(section.id)}">Duplicate</button>
              <button type="button" data-action="delete" data-section="${esc(section.id)}" ${state.sections.length === 1 ? 'disabled' : ''}>Remove</button>
            </div>
          </div>
          <div class="chips">${chips || '<p class="hint">Switch a layer on in the loop to use it here.</p>'}</div>
        </article>`;
    })
    .join('');

  const bars = state.sections.reduce((sum, section) => sum + Number(section.cycles || 0), 0);
  return `
    <p class="lede">Same layers, different company. <span id="track-time">${formatTime(trackSeconds(state))}</span> across ${bars} bars. Weight scales levels. Space adds or removes reverb.</p>
    <div class="sections">${sections}</div>
    <button type="button" class="add" data-action="add-section">Add section</button>
  `;
}
