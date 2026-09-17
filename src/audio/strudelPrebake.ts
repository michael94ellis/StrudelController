import { registerSoundfonts } from '@strudel/soundfonts'
import { registerSynthSounds, registerZZFXSounds, samples } from '@strudel/web'

const DOUGH_RAW = 'https://raw.githubusercontent.com/felixroos/dough-samples/main'
const DOUGH_JSdelivr = 'https://cdn.jsdelivr.net/gh/felixroos/dough-samples@main'

let registered = false

/** Optional Dirt name index (crackle-adjacent FX, casio, etc.) — never block playback. */
async function loadDirtSampleIndex(): Promise<void> {
  const candidates = [
    `${DOUGH_RAW}/Dirt-Samples.json`,
    'github:tidalcycles/dirt-samples',
    `${DOUGH_JSdelivr}/Dirt-Samples.json`,
  ]
  for (const url of candidates) {
    try {
      await samples(url, '', { prebake: false })
      console.info(`[beat-studio] Dirt sample index loaded from ${url}`)
      return
    } catch (err) {
      console.warn(`[beat-studio] Dirt sample index failed (${url})`, err)
    }
  }
  console.warn(
    '[beat-studio] Dirt sample index unavailable — synth/GM/drums still work; named Dirt samples may be missing.',
  )
}

/**
 * Match strudel.cc REPL: oscillators, noise, zzfx, GM soundfonts (CDN),
 * and the Dirt sample index when the network allows.
 */
export async function registerStrudelSounds(): Promise<void> {
  if (registered) return
  registerSynthSounds()
  registerZZFXSounds()
  try {
    registerSoundfonts()
  } catch (err) {
    console.warn('[beat-studio] GM soundfonts failed to register', err)
  }
  // Never block audio startup on the huge Dirt index (can hang or clobber bd/sd/hh).
  void loadDirtSampleIndex()
  registered = true
}
