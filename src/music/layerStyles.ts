import type { BeatLayer, ChordSpec, GeneratorName, InstrumentKind, ParamMap, Progression } from './types'
import { generatorDefs } from './generators/registry'
import { DEFAULT_PROGRESSION_ID, getProgression } from './theory'
import {
  DEFAULT_DRUM_FLAVOR_IDS,
  DRUM_FLAVOR_SECTIONS,
  drumFlavorSummary,
  drumFlavorsForGenerator,
  flavorsInSection,
  migrateDrumFlavorIds,
} from './drumFlavors'

export type ChordLoopLength = 4 | 8 | 16

export type PatternStyleOption = {
  id: string
  label: string
  generator: GeneratorName
  params?: ParamMap
}

export type PatternStyleGroup = {
  id: string
  label: string
  /** One active choice per group (radio pills). Default true. */
  exclusive?: boolean
  /** When exclusive, clicking the active pill clears the group. */
  allowOff?: boolean
  options: PatternStyleOption[]
}

export type ChordDegreeToggle = {
  id: string
  label: string
  short: string
  chord: ChordSpec
}

const BASS_STYLES: PatternStyleOption[] = [
  { id: 'bass:root', label: 'Root notes', generator: 'rootBass' },
  { id: 'bass:walk', label: 'Walking', generator: 'walkingBass' },
  { id: 'bass:house', label: 'Pump', generator: 'houseBass' },
  { id: 'bass:trap', label: '808 glide', generator: 'trapBass' },
]

const MELODY_STYLES: PatternStyleOption[] = [
  { id: 'melody:stabs', label: 'Chord stabs', generator: 'chordStabs' },
  { id: 'melody:houseStabs', label: 'EDM stabs', generator: 'houseStabs' },
  { id: 'melody:arp', label: 'Arp up', generator: 'arpUp' },
  { id: 'melody:phrase', label: 'Melody phrase', generator: 'melodyPhrase' },
  { id: 'melody:improv', label: 'Improv', generator: 'improv' },
  { id: 'melody:ambient', label: 'Ambient', generator: 'ambientGrain' },
  { id: 'melody:chime', label: 'Chimes', generator: 'chimeHits' },
]

const DRUM_STYLE_GROUPS: PatternStyleGroup[] = DRUM_FLAVOR_SECTIONS.map((section) => ({
  id: `drum:${section.id}`,
  label: section.label,
  exclusive: false,
  options: flavorsInSection(section.id).map((f) => ({
    id: f.id,
    label: f.label,
    generator: 'drumCompose' as const,
  })),
}))

export const PATTERN_STYLE_GROUPS: Partial<Record<InstrumentKind, PatternStyleGroup[]>> = {
  drumkit: DRUM_STYLE_GROUPS,
  subBass: [{ id: 'bass', label: 'Bass line', options: BASS_STYLES }],
  pluck: [{ id: 'melody', label: 'Pattern', options: MELODY_STYLES }],
  piano: [{ id: 'melody', label: 'Pattern', options: MELODY_STYLES }],
  pad: [{ id: 'melody', label: 'Pattern', options: MELODY_STYLES }],
  lead: [{ id: 'melody', label: 'Pattern', options: MELODY_STYLES }],
  bell: [{ id: 'melody', label: 'Pattern', options: MELODY_STYLES }],
  texture: [{ id: 'melody', label: 'Pattern', options: MELODY_STYLES }],
  guitar: [{ id: 'melody', label: 'Pattern', options: MELODY_STYLES }],
}

export const CHORD_LOOP_LENGTHS: ChordLoopLength[] = [4, 8, 16]

export const CHORD_DEGREE_TOGGLES: ChordDegreeToggle[] = [
  { id: 'deg:I', label: 'I · home', short: 'I', chord: { degree: 'I', quality: 'maj7' } },
  { id: 'deg:ii', label: 'ii · setup', short: 'ii', chord: { degree: 'ii', quality: 'm7' } },
  { id: 'deg:iii', label: 'iii', short: 'iii', chord: { degree: 'iii', quality: 'm7' } },
  { id: 'deg:IV', label: 'IV · lift', short: 'IV', chord: { degree: 'IV', quality: 'maj7' } },
  { id: 'deg:V', label: 'V · tension', short: 'V', chord: { degree: 'V', quality: '7' } },
  { id: 'deg:vi', label: 'vi · mood', short: 'vi', chord: { degree: 'vi', quality: 'm7' } },
]

const DEGREE_ORDER = CHORD_DEGREE_TOGGLES.map((t) => t.id)

export const CHORD_PRESETS: Array<{ id: string; label: string; degrees: string[]; length: ChordLoopLength }> =
  [
    { id: 'preset:pop', label: 'Pop', degrees: ['deg:I', 'deg:vi', 'deg:IV', 'deg:V'], length: 4 },
    { id: 'preset:anthem', label: 'Anthem', degrees: ['deg:I', 'deg:V', 'deg:vi', 'deg:IV'], length: 4 },
    { id: 'preset:jazz', label: 'Jazz', degrees: ['deg:ii', 'deg:V', 'deg:I', 'deg:vi'], length: 4 },
    { id: 'preset:minor', label: 'Minor', degrees: ['deg:vi', 'deg:IV', 'deg:I', 'deg:V'], length: 4 },
    { id: 'preset:drone', label: 'Drone', degrees: ['deg:I'], length: 4 },
    { id: 'preset:long', label: 'Long', degrees: ['deg:vi', 'deg:IV', 'deg:I', 'deg:V'], length: 16 },
  ]

const patternOptionById = new Map<string, PatternStyleOption>()
for (const groups of Object.values(PATTERN_STYLE_GROUPS)) {
  for (const g of groups ?? []) {
    for (const o of g.options) patternOptionById.set(o.id, o)
  }
}

export function patternGroupsForKind(kind: InstrumentKind): PatternStyleGroup[] {
  return PATTERN_STYLE_GROUPS[kind] ?? PATTERN_STYLE_GROUPS.lead!
}

export function patternStyleIdForGenerator(generator: GeneratorName, kind: InstrumentKind): string {
  if (kind === 'drumkit') {
    return drumFlavorsForGenerator(generator)[0] ?? DEFAULT_DRUM_FLAVOR_IDS[0]
  }
  for (const g of patternGroupsForKind(kind)) {
    const match = g.options.find((o) => o.generator === generator)
    if (match) return match.id
  }
  return patternGroupsForKind(kind)[0]?.options[0]?.id ?? 'melody:stabs'
}

/** Default patternStyleIds when creating / migrating a layer. */
export function patternStyleIdsForLayer(
  generator: GeneratorName,
  kind: InstrumentKind,
): string[] {
  if (kind === 'drumkit') return drumFlavorsForGenerator(generator)
  return [patternStyleIdForGenerator(generator, kind)]
}

export function progressionToChordStyles(progressionId: string): {
  chordStyleIds: string[]
  chordLength: ChordLoopLength
} {
  const prog = getProgression(progressionId)
  const len = prog.chords.length
  const chordLength: ChordLoopLength = len >= 16 ? 16 : len >= 8 ? 8 : 4

  const ids: string[] = []
  for (const c of prog.chords) {
    const toggle = CHORD_DEGREE_TOGGLES.find(
      (t) => t.chord.degree === c.degree && (t.chord.quality === c.quality || !c.quality),
    )
    if (toggle && !ids.includes(toggle.id)) ids.push(toggle.id)
  }
  if (ids.length === 0) ids.push('deg:I', 'deg:IV', 'deg:vi', 'deg:V')
  return { chordStyleIds: ids, chordLength }
}

export function defaultChordCraft(): { chordStyleIds: string[]; chordLength: ChordLoopLength } {
  return progressionToChordStyles(DEFAULT_PROGRESSION_ID)
}

export function buildProgressionFromStyles(
  chordStyleIds: string[],
  chordLength: ChordLoopLength,
): Progression {
  const ordered = DEGREE_ORDER.filter((id) => chordStyleIds.includes(id))
  const active = ordered.length ? ordered : ['deg:I', 'deg:IV', 'deg:vi', 'deg:V']
  const base = active.map((id) => {
    const t = CHORD_DEGREE_TOGGLES.find((x) => x.id === id)!
    return t.chord
  })
  const chords: ChordSpec[] = []
  while (chords.length < chordLength) {
    for (const c of base) {
      chords.push(c)
      if (chords.length >= chordLength) break
    }
  }
  const label = active.map((id) => CHORD_DEGREE_TOGGLES.find((t) => t.id === id)!.short).join('–')
  return { id: 'crafted', label: `${label} · ${chordLength}b`, chords }
}

export function resolveProgression(layer: BeatLayer): Progression {
  if (layer.chordStyleIds?.length) {
    return buildProgressionFromStyles(layer.chordStyleIds, layer.chordLength ?? 4)
  }
  return getProgression(layer.progressionId)
}

export function resolvePattern(layer: BeatLayer): { generator: GeneratorName; params: ParamMap } {
  if (layer.kind === 'drumkit') {
    const flavorIds = migrateDrumFlavorIds(layer.patternStyleIds)
    return {
      generator: 'drumCompose',
      params: { flavorIds: flavorIds.join(',') },
    }
  }

  const groups = patternGroupsForKind(layer.kind)
  const activeIds = layer.patternStyleIds ?? []
  let generator = layer.generator
  let params: ParamMap = { ...layer.params }

  for (const group of groups) {
    const optionIds = new Set(group.options.map((o) => o.id))
    const picked = activeIds.filter((id) => optionIds.has(id))
    if (!picked.length) continue
    const option = patternOptionById.get(picked[picked.length - 1]!)
    if (!option) continue
    generator = option.generator
    const def = generatorDefs[generator]
    params = { ...def.defaultParams, ...params, ...option.params }
  }

  return { generator, params }
}

export function chordCraftSummary(layer: BeatLayer): string {
  const prog = resolveProgression(layer)
  return `${prog.chords.length}b · ${prog.label}`
}

export function patternStyleSummary(layer: BeatLayer): string {
  if (layer.kind === 'drumkit') {
    return drumFlavorSummary(layer.patternStyleIds ?? [])
  }
  const { generator } = resolvePattern(layer)
  return generatorDefs[generator]?.label ?? layer.generator
}
