import { getFontBufferSource } from '@strudel/soundfonts'
import { getAudioContext, getSound } from '@strudel/web'
import type { Beat } from '../music/types'
import { resolveProgression } from '../music/layerStyles'
import { pickStrudelSound, DEFAULT_STRUDEL_SOUND } from '../music/strudelSounds'
import { resolveHarmony } from '../music/theory'

/**
 * Decode GM soundfont pitches used by the active beat before Play.
 * Without this, new chord tones load mid-hit and land late (stutter).
 */
export async function preloadBeatFonts(beat: Beat): Promise<void> {
  let ac: AudioContext
  try {
    ac = getAudioContext()
  } catch {
    return
  }

  const jobs: Promise<unknown>[] = []
  const seen = new Set<string>()

  for (const layer of beat.layers) {
    if (!layer.enabled || layer.kind === 'drumkit') continue
    const soundName = pickStrudelSound(
      layer.instrumentParams,
      DEFAULT_STRUDEL_SOUND[layer.kind] ?? '',
    )
    if (!soundName.startsWith('gm_')) continue

    const sound = getSound(soundName)
    if (sound?.data?.type !== 'soundfont') continue
    const fonts = sound.data.fonts
    if (!Array.isArray(fonts) || fonts.length === 0) continue
    const font = String(fonts[0])

    const harmony = resolveHarmony(beat, resolveProgression(layer), 0)
    const notes = new Set<string>()
    for (const triad of harmony.triads) {
      for (const n of triad) notes.add(n)
    }
    for (const n of harmony.sevenths.flat()) notes.add(n)
    for (const n of harmony.roots) notes.add(n)

    // Cover nearby octaves stabs/bass often retarget.
    for (const n of [...notes]) {
      const pc = n.replace(/\d+$/, '')
      for (const oct of [2, 3, 4, 5]) notes.add(`${pc}${oct}`)
    }

    for (const note of notes) {
      const key = `${font}:::${note}`
      if (seen.has(key)) continue
      seen.add(key)
      jobs.push(
        getFontBufferSource(font, { note }, ac).catch((err: unknown) => {
          console.warn(`[beat-strudelio] font preload failed (${soundName} ${note})`, err)
        }),
      )
    }
  }

  if (jobs.length) await Promise.all(jobs)
}
