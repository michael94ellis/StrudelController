import type { Beat, BeatLayer, GeneratorName, InstrumentKind } from '../types'
import { DEFAULT_KNOBS, newId } from '../types'
import { generatorDefs } from '../generators/registry'
import { instrumentDefs } from '../instruments/registry'
import { withStrudelDefaults } from '../strudelSounds'
import { GENRES, getGenre } from '../genres'
import type { GenreLayer, GenreModule } from '../genres'

function layerFrom(spec: GenreLayer): BeatLayer {
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
  const layer = layerFrom({ name: instrumentDefs[kind].label, kind, generator })
  return {
    ...layer,
    instrumentParams: withStrudelDefaults(kind, layer.instrumentParams),
  }
}

/** The layer stack a genre starts from, with fresh ids. */
export function layersForGenre(genreId: string): BeatLayer[] {
  const genre = getGenre(genreId) ?? GENRES[0]
  return genre.layers.map(layerFrom)
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
    progressionId: genre.defaultProgressionId,
    knobs: { ...DEFAULT_KNOBS },
    layers: layersForGenre(genre.id),
  }
}

/** Re-template a beat onto another genre, keeping its name and knobs. */
export function applyGenre(beat: Beat, genreId: string): Beat {
  const genre = getGenre(genreId)
  if (!genre) return beat
  return {
    ...beat,
    genreId: genre.id,
    bpm: genre.bpm,
    key: genre.key,
    scale: genre.scale,
    progressionId: genre.defaultProgressionId,
    layers: genre.layers.map(layerFrom),
  }
}

export function duplicateLayer(layer: BeatLayer): BeatLayer {
  return {
    ...layer,
    id: newId('layer'),
    name: `${layer.name} copy`,
    instrumentParams: { ...layer.instrumentParams },
    params: { ...layer.params },
  }
}

/**
 * Swap a layer's voice. Generator params carry over, but the generator itself
 * is re-picked when the current one doesn't suit the new kind.
 */
export function withKind(layer: BeatLayer, kind: InstrumentKind): BeatLayer {
  const def = instrumentDefs[kind]
  const suits = generatorDefs[layer.generator]?.suits.includes(kind)
  const generator = suits ? layer.generator : generatorsFor(kind)[0]
  return {
    ...layer,
    kind,
    instrumentParams: { ...def.defaultParams },
    generator,
    params: { ...generatorDefs[generator].defaultParams },
  }
}

export function withGenerator(layer: BeatLayer, generator: GeneratorName): BeatLayer {
  return {
    ...layer,
    generator,
    params: { ...generatorDefs[generator].defaultParams },
  }
}
