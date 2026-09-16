import type { Beat } from './types'
import { createBeat } from './beats/build'
import { DEFAULT_PROGRESSION_ID, getProgression } from './theory'
import { withStrudelDefaults } from './strudelSounds'

const STORAGE_KEY = 'beat-studio:beats'
const STORAGE_VERSION = 7

export type BeatLibrary = {
  version: number
  activeBeatId: string
  beats: Beat[]
}

function seed(): BeatLibrary {
  const beat = createBeat('house', 'My beat')
  return { version: STORAGE_VERSION, activeBeatId: beat.id, beats: [beat] }
}

export function loadLibrary(): BeatLibrary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as BeatLibrary
    if (!parsed || !Array.isArray(parsed.beats) || parsed.beats.length === 0) {
      return seed()
    }
    let beats = parsed.beats
    if (parsed.version !== STORAGE_VERSION) {
      beats = beats.map((b) => {
        let beat = b
        if (parsed.version < 6) {
          const bars = getProgression(beat.progressionId).chords.length
          if (bars < 8) beat = { ...beat, progressionId: DEFAULT_PROGRESSION_ID }
        }
        if (parsed.version < 7) {
          beat = {
            ...beat,
            layers: beat.layers.map((layer) => ({
              ...layer,
              instrumentParams: withStrudelDefaults(layer.kind, layer.instrumentParams),
            })),
          }
        }
        return beat
      })
    }
    const activeBeatId = beats.some((b) => b.id === parsed.activeBeatId)
      ? parsed.activeBeatId
      : beats[0].id
    return { version: STORAGE_VERSION, activeBeatId, beats }
  } catch {
    return seed()
  }
}

export function saveLibrary(beats: Beat[], activeBeatId: string): void {
  try {
    const blob: BeatLibrary = { version: STORAGE_VERSION, activeBeatId, beats }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob))
  } catch (err) {
    console.warn('[beat-studio] failed to save library', err)
  }
}

export function uniqueBeatName(base: string, beats: Beat[], exceptId?: string): string {
  const names = new Set(beats.filter((b) => b.id !== exceptId).map((b) => b.name))
  if (!names.has(base)) return base
  let n = 2
  while (names.has(`${base} ${n}`)) n += 1
  return `${base} ${n}`
}
