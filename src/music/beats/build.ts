import type { Beat, BeatLayer, GeneratorName, InstrumentKind } from '../types'
import { newId } from '../types'
import { DEFAULT_PROGRESSION_ID } from '../theory'
import { generatorDefs } from '../generators/registry'
import { instrumentDefs } from '../instruments/registry'
import { withStrudelDefaults } from '../strudelSounds'
import { GENRES, getGenre } from '../genres'
import type { GenreLayer, GenreModule } from '../genres'
import {
  isMelodicKind,
  patternStyleIdsForLayer,
  progressionToChordStyles,
} from '../layerStyles'

function layerFrom(spec: GenreLayer, beatProgressionId: string): BeatLayer {
  const progressionId = spec.progressionId ?? beatProgressionId
  const chord = progressionToChordStyles(progressionId)
  return {
    id: newId('layer'),
    name: spec.name,
    enabled: true,
    kind: spec.kind,
    instrumentParams: withStrudelDefaults(spec.kind, {
      ...instrumentDefs[spec.kind].defaultParams,
      ...spec.instrumentParams,
    }),
    generator: spec.generator,
    params: { ...generatorDefs[spec.generator].defaultParams, ...spec.params },
    progressionId,
    patternStyleIds: patternStyleIdsForLayer(spec.generator, spec.kind),
    chordStyleIds: chord.chordStyleIds,
    chordLength: chord.chordLength,
  }
}

/** Generators that make sense for an instrument kind, best match first. */
export function generatorsFor(kind: InstrumentKind): GeneratorName[] {
  const all = Object.values(generatorDefs)
  const fitting = all.filter((g) => g.suits.includes(kind)).map((g) => g.name)
  return fitting.length ? fitting : all.map((g) => g.name)
}

/** A fresh layer for `kind`, using the first generator that suits it. */
export function defaultLayer(kind: InstrumentKind): BeatLayer {
  const generator = generatorsFor(kind)[0]
  const layer = layerFrom(
    { name: instrumentDefs[kind].label, kind, generator },
    DEFAULT_PROGRESSION_ID,
  )
  return {
    ...layer,
    instrumentParams: withStrudelDefaults(kind, layer.instrumentParams),
  }
}

/** The layer stack a genre starts from, with fresh ids. */
export function layersForGenre(genreId: string): BeatLayer[] {
  const genre = getGenre(genreId) ?? GENRES[0]
  return genre.layers.map((l) => layerFrom(l, genre.defaultProgressionId))
}

export function createBeat(genreId?: string, name?: string): Beat {
  const genre: GenreModule = (genreId ? getGenre(genreId) : undefined) ?? GENRES[0]
  return {
    id: newId('beat'),
    name: name ?? genre.label,
    genreId: genre.id,
    bpm: genre.bpm,
    key: genre.key,
    scale: genre.scale,
    variation: 0,
    layers: layersForGenre(genre.id),
  }
}

/** Re-template a beat onto another genre, keeping its name. */
export function applyGenre(beat: Beat, genreId: string): Beat {
  const genre = getGenre(genreId)
  if (!genre) return beat
  return {
    ...beat,
    genreId: genre.id,
    bpm: genre.bpm,
    key: genre.key,
    scale: genre.scale,
    variation: 0,
    layers: genre.layers.map((l) => layerFrom(l, genre.defaultProgressionId)),
  }
}

export function duplicateLayer(layer: BeatLayer): BeatLayer {
  return {
    ...layer,
    id: newId('layer'),
    name: `${layer.name} copy`,
    instrumentParams: { ...layer.instrumentParams },
    params: { ...layer.params },
    progressionId: layer.progressionId,
  }
}

/**
 * Swap a layer's voice. Generator params carry over, but the generator itself
 * is re-picked when the current one doesn't suit the new kind.
 */
export function withKind(layer: BeatLayer, kind: InstrumentKind): BeatLayer {
  const def = instrumentDefs[kind]
  let generator: GeneratorName
  if (kind === 'drumkit') generator = 'drumCompose'
  else if (kind === 'subBass') generator = 'bassCompose'
  else if (isMelodicKind(kind)) generator = 'melodyCompose'
  else {
    const suits = generatorDefs[layer.generator]?.suits.includes(kind)
    generator = suits ? layer.generator : generatorsFor(kind)[0]
  }
  const patternStyleIds = patternStyleIdsForLayer(generator, kind)
  return {
    ...layer,
    kind,
    instrumentParams: { ...def.defaultParams },
    generator,
    params: { flavorIds: patternStyleIds.join(',') },
    patternStyleIds,
  }
}

export function withGenerator(layer: BeatLayer, generator: GeneratorName): BeatLayer {
  const patternStyleIds = patternStyleIdsForLayer(generator, layer.kind)
  return {
    ...layer,
    generator,
    params: { flavorIds: patternStyleIds.join(',') },
    patternStyleIds,
  }
}
