import { registerSoundfonts } from '@strudel/soundfonts'
import { registerSynthSounds, registerZZFXSounds, samples } from '@strudel/web'

const DOUGH_RAW = 'https://raw.githubusercontent.com/felixroos/dough-samples/main'
const DOUGH_JSdelivr = 'https://cdn.jsdelivr.net/gh/felixroos/dough-samples@main'

let registered = false

/**
 * Optional Dirt name index (crackle / casio / etc.).
 * Caller must reassert drum aliases afterward — this map overwrites bd/sd/hh.
 */
export async function loadDirtSampleIndex(): Promise<boolean> {
  const candidates = [
    `${DOUGH_RAW}/Dirt-Samples.json`,
    'github:tidalcycles/dirt-samples',
    `${DOUGH_JSdelivr}/Dirt-Samples.json`,
  ]
  for (const url of candidates) {
    try {
      await samples(url, '', { prebake: false })
      console.info(`[beat-studio] Dirt sample index loaded from ${url}`)
      return true
    } catch (err) {
      console.warn(`[beat-studio] Dirt sample index failed (${url})`, err)
    }
  }
  console.warn(
    '[beat-studio] Dirt sample index unavailable — synth/GM/drums still work; named Dirt samples may be missing.',
  )
  return false
}

/**
 * Match strudel.cc REPL: oscillators, noise, zzfx, GM soundfonts (CDN).
 * Dirt index is loaded separately so drum kits can win the bd/sd/hh names.
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
  registered = true
}
