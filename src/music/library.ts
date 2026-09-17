import type { Beat, BeatLayer } from './types'
import { applyGenre, createBeat } from './beats/build'
import { DEFAULT_PROGRESSION_ID, getProgression } from './theory'
import { patternStyleIdsForLayer, progressionToChordStyles, isMelodicKind } from './layerStyles'
import { migrateDrumFlavorIds } from './drumFlavors'
import { migrateBassFlavorIds } from './bassFlavors'
import { migrateMelodyFlavorIds } from './melodyFlavors'
import { withStrudelDefaults } from './strudelSounds'

const STORAGE_KEY = 'beat-studio:beats'
const STORAGE_VERSION = 15

export type BeatLibrary = {
  version: number
  activeBeatId: string
  beats: Beat[]
}

type LegacyKnobs = {
  energy?: number
  density?: number
  groove?: number
  brightness?: number
}

type LegacyLayer = BeatLayer & {
  energy?: number
  density?: number
}

type LegacyBeat = Beat & {
  progressionId?: string
  knobs?: LegacyKnobs
  layers: LegacyLayer[]
}

function normalizeLayer(layer: LegacyLayer, beatProgressionId: string): BeatLayer {
  const { energy: _e, density: _d, ...rest } = layer
  const progressionId = layer.progressionId ?? beatProgressionId
  const chord =
    layer.chordStyleIds?.length
      ? { chordStyleIds: layer.chordStyleIds, chordLength: layer.chordLength ?? 4 }
      : progressionToChordStyles(progressionId)
  let patternStyleIds =
    layer.patternStyleIds?.length
      ? layer.patternStyleIds
      : patternStyleIdsForLayer(layer.generator, layer.kind)

  if (layer.kind === 'drumkit') {
    patternStyleIds = migrateDrumFlavorIds(patternStyleIds)
    return {
      ...rest,
      progressionId,
      patternStyleIds,
      chordStyleIds: chord.chordStyleIds,
      chordLength: chord.chordLength,
      generator: 'drumCompose',
      params: { flavorIds: patternStyleIds.join(',') },
    }
  }

  if (layer.kind === 'subBass') {
    patternStyleIds = migrateBassFlavorIds(patternStyleIds)
    return {
      ...rest,
      progressionId,
      patternStyleIds,
      chordStyleIds: chord.chordStyleIds,
      chordLength: chord.chordLength,
      generator: 'bassCompose',
      params: { flavorIds: patternStyleIds.join(',') },
    }
  }

  if (isMelodicKind(layer.kind)) {
    patternStyleIds = migrateMelodyFlavorIds(patternStyleIds)
    return {
      ...rest,
      progressionId,
      patternStyleIds,
      chordStyleIds: chord.chordStyleIds,
      chordLength: chord.chordLength,
      generator: 'melodyCompose',
      params: { flavorIds: patternStyleIds.join(',') },
    }
  }

  return {
    ...rest,
    progressionId,
    patternStyleIds,
    chordStyleIds: chord.chordStyleIds,
    chordLength: chord.chordLength,
  }
}

function finalizeBeat(b: LegacyBeat): Beat {
  const beatProg = b.progressionId ?? DEFAULT_PROGRESSION_ID
  const layers = b.layers.map((layer) => normalizeLayer(layer, beatProg))
  const { progressionId: _p, knobs: _k, ...rest } = b
  return { ...rest, layers, variation: b.variation ?? 0 }
}

function migrateBeat(beat: LegacyBeat, fromVersion: number): Beat {
  let b = beat

  if (fromVersion < 6) {
    const bars = getProgression(b.progressionId ?? DEFAULT_PROGRESSION_ID).chords.length
    if (bars < 8) b = { ...b, progressionId: DEFAULT_PROGRESSION_ID }
  }
  if (fromVersion < 7) {
    b = {
      ...b,
      layers: b.layers.map((layer) => ({
        ...layer,
        instrumentParams: withStrudelDefaults(layer.kind, layer.instrumentParams),
      })),
    }
  }
  if (fromVersion < 8) {
    if (b.genreId === 'metal' || b.genreId === 'hardcore') {
      b = { ...applyGenre(b as Beat, 'house'), name: b.name, progressionId: b.progressionId }
    }
    b = { ...b, variation: b.variation ?? 0 }
  }
  if (fromVersion < 15) {
    // Old default was 16-bar "journey", which made Record 1× ~30s. Keep intentional
    // Long-loop moods; shrink everything else to a 4-bar cycle.
    const longDegrees = ['deg:vi', 'deg:IV', 'deg:I', 'deg:V']
    b = {
      ...b,
      layers: b.layers.map((layer) => {
        if ((layer.chordLength ?? 4) !== 16) return layer
        const ids = layer.chordStyleIds ?? []
        const isLongMood =
          ids.length === longDegrees.length && longDegrees.every((d) => ids.includes(d))
        if (isLongMood) return layer
        return { ...layer, chordLength: 4 as const }
      }),
    }
  }

  return finalizeBeat(b)
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
    let beats =
      parsed.version !== STORAGE_VERSION
        ? parsed.beats.map((b) => migrateBeat(b as LegacyBeat, parsed.version ?? 0))
        : parsed.beats.map((b) => finalizeBeat(b as LegacyBeat))
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
