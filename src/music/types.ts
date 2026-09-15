export type ParamValue = number | string | boolean

export type ParamMap = Record<string, ParamValue>

export type ChordDegree = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'vii'
export type ChordQuality = 'maj' | 'min' | 'maj7' | 'm7' | '7' | 'sus' | 'dim'

export type ChordSpec = {
  degree: ChordDegree
  quality?: ChordQuality
}

export type ParamSchema =
  | {
      key: string
      type: 'slider'
      label: string
      min: number
      max: number
      step?: number
    }
  | {
      key: string
      type: 'select'
      label: string
      options: Array<{ value: string; label: string }>
    }
  | {
      key: string
      type: 'toggle'
      label: string
    }

export type InstrumentKind =
  | 'drumkit'
  | 'subBass'
  | 'pluck'
  | 'piano'
  | 'pad'
  | 'lead'
  | 'bell'
  | 'texture'

export type GeneratorName =
  | 'fourOnFloor'
  | 'breakbeat'
  | 'sparsePulse'
  | 'rootBass'
  | 'walkingBass'
  | 'chordStabs'
  | 'arpUp'
  | 'melodyPhrase'
  | 'improv'
  | 'rimHits'
  | 'shaker'
  | 'ambientGrain'
  | 'chimeHits'
  | 'houseKit'
  | 'trapKit'
  | 'lofiKit'
  | 'chiptuneKit'
  | 'houseBass'
  | 'trapBass'
  | 'chiptuneArp'
  | 'lofiKeys'

export type SectionName =
  | 'intro'
  | 'verse'
  | 'prechorus'
  | 'chorus'
  | 'bridge'
  | 'solo'
  | 'outro'
  | string

export type SectionMod =
  | { type: 'fadeIn' }
  | { type: 'fadeOut' }
  | { type: 'gain'; value: number }
  | { type: 'halfTime' }
  | { type: 'filterSweep'; from: number; to: number }

export type Instrument = {
  id: string
  name: string
  kind: InstrumentKind
  params: ParamMap
}

export type Progression = {
  id: string
  name: string
  chords: ChordSpec[]
}

export type Part = {
  id: string
  name: string
  instrumentId: string
  generator: GeneratorName
  params: ParamMap
  enabled: boolean
}

export type SectionPartRef = {
  partId: string
  mods?: SectionMod[]
}

export type Section = {
  id: string
  name: SectionName
  bars: number
  progressionId: string
  parts: SectionPartRef[]
  mods?: SectionMod[]
}

export type ArrangementSlot = {
  sectionId: string
  repeat?: number
}

export type SongGlobals = {
  bpm: number
  key: string
  scale: string
  swing: number
}

export type Song = {
  id: string
  title: string
  globals: SongGlobals
  instruments: Instrument[]
  progressions: Progression[]
  parts: Part[]
  sections: Section[]
  arrangement: ArrangementSlot[]
  /** Active beat style id from the style catalog */
  styleId?: string
  /** User-facing variation knobs (0–1) */
  knobs?: {
    energy: number
    density: number
    groove: number
    brightness: number
  }
  /** Part id buckets for Quiet / Groove / Full section energy */
  styleLayers?: {
    quiet: string[]
    groove: string[]
    full: string[]
  }
}

export type PlayMode = 'loop' | 'song'

export type HarmonyCtx = {
  key: string
  scale: string
  bpm: number
  swing: number
  /** Absolute chord names for one cycle of the progression (display / legacy) */
  chordNames: string[]
  /** Root notes per bar, e.g. f2 d2 bb1 c2 */
  roots: string[]
  /** Triad note stacks per bar */
  triads: string[][]
  /** Seventh (or triad) stacks per bar — always usable with note() */
  sevenths: string[][]
}

export function num(params: ParamMap, key: string, fallback: number): number {
  const v = params[key]
  return typeof v === 'number' ? v : fallback
}

export function str(params: ParamMap, key: string, fallback: string): string {
  const v = params[key]
  return typeof v === 'string' ? v : fallback
}

export function bool(params: ParamMap, key: string, fallback: boolean): boolean {
  const v = params[key]
  return typeof v === 'boolean' ? v : fallback
}

let uid = 0
export function newId(prefix = 'id'): string {
  uid += 1
  return `${prefix}-${uid}`
}
