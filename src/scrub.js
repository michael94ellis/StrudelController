import { formatTime } from './theory.js';
import { getPlaybackState, seekPlayback } from './audio.js';

const STEPS = 1000;

/**
 * @param {object} options
 * @param {HTMLElement} options.root
 * @param {() => boolean} options.isActive
 * @param {() => number} [options.getDurationSeconds]
 */
export function bindScrub({ root, isActive, getDurationSeconds }) {
  const bar = root.querySelector('[data-scrub-bar]');
  const elapsed = root.querySelector('[data-scrub-elapsed]');
  const total = root.querySelector('[data-scrub-total]');
  if (!bar || !elapsed || !total) return { stop: () => {} };

  bar.min = '0';
  bar.max = String(STEPS);
  bar.step = '1';
  bar.value = '0';

  let scrubbing = false;
  let frame = 0;

  const paint = () => {
    const active = isActive();
    root.hidden = !active;
    if (!active) return;

    const duration = getDurationSeconds?.() ?? getPlaybackState().duration;
    total.textContent = formatTime(duration);

    if (scrubbing) return;

    const { progress, seconds } = getPlaybackState();
    bar.value = String(Math.round(progress * STEPS));
    elapsed.textContent = formatTime(seconds);
  };

  const loop = () => {
    frame = requestAnimationFrame(loop);
    paint();
  };

  const start = () => {
    cancelAnimationFrame(frame);
    loop();
    paint();
  };

  const stop = () => {
    scrubbing = false;
    cancelAnimationFrame(frame);
    frame = 0;
    root.hidden = true;
    bar.value = '0';
    elapsed.textContent = formatTime(0);
  };

  const seekFromBar = () => {
    seekPlayback(Number(bar.value) / STEPS);
    const { seconds } = getPlaybackState();
    elapsed.textContent = formatTime(seconds);
  };

  bar.addEventListener('pointerdown', () => {
    scrubbing = true;
  });
  bar.addEventListener('pointerup', () => {
    scrubbing = false;
    seekFromBar();
  });
  bar.addEventListener('pointercancel', () => {
    scrubbing = false;
  });
  bar.addEventListener('input', () => {
    if (!scrubbing) return;
    const duration = getDurationSeconds?.() ?? getPlaybackState().duration;
    elapsed.textContent = formatTime((Number(bar.value) / STEPS) * duration);
    seekFromBar();
  });
  bar.addEventListener('change', seekFromBar);

  return { start, stop, paint };
}
