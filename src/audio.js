import { evaluate, hush, initStrudel, resetGlobalEffects, silence } from '@strudel/web';

let ready = null;
let repl = null;
let ticket = 0;
let activeSession = 0;
let loopCycles = 0;

export function bootAudio() {
  ready = initStrudel().then((instance) => {
    repl = instance;
    return instance;
  });
  return ready;
}

export function setPlaybackLoop(cycles) {
  loopCycles = Math.max(0, Number(cycles) || 0);
}

/** Call evaluate in the same turn as the click so the browser unlocks audio. */
export function playCode(code, { loopCycles: cycles } = {}) {
  if (cycles != null) setPlaybackLoop(cycles);
  const mine = ++ticket;
  activeSession = mine;
  let pending;
  try {
    pending = evaluate(code, true);
  } catch (error) {
    return Promise.reject(error);
  }
  return Promise.resolve(pending).then(
    (value) => {
      if (mine !== activeSession) {
        if (!activeSession) cutAudio();
        return undefined;
      }
      return value;
    },
    (error) => {
      if (mine !== activeSession) return undefined;
      throw error;
    },
  );
}

function cutAudio() {
  try {
    repl?.setPattern(silence, false);
    hush();
    resetGlobalEffects();
  } catch {
    // Engine not ready yet.
  }
}

export function stopAudio() {
  ticket += 1;
  activeSession = 0;
  loopCycles = 0;
  cutAudio();
}

function wrapCycle(cycle) {
  if (!loopCycles) return Math.max(0, cycle);
  const wrapped = cycle % loopCycles;
  return wrapped < 0 ? wrapped + loopCycles : wrapped;
}

function jumpSchedulerTo(cycle) {
  const scheduler = repl?.scheduler;
  if (!scheduler?.started) return;
  const target = wrapCycle(cycle);
  const t = scheduler.getTime();
  const duration = scheduler.clock.duration;
  scheduler.lastEnd = target;
  scheduler.lastBegin = target;
  scheduler.num_cycles_at_cps_change = target;
  scheduler.num_ticks_since_cps_change = 0;
  scheduler.seconds_at_cps_change = t + duration;
  scheduler.lastTick = t;
}

/** @returns {{ playing: boolean, progress: number, seconds: number, duration: number }} */
export function getPlaybackState() {
  const scheduler = repl?.scheduler;
  if (!scheduler?.started || !loopCycles) {
    return { playing: false, progress: 0, seconds: 0, duration: 0 };
  }
  const cps = scheduler.cps || 0.5;
  const secondsPerCycle = 1 / cps;
  const cycles = wrapCycle(scheduler.now());
  const duration = loopCycles * secondsPerCycle;
  return {
    playing: true,
    progress: loopCycles ? cycles / loopCycles : 0,
    seconds: cycles * secondsPerCycle,
    duration,
  };
}

/** Seek within the current loop. Progress is 0–1. */
export function seekPlayback(progress) {
  if (!repl?.scheduler?.started || !loopCycles) return;
  const clamped = Math.min(1, Math.max(0, Number(progress) || 0));
  jumpSchedulerTo(clamped * loopCycles);
}
