import type { GeneratorName, InstrumentKind, ParamMap } from '../types'
import type { GeneratorTable } from '../generators/core'
import type { InstrumentTable } from '../instruments/core'

/** One voice in a genre's starter loop. */
export type GenreLayer = {
  name: string
  kind: InstrumentKind
  /** Timbre params for the kit / voice */
  instrumentParams?: ParamMap
  generator: GeneratorName
  /** Pattern params for the generator */
  params?: ParamMap
  /** Flavor pill ids (compose generators). Overrides generator defaults. */
  patternStyleIds?: string[]
  /** Roman-numeral chord preset for this layer (`preset:*` from CHORD_PRESETS). */
  chordPresetId?: string
  /** Override default chord pattern for this layer */
  progressionId?: string
}

/** How the groove knob maps to swing: base + groove * range. */
export type SwingModel = {
  base: number
  range: number
}

/**
 * One self-contained genre, used as a template for new beats. Everything that
 * makes a genre sound like itself lives here: its own generators / instrument
 * kinds, plus the default tempo, harmony and layer stack.
 *
 * Adding a genre = add a file in this folder and list it in `./index.ts`.
 */
export type GenreModule = {
  id: string
  label: string
  blurb: string
  bpm: number
  key: string
  scale: string
  swing: SwingModel
  /** Id from `PROGRESSIONS` in `../theory` (fallback when layers omit `chordPresetId`). */
  defaultProgressionId: string
  /** Default `preset:*` applied to layers that omit `chordPresetId`. */
  defaultChordPresetId?: string
  /** Generators only this genre needs (names registered via declaration merging in the module). */
  generators: GeneratorTable
  /** Instrument kinds only this genre needs. */
  instruments?: InstrumentTable
  layers: GenreLayer[]
  /** Old ids this module used to go by, so saved beats keep working. */
  legacy?: { ids?: string[] }
}
