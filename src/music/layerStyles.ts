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
import {
  BASS_FLAVOR_SECTIONS,
  bassFlavorSummary,
  bassFlavorsForGenerator,
  bassFlavorsInSection,
  migrateBassFlavorIds,
} from './bassFlavors'
import {
  MELODY_FLAVOR_SECTIONS,
  melodyFlavorSummary,
  melodyFlavorsForGenerator,
  melodyFlavorsInSection,
  migrateMelodyFlavorIds,
} from './melodyFlavors'

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
  hint?: string
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

const DRUM_STYLE_GROUPS: PatternStyleGroup[] = DRUM_FLAVOR_SECTIONS.map((section) => ({
  id: `drum:${section.id}`,
  label: section.label,
  hint: section.hint,
  exclusive: false,
  options: flavorsInSection(section.id).map((f) => ({
    id: f.id,
    label: f.label,
    generator: 'drumCompose' as const,
  })),
}))

const BASS_STYLE_GROUPS: PatternStyleGroup[] = BASS_FLAVOR_SECTIONS.map((section) => ({
  id: `bass:${section.id}`,
  label: section.label,
  hint: section.hint,
  exclusive: false,
  options: bassFlavorsInSection(section.id).map((f) => ({
    id: f.id,
    label: f.label,
    generator: 'bassCompose' as const,
  })),
}))

const MELODY_STYLE_GROUPS: PatternStyleGroup[] = MELODY_FLAVOR_SECTIONS.map((section) => ({
  id: `mel:${section.id}`,
  label: section.label,
  hint: section.hint,
  exclusive: false,
  options: melodyFlavorsInSection(section.id).map((f) => ({
    id: f.id,
    label: f.label,
    generator: 'melodyCompose' as const,
  })),
}))

export const PATTERN_STYLE_GROUPS: Partial<Record<InstrumentKind, PatternStyleGroup[]>> = {
  drumkit: DRUM_STYLE_GROUPS,
  subBass: BASS_STYLE_GROUPS,
  pluck: MELODY_STYLE_GROUPS,
  piano: MELODY_STYLE_GROUPS,
  pad: MELODY_STYLE_GROUPS,
  lead: MELODY_STYLE_GROUPS,
  bell: MELODY_STYLE_GROUPS,
  texture: MELODY_STYLE_GROUPS,
  guitar: MELODY_STYLE_GROUPS,
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

/** Friendly mood pills for non-musicians (maps to chord craft under the hood). */
export type ChordPreset = {
  id: string
  /** Legacy display name; UI uses {@link chordPresetPillLabel}. */
  label: string
  degrees: string[]
  length: ChordLoopLength
}

export const CHORD_PRESETS: ChordPreset[] = [
  { id: 'preset:pop', label: 'Pop', degrees: ['deg:I', 'deg:vi', 'deg:IV', 'deg:V'], length: 4 },
  { id: 'preset:anthem', label: 'Anthem', degrees: ['deg:I', 'deg:V', 'deg:vi', 'deg:IV'], length: 4 },
  { id: 'preset:soft', label: 'Soft', degrees: ['deg:I', 'deg:IV', 'deg:vi', 'deg:V'], length: 4 },
  { id: 'preset:50s', label: '50s', degrees: ['deg:I', 'deg:vi', 'deg:ii', 'deg:V'], length: 4 },
  { id: 'preset:lift', label: 'Lift', degrees: ['deg:I', 'deg:IV', 'deg:V', 'deg:IV'], length: 4 },
  { id: 'preset:jazz', label: 'Jazz turn', degrees: ['deg:ii', 'deg:V', 'deg:I', 'deg:vi'], length: 4 },
  { id: 'preset:turn', label: 'Turnaround', degrees: ['deg:ii', 'deg:V', 'deg:I'], length: 4 },
  { id: 'preset:minor', label: 'Minor lift', degrees: ['deg:vi', 'deg:IV', 'deg:I', 'deg:V'], length: 4 },
  { id: 'preset:vamp', label: 'Two-chord', degrees: ['deg:vi', 'deg:V'], length: 4 },
  { id: 'preset:canon', label: 'Canon', degrees: ['deg:I', 'deg:V', 'deg:vi', 'deg:iii', 'deg:IV'], length: 8 },
  { id: 'preset:eight', label: 'Eight bars', degrees: ['deg:I', 'deg:vi', 'deg:IV', 'deg:V'], length: 8 },
  { id: 'preset:drone', label: 'Drone', degrees: ['deg:I'], length: 4 },
  { id: 'preset:long', label: 'Long loop', degrees: ['deg:vi', 'deg:IV', 'deg:I', 'deg:V'], length: 16 },
]

/** Roman numeral + quality, e.g. Imaj7, iim7, V7 */
export function romanNumeralForChord(spec: ChordSpec): string {
  const q = spec.quality ?? 'maj7'
  const d = spec.degree
  switch (q) {
    case 'maj7':
      return `${d}maj7`
    case 'm7':
      return `${d}m7`
    case '7':
      return `${d}7`
    case 'maj':
      return d
    case 'min':
      return `${d}m`
    case 'sus':
      return `${d}sus`
    case 'dim':
      return `${d}dim`
    default:
      return d
  }
}

function romanLineForDegreeIds(degreeIds: string[]): string {
  return degreeIds
    .map((id) => {
      const t = CHORD_DEGREE_TOGGLES.find((x) => x.id === id)
      if (!t) throw new Error(`Unknown chord degree id: ${id}`)
      return romanNumeralForChord(t.chord)
    })
    .join(' → ')
}

/** Progression in Roman numerals (transpose with loop key). */
export function chordPresetPillLabel(preset: ChordPreset): string {
  const line = romanLineForDegreeIds(preset.degrees)
  if (preset.length > preset.degrees.length) {
    const repeats = preset.length / preset.degrees.length
    return `${line} · ${repeats}× · ${preset.length} bars`
  }
  return line
}

/** Compact Roman numeral line for summaries (truncates long loops). */
export function progressionRomanLine(chords: ChordSpec[], opts?: { maxChords?: number }): string {
  const max = opts?.maxChords ?? chords.length
  const line = chords.slice(0, max).map(romanNumeralForChord).join(' → ')
  if (chords.length > max) return `${line} …`
  return line
}

const MELODIC_KINDS = new Set<InstrumentKind>([
  'pluck',
  'piano',
  'pad',
  'lead',
  'bell',
  'texture',
  'guitar',
])

export function isMelodicKind(kind: InstrumentKind): boolean {
  return MELODIC_KINDS.has(kind)
}

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
  if (kind === 'subBass') {
    return bassFlavorsForGenerator(generator)[0] ?? 'bass:riff:pulse'
  }
  if (isMelodicKind(kind)) {
    return melodyFlavorsForGenerator(generator)[0] ?? 'mel:riff:strum'
  }
  for (const g of patternGroupsForKind(kind)) {
    const match = g.options.find((o) => o.generator === generator)
    if (match) return match.id
  }
  return patternGroupsForKind(kind)[0]?.options[0]?.id ?? 'mel:riff:strum'
}

/** Default patternStyleIds when creating / migrating a layer. */
export function patternStyleIdsForLayer(
  generator: GeneratorName,
  kind: InstrumentKind,
): string[] {
  if (kind === 'drumkit') return drumFlavorsForGenerator(generator)
  if (kind === 'subBass') return bassFlavorsForGenerator(generator)
  if (isMelodicKind(kind)) return melodyFlavorsForGenerator(generator)
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

export function chordCraftFromPreset(presetId: string): {
  chordStyleIds: string[]
  chordLength: ChordLoopLength
} {
  const preset = CHORD_PRESETS.find((p) => p.id === presetId)
  if (!preset) return defaultChordCraft()
  return { chordStyleIds: [...preset.degrees], chordLength: preset.length }
}

export function buildProgressionFromStyles(
  chordStyleIds: string[],
  chordLength: ChordLoopLength,
): Progression {
  const active = chordStyleIds.length ? chordStyleIds : ['deg:I', 'deg:IV', 'deg:vi', 'deg:V']
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
  const label = base.map(romanNumeralForChord).join('–')
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

  if (layer.kind === 'subBass') {
    const flavorIds = migrateBassFlavorIds(layer.patternStyleIds)
    return {
      generator: 'bassCompose',
      params: { flavorIds: flavorIds.join(',') },
    }
  }

  if (isMelodicKind(layer.kind)) {
    const flavorIds = migrateMelodyFlavorIds(layer.patternStyleIds)
    return {
      generator: 'melodyCompose',
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
  const barCount = prog.chords.length
  const maxChords = barCount > 8 ? 4 : barCount
  const line = progressionRomanLine(prog.chords, { maxChords })
  if (barCount > maxChords) return `${line} · ${barCount} bars`
  return line
}

export function patternStyleSummary(layer: BeatLayer): string {
  if (layer.kind === 'drumkit') {
    return drumFlavorSummary(layer.patternStyleIds)
  }
  if (layer.kind === 'subBass') {
    return bassFlavorSummary(layer.patternStyleIds)
  }
  if (isMelodicKind(layer.kind)) {
    return melodyFlavorSummary(layer.patternStyleIds)
  }
  const { generator } = resolvePattern(layer)
  return generatorDefs[generator]?.label ?? layer.generator
}
