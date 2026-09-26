import { bootAudio, playCode, stopAudio } from './audio.js';
import { buildCatalog } from './catalog.js';
import { compile } from './codegen.js';
import { bindScrub } from './scrub.js';
import { trackCycles } from './theory.js';

const MOODS = [
  ['all', 'All'],
  ['sleep', 'Sleep'],
  ['meditation', 'Meditation'],
  ['focus', 'Focus'],
  ['relax', 'Relax'],
];

export function createLibrary(root) {
  const tracks = buildCatalog();
  const code = new Map();
  let playingId = null;
  let selectedId = null;
  let filter = 'all';

  root.innerHTML = `
    <div class="library-shell">
      <main class="library">
        <header class="library-head">
          <p class="mark">Strudel Controller</p>
          <p class="tag">Soft piano, warm synth, and hums — no beats or bright chirps.</p>
          <div class="filters" role="tablist">
            ${MOODS.map(
              ([id, label]) =>
                `<button type="button" class="filter${id === 'all' ? ' on' : ''}" data-filter="${id}" role="tab" aria-selected="${id === 'all'}">${label}</button>`,
            ).join('')}
          </div>
        </header>
        <ol class="tracks">
          ${tracks
            .map(
              (track, index) => `
            <li class="track" data-id="${track.id}" data-mood="${track.mood}" role="button" tabindex="0">
              <span class="track-num">${String(index + 1).padStart(2, '0')}</span>
              <div class="track-copy">
                <p class="track-name">${escapeHtml(track.title)}</p>
                <p class="track-meta">${escapeHtml(track.moodName)} · ${track.time}</p>
              </div>
            </li>`,
            )
            .join('')}
        </ol>
      </main>
      <footer class="player-dock" aria-label="Playback">
        <div class="player-dock-inner">
          <p class="dock-title" id="dock-title">Choose a song</p>
          <div class="scrub dock-scrub" data-scrub hidden>
            <span class="scrub-time" data-scrub-elapsed>0:00</span>
            <input type="range" data-scrub-bar aria-label="Scrub track position" />
            <span class="scrub-time" data-scrub-total>0:00</span>
          </div>
          <div class="dock-controls">
            <button type="button" id="dock-play" class="primary" disabled>Play</button>
            <button type="button" id="dock-stop" disabled>Stop</button>
          </div>
          <p class="dock-status" id="status" role="status">Starting Strudel…</p>
        </div>
      </footer>
    </div>
  `;

  const status = root.querySelector('#status');
  const list = root.querySelector('.tracks');
  const dockPlay = root.querySelector('#dock-play');
  const dockStop = root.querySelector('#dock-stop');
  const dockTitle = root.querySelector('#dock-title');
  const scrub = bindScrub({
    root: root.querySelector('[data-scrub]'),
    isActive: () => Boolean(playingId),
    getDurationSeconds: () => tracks.find((item) => item.id === playingId)?.seconds ?? 0,
  });

  function stopPlayback() {
    playingId = null;
    stopAudio();
    scrub.stop();
    paint();
  }

  function playTrack(id) {
    const track = tracks.find((item) => item.id === id);
    if (!track) return;
    selectedId = id;
    playingId = id;
    paint();
    scrub.start();
    status.textContent = `Playing ${track.title}. It repeats until you stop.`;
    playCode(score(track), { loopCycles: trackCycles(track.piece) }).catch((error) => {
      if (playingId !== id) return;
      stopPlayback();
      status.textContent = error?.message || 'That track could not start.';
    });
  }

  list.addEventListener('click', (event) => {
    const row = event.target.closest('.track');
    if (!row) return;
    const id = row.dataset.id;
    if (playingId === id) {
      stopPlayback();
      status.textContent = 'Stopped.';
      return;
    }
    playTrack(id);
  });

  list.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('.track');
    if (!row) return;
    event.preventDefault();
    row.click();
  });

  dockPlay.addEventListener('click', () => {
    if (playingId) return;
    if (!selectedId) return;
    playTrack(selectedId);
  });

  dockStop.addEventListener('click', () => {
    if (!playingId) return;
    stopPlayback();
    status.textContent = 'Stopped.';
  });

  root.querySelector('.filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    filter = button.dataset.filter;
    for (const item of root.querySelectorAll('.filter')) {
      const on = item === button;
      item.classList.toggle('on', on);
      item.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    paint();
  });

  paint();

  bootAudio()
    .then(() => {
      dockPlay.disabled = !selectedId;
      status.textContent = selectedId ? 'Ready. Press play or pick another song.' : 'Ready. Pick a song.';
    })
    .catch((error) => {
      status.textContent = error?.message || 'Strudel failed to start.';
    });

  function score(track) {
    if (!code.has(track.id)) code.set(track.id, compile(track.piece, 'track'));
    return code.get(track.id);
  }

  function paint() {
    for (const row of list.querySelectorAll('.track')) {
      const show = filter === 'all' || row.dataset.mood === filter;
      row.hidden = !show;
      const on = row.dataset.id === playingId;
      const picked = row.dataset.id === selectedId;
      row.classList.toggle('on', on);
      row.classList.toggle('picked', picked && !on);
      row.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    const playing = tracks.find((item) => item.id === playingId);
    const selected = tracks.find((item) => item.id === selectedId);

    if (playing) {
      dockTitle.textContent = playing.title;
    } else if (selected) {
      dockTitle.textContent = selected.title;
    } else {
      dockTitle.textContent = 'Choose a song';
    }

    dockPlay.disabled = !selectedId || Boolean(playingId);
    dockPlay.textContent = 'Play';
    dockStop.disabled = !playingId;

    document.title = playing
      ? `${playing.title} — Strudel Controller`
      : 'Strudel Controller — ten ambient songs';
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
