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
  | {
      key: string
      type: 'text'
      label: string
      placeholder?: string
    }

/**
 * Core instrument kinds (see `instruments/core.ts`).
 *
 * Genre modules register extra kinds via declaration merging, e.g.
 *   declare module '../types' { interface InstrumentKinds { guitar: true } }
 */
export interface InstrumentKinds {
  drumkit: true
  subBass: true
  pluck: true
  piano: true
  pad: true
  lead: true
  bell: true
  texture: true
  guitar: true
}

export type InstrumentKind = keyof InstrumentKinds

/**
 * Core, genre-agnostic generators (see `generators/core.ts`).
 *
 * Genre modules register their own via declaration merging, e.g.
 *   declare module '../types' { interface GeneratorNames { houseKit: true } }
 */
export interface GeneratorNames {
  drumCompose: true
  fourOnFloor: true
  breakbeat: true
  sparsePulse: true
  rootBass: true
  walkingBass: true
  chordStabs: true
  arpUp: true
  melodyPhrase: true
  improv: true
  rimHits: true
  shaker: true
  ambientGrain: true
  chimeHits: true
}

export type GeneratorName = keyof GeneratorNames

export type Progression = {
  id: string
  label: string
  chords: ChordSpec[]
}

/**
 * One voice in a loop: a sample kit / synth voice (`kind` + `instrumentParams`)
 * playing a pattern (`generator` + `params`).
 */
export type BeatLayer = {
  id: string
  name: string
  enabled: boolean
  kind: InstrumentKind
  instrumentParams: ParamMap
  /** Rhythm / voicing algorithm for this voice. */
  generator: GeneratorName
  params: ParamMap
  /** Legacy preset id; used when `chordStyleIds` is empty. */
  progressionId: string
  /** Active groove / pattern style pill ids (per-group radio). */
  patternStyleIds?: string[]
  /** Roman-degree pills enabled for this layer’s chord loop. */
  chordStyleIds?: string[]
  chordLength?: 4 | 8 | 16
}

/**
 * A beat is a single loop. Each layer carries its own chord pattern length;
 * layers may cycle at different lengths when stacked in Strudel.
 */
export type Beat = {
  id: string
  name: string
  /** Genre template this was built from; supplies the swing model */
  genreId: string
  bpm: number
  key: string
  scale: string
  /** Bumps on “Shuffle patterns” — generators use this for bar-to-bar variation. */
  variation: number
  layers: BeatLayer[]
}

export type HarmonyCtx = {
  key: string
  scale: string
  bpm: number
  swing: number
  /** Loop length in bars (chord progression length). */
  bars: number
  /** Changes when the user shuffles — alters fills and phrase choices. */
  variation: number
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
  // Random suffix — a plain counter restarts at 1 each load and would collide
  // with ids already persisted in the library.
  return `${prefix}-${uid}-${Math.random().toString(36).slice(2, 8)}`
}
