import type {
  Instrument,
  Part,
  Progression,
  Section,
  Song,
} from '../types'
import { newId } from '../types'
import {
  anthemProgression,
  cafeProgression,
  popProgression,
} from '../theory'
import { instrumentDefs } from '../instruments/registry'
import { generatorDefs } from '../generators/registry'
import { getStyle, SOFT_CHORDS } from './catalog'
import type {
  BuiltStyle,
  PartSpec,
  SectionSpec,
  SongKnobs,
  StyleLayerBuckets,
  StyleRecipe,
  InstSpec,
} from './types'
import { DEFAULT_KNOBS } from './types'

function inst(spec: InstSpec): Instrument {
  return {
    id: newId('inst'),
    name: spec.name,
    kind: spec.kind,
    params: { ...instrumentDefs[spec.kind].defaultParams, ...spec.params },
  }
}

function makePart(
  spec: PartSpec,
  instrumentId: string,
): Part {
  return {
    id: newId('part'),
    name: spec.name,
    instrumentId,
    generator: spec.generator,
    params: {
      ...generatorDefs[spec.generator].defaultParams,
      ...spec.params,
    },
    enabled: true,
  }
}

function progressionOf(
  kind: StyleRecipe['progressions'][number],
  id: string,
): Progression {
  if (kind === 'anthem') return { ...anthemProgression(id), id }
  if (kind === 'cafe') return { ...cafeProgression(id), id }
  if (kind === 'soft') {
    return {
      id,
      name: 'I–IV–vi–V',
      chords: SOFT_CHORDS,
    }
  }
  return { ...popProgression(id), id }
}

function buildFromRecipe(recipe: StyleRecipe, title?: string): BuiltStyle {
  const instruments = recipe.instruments.map(inst)
  const byName = Object.fromEntries(instruments.map((i) => [i.name, i]))

  const progressions = recipe.progressions.map((kind, i) =>
    progressionOf(kind, `prog-${i}`),
  )

  const parts: Part[] = []
  const layers: StyleLayerBuckets = { quiet: [], groove: [], full: [] }

  for (const spec of recipe.parts) {
    const instrument = byName[spec.instrument]
    if (!instrument) continue
    const p = makePart(spec, instrument.id)
    parts.push(p)
    for (const bucket of spec.layers) {
      layers[bucket].push(p.id)
    }
  }

  const sections: Section[] = recipe.sections.map((sec) => {
    const progression = progressions[sec.progression] ?? progressions[0]
    const partIds = layers[sec.energy]
    return {
      id: newId('sec'),
      name: sec.name,
      bars: sec.bars,
      progressionId: progression.id,
      parts: partIds.map((partId) => ({ partId })),
      mods: sec.mods,
    }
  })

  const sectionByName = Object.fromEntries(sections.map((s) => [s.name, s]))
  const arrangement = recipe.arrangement
    .map((name) => sectionByName[name])
    .filter(Boolean)
    .map((s) => ({ sectionId: s.id }))

  const e = recipe.entry
  const song: Song = {
    id: newId('song'),
    title: title ?? `${e.label}`,
    globals: {
      bpm: e.bpm,
      key: e.key,
      scale: e.scale,
      swing: 0.1,
    },
    instruments,
    progressions,
    parts,
    sections,
    arrangement,
    styleId: e.id,
    knobs: { ...DEFAULT_KNOBS },
    styleLayers: layers,
  }

  return { song, layers, knobs: { ...DEFAULT_KNOBS } }
}

function kit(
  _entryId: string,
  drums: Partial<InstSpec['params']>,
  bass: Partial<InstSpec['params']>,
  keys: Partial<InstSpec['params']> & { kind?: InstSpec['kind'] },
  lead?: Partial<InstSpec['params']> & { kind?: InstSpec['kind']; name?: string },
): InstSpec[] {
  const list: InstSpec[] = [
    { kind: 'drumkit', name: 'Drums', params: { bank: 'RolandTR909', gain: 0.65, ...drums } },
    { kind: 'subBass', name: 'Bass', params: { wave: 'sawtooth', cutoff: 480, gain: 0.4, ...bass } },
    {
      kind: keys.kind ?? 'pluck',
      name: 'Keys',
      params: { gain: 0.35, room: 0.35, ...keys },
    },
  ]
  if (lead) {
    list.push({
      kind: lead.kind ?? 'lead',
      name: lead.name ?? 'Lead',
      params: { gain: 0.28, ...lead },
    })
  }
  return list
}

function stdSections(
  energyMap: Partial<Record<string, SectionSpec['energy']>> = {},
): SectionSpec[] {
  return [
    {
      name: 'intro',
      bars: 4,
      progression: 0,
      energy: energyMap.intro ?? 'quiet',
      mods: [{ type: 'fadeIn' }],
    },
    {
      name: 'verse',
      bars: 8,
      progression: 0,
      energy: energyMap.verse ?? 'groove',
    },
    {
      name: 'chorus',
      bars: 8,
      progression: 1,
      energy: energyMap.chorus ?? 'full',
    },
    {
      name: 'verse',
      bars: 8,
      progression: 0,
      energy: energyMap.verse ?? 'groove',
    },
    {
      name: 'chorus',
      bars: 8,
      progression: 1,
      energy: energyMap.chorus ?? 'full',
    },
    {
      name: 'outro',
      bars: 4,
      progression: 0,
      energy: energyMap.outro ?? 'quiet',
      mods: [{ type: 'fadeOut' }],
    },
  ]
}

/** Dedupe section names for arrangement — allow duplicate verse/chorus by unique build */
function sectionsUnique(specs: SectionSpec[]): SectionSpec[] {
  const seen = new Map<string, number>()
  return specs.map((s) => {
    const n = (seen.get(s.name) ?? 0) + 1
    seen.set(s.name, n)
    if (n === 1) return s
    return { ...s, name: `${s.name} ${n}` }
  })
}

function arrangementFrom(specs: SectionSpec[]): string[] {
  return specs.map((s) => s.name)
}

type QuickParts = {
  drumsQuiet?: Partial<PartSpec>
  drumsGroove: Partial<PartSpec> & Pick<PartSpec, 'generator'>
  drumsFull?: Partial<PartSpec>
  bass: Partial<PartSpec> & Pick<PartSpec, 'generator'>
  keysQuiet?: Partial<PartSpec>
  keysGroove: Partial<PartSpec> & Pick<PartSpec, 'generator'>
  keysFull?: Partial<PartSpec>
  lead?: Partial<PartSpec> & Pick<PartSpec, 'generator'>
  extra?: PartSpec[]
}

function partsFrom(q: QuickParts): PartSpec[] {
  const out: PartSpec[] = [
    {
      name: 'Drums soft',
      instrument: 'Drums',
      generator: q.drumsQuiet?.generator ?? 'sparsePulse',
      params: { density: 0.35, ...q.drumsQuiet?.params },
      layers: ['quiet'],
    },
    {
      name: 'Drums groove',
      instrument: 'Drums',
      generator: q.drumsGroove.generator,
      params: { density: 0.7, ...q.drumsGroove.params },
      layers: ['groove', 'full'],
    },
    {
      name: 'Drums full',
      instrument: 'Drums',
      generator: q.drumsFull?.generator ?? q.drumsGroove.generator,
      params: { density: 0.9, openHats: true, ...q.drumsFull?.params },
      layers: ['full'],
    },
    {
      name: 'Bass',
      instrument: 'Bass',
      generator: q.bass.generator,
      params: { octave: 2, ...q.bass.params },
      layers: ['quiet', 'groove', 'full'],
    },
    {
      name: 'Chords soft',
      instrument: 'Keys',
      generator: q.keysQuiet?.generator ?? q.keysGroove.generator,
      params: { rhythm: 'whole', ...q.keysQuiet?.params },
      layers: ['quiet'],
    },
    {
      name: 'Chords',
      instrument: 'Keys',
      generator: q.keysGroove.generator,
      params: { rhythm: 'half', ...q.keysGroove.params },
      layers: ['groove', 'full'],
    },
  ]
  if (q.keysFull) {
    out.push({
      name: 'Chords lift',
      instrument: 'Keys',
      generator: q.keysFull.generator ?? q.keysGroove.generator,
      params: { rhythm: 'syncopated', ...q.keysFull.params },
      layers: ['full'],
    })
  }
  if (q.lead) {
    out.push({
      name: 'Hook',
      instrument: 'Lead',
      generator: q.lead.generator,
      params: { density: 0.55, ...q.lead.params },
      layers: ['full'],
    })
  }
  if (q.extra) out.push(...q.extra)
  return out
}

function recipe(
  entryId: string,
  instruments: InstSpec[],
  progressions: StyleRecipe['progressions'],
  partQuick: QuickParts,
  sectionOverride?: Partial<Record<string, SectionSpec['energy']>>,
): StyleRecipe {
  const entry = getStyle(entryId)
  if (!entry) throw new Error(`Unknown style ${entryId}`)
  const sections = sectionsUnique(stdSections(sectionOverride))
  return {
    entry,
    instruments,
    progressions,
    parts: partsFrom(partQuick),
    sections,
    arrangement: arrangementFrom(sections),
  }
}

const RECIPES: Record<string, () => StyleRecipe> = {
  house: () =>
    recipe(
      'house',
      kit(
        'house',
        { bank: 'RolandTR909', gain: 0.8, crunch: 0 },
        { wave: 'sawtooth', cutoff: 520, gain: 0.48, attack: 0.005, release: 0.12 },
        { kind: 'pluck', cutoff: 3600, gain: 0.28, delay: 0.15, room: 0.25 },
        { kind: 'lead', wave: 'sawtooth', gain: 0.18, cutoff: 2400, delay: 0.25 },
      ),
      ['anthem', 'pop'],
      {
        drumsQuiet: { generator: 'houseKit', params: { energy: 0.4 } },
        drumsGroove: { generator: 'houseKit', params: { energy: 0.85 } },
        drumsFull: { generator: 'houseKit', params: { energy: 1 } },
        bass: { generator: 'houseBass', params: { octave: 2 } },
        keysQuiet: {
          generator: 'chordStabs',
          params: { voicing: 'triad', rhythm: 'whole' },
        },
        keysGroove: {
          generator: 'chordStabs',
          params: { voicing: 'triad', rhythm: 'syncopated' },
        },
        lead: { generator: 'arpUp', params: { speed: 16, octave: 5 } },
      },
    ),

  videogame: () =>
    recipe(
      'videogame',
      [
        {
          kind: 'drumkit',
          name: 'Drums',
          params: { bank: 'RolandTR909', gain: 0.48, crunch: 0 },
        },
        {
          kind: 'subBass',
          name: 'Bass',
          params: { wave: 'square', cutoff: 520, gain: 0.32, attack: 0.01, release: 0.15 },
        },
        {
          kind: 'pluck',
          name: 'Keys',
          params: { gain: 0.3, room: 0.35, delay: 0.2, cutoff: 3000 },
        },
        {
          kind: 'lead',
          name: 'Lead',
          params: { wave: 'square', gain: 0.26, cutoff: 3200, room: 0.3, delay: 0.18 },
        },
        {
          kind: 'texture',
          name: 'Air',
          params: { mode: 'wind', gain: 0.08, room: 0.8, cutoff: 450 },
        },
      ],
      ['soft', 'pop'],
      {
        drumsQuiet: { generator: 'chiptuneKit', params: { energy: 0.3 } },
        drumsGroove: { generator: 'chiptuneKit', params: { energy: 0.55 } },
        drumsFull: { generator: 'chiptuneKit', params: { energy: 0.85 } },
        bass: { generator: 'rootBass', params: { rhythm: 'quarters', octave: 2 } },
        keysQuiet: {
          generator: 'chordStabs',
          params: { voicing: 'triad', rhythm: 'whole' },
        },
        keysGroove: { generator: 'chiptuneArp', params: { octave: 4 } },
        lead: { generator: 'melodyPhrase', params: { density: 0.55, octave: 5 } },
        extra: [
          {
            name: 'Air',
            instrument: 'Air',
            generator: 'ambientGrain',
            layers: ['quiet', 'groove', 'full'],
          },
        ],
      },
    ),

  trap: () =>
    recipe(
      'trap',
      kit(
        'trap',
        { bank: 'RolandTR808', gain: 0.74, crunch: 0.08 },
        { wave: 'sine', cutoff: 220, gain: 0.58, attack: 0.01, release: 0.55 },
        { kind: 'pad', gain: 0.18, cutoff: 900, room: 0.75 },
        { kind: 'lead', wave: 'triangle', gain: 0.2, cutoff: 1800, delay: 0.3 },
      ),
      ['anthem', 'anthem'],
      {
        drumsQuiet: { generator: 'trapKit', params: { energy: 0.4 } },
        drumsGroove: { generator: 'trapKit', params: { energy: 0.8 } },
        drumsFull: { generator: 'trapKit', params: { energy: 1 } },
        bass: { generator: 'trapBass', params: { octave: 1 } },
        keysQuiet: {
          generator: 'chordStabs',
          params: { voicing: 'triad', rhythm: 'whole' },
        },
        keysGroove: {
          generator: 'chordStabs',
          params: { voicing: 'triad', rhythm: 'whole' },
        },
        lead: { generator: 'melodyPhrase', params: { density: 0.3, octave: 5 } },
      },
    ),

  lofi: () =>
    recipe(
      'lofi',
      [
        {
          kind: 'drumkit',
          name: 'Drums',
          params: { bank: 'AkaiLinn', gain: 0.42, crunch: 0.18 },
        },
        {
          kind: 'subBass',
          name: 'Bass',
          params: { wave: 'triangle', cutoff: 320, gain: 0.32, release: 0.35 },
        },
        {
          kind: 'piano',
          name: 'Keys',
          params: { gain: 0.38, room: 0.6, delay: 0.22 },
        },
        {
          kind: 'texture',
          name: 'Air',
          params: { mode: 'noise', gain: 0.06, room: 0.85, cutoff: 600, shimmer: true },
        },
      ],
      ['soft', 'cafe'],
      {
        drumsQuiet: { generator: 'lofiKit', params: { energy: 0.3 } },
        drumsGroove: { generator: 'lofiKit', params: { energy: 0.55 } },
        drumsFull: { generator: 'lofiKit', params: { energy: 0.75 } },
        bass: { generator: 'walkingBass', params: { octave: 2 } },
        keysQuiet: { generator: 'lofiKeys', params: { octave: 3 } },
        keysGroove: { generator: 'lofiKeys', params: { octave: 3 } },
        keysFull: {
          generator: 'melodyPhrase',
          params: { density: 0.35, octave: 4 },
        },
        extra: [
          {
            name: 'Dust',
            instrument: 'Air',
            generator: 'ambientGrain',
            layers: ['quiet', 'groove', 'full'],
          },
        ],
      },
    ),
}

export function buildStyle(styleId: string, title?: string): BuiltStyle {
  const factory = RECIPES[styleId] ?? RECIPES.house
  const entry = getStyle(styleId) ?? getStyle('house')
  return buildFromRecipe(factory(), title ?? entry?.label ?? 'House')
}

export function applyKnobsToSong(song: Song, knobs: SongKnobs): Song {
  const energy = knobs.energy
  const density = knobs.density
  const brightness = knobs.brightness
  const groove = knobs.groove

  const swing = 0.05 + groove * 0.2

  const instruments = song.instruments.map((inst) => {
    const params = { ...inst.params }
    if (typeof params.gain === 'number') {
      const base = params.gain
      params.gain = Math.min(1, Math.max(0.05, base * (0.55 + energy * 0.9)))
    }
    if (typeof params.cutoff === 'number') {
      const base = params.cutoff
      params.cutoff = Math.round(base * (0.55 + brightness * 0.9))
    }
    return { ...inst, params }
  })

  const parts = song.parts.map((p) => {
    const params = { ...p.params }
    if (typeof params.density === 'number') {
      const base = params.density
      params.density = Math.min(1, Math.max(0.15, base * (0.5 + density * 0.9)))
    }
    if (typeof params.energy === 'number') {
      const base = params.energy
      params.energy = Math.min(1, Math.max(0.2, base * (0.45 + density * 0.9)))
    }
    return { ...p, params }
  })

  return {
    ...song,
    knobs: { ...knobs },
    globals: { ...song.globals, swing },
    instruments,
    parts,
  }
}

export function setSongSectionEnergy(
  song: Song,
  sectionId: string,
  energy: 'quiet' | 'groove' | 'full',
): Song {
  const layers = song.styleLayers
  if (!layers) return song
  const partIds = layers[energy] ?? []
  return {
    ...song,
    sections: song.sections.map((sec) =>
      sec.id === sectionId
        ? { ...sec, parts: partIds.map((partId) => ({ partId })) }
        : sec,
    ),
  }
}
