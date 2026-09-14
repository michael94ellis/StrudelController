import {
  initStrudel,
  evaluate,
  hush,
  samples,
  getAudioContext,
  resetGlobalEffects,
} from '@strudel/web'

let ready: Promise<void> | null = null
let playing = false
/** Bumps on every stop so in-flight play/refresh calls can bail out. */
let session = 0

const DOUGH = 'https://raw.githubusercontent.com/felixroos/dough-samples/main'
/** Actual audio files live in ritchse/tidal-drum-machines (JSON `_base`) */
const DRUM_MACHINES =
  'https://raw.githubusercontent.com/ritchse/tidal-drum-machines/main/machines/'

export function isPlaying() {
  return playing
}

export function getSession() {
  return session
}

export async function ensureStrudel(): Promise<void> {
  if (ready) return ready

  ready = (async () => {
    await initStrudel({
      prebake: async () => {
        await Promise.all([
          // Pass the real machines base — dough-samples only hosts the JSON map
          samples(`${DOUGH}/tidal-drum-machines.json`, DRUM_MACHINES, {
            prebake: true,
          }),
          samples(`${DOUGH}/piano.json`, `${DOUGH}/piano/`, { prebake: true }),
          samples(`${DOUGH}/Dirt-Samples.json`, `${DOUGH}/Dirt-Samples/`, {
            prebake: true,
          }),
        ])
      },
    })
  })()

  try {
    await ready
  } catch (err) {
    ready = null
    throw err
  }

  return ready
}

/**
 * Hard stop: halt the scheduler (cycle → 0) and clear delay/reverb buses
 * so stop feels immediate instead of leaving FX tails running.
 */
export function stopCode(): void {
  session += 1
  playing = false
  try {
    hush() // repl.stop() — stops clock + resets cycle position
  } catch {
    // not initialized yet
  }
  try {
    resetGlobalEffects()
  } catch {
    // audio stack may not be ready
  }
}

/**
 * Start (or hard-restart) playback from cycle 0.
 * Always stops first so arrange/song form resets to the beginning.
 */
export async function playCode(code: string): Promise<void> {
  await ensureStrudel()
  try {
    const ac = getAudioContext()
    if (ac.state === 'suspended') await ac.resume()
  } catch {
    // ignore
  }

  stopCode()
  const runId = session

  await evaluate(code, true)

  // User hit Stop while evaluate was awaiting — stay stopped
  if (session !== runId) {
    try {
      hush()
      resetGlobalEffects()
    } catch {
      // ignore
    }
    playing = false
    return
  }

  playing = true
}

/**
 * Hot-swap pattern without resetting the clock (live param tweaks).
 */
export async function updateCode(code: string): Promise<void> {
  if (!playing) return
  await ensureStrudel()
  const runId = session
  await evaluate(code, true)
  if (session !== runId) return
  playing = true
}
