import type { GeneratorName, InstrumentKind, ParamMap, Song } from '../types'

export type SongKnobs = {
  /** Overall intensity / gain fullness 0–1 */
  energy: number
  /** How busy patterns are 0–1 */
  density: number
  /** Swing / pocket 0–1 (maps into globals.swing) */
  groove: number
  /** Brightness / filter openness 0–1 */
  brightness: number
}

export const DEFAULT_KNOBS: SongKnobs = {
  energy: 0.6,
  density: 0.6,
  groove: 0.4,
  brightness: 0.5,
}

export type StyleKind = 'genre' | 'generic'

export type StyleEntry = {
  id: string
  label: string
  kind: StyleKind
  /** Parent genre id for genre-specific feels; null for generic or genre root */
  genreId: string | null
  blurb: string
  bpm: number
  key: string
  scale: string
}

export type StyleLayerBuckets = {
  quiet: string[]
  groove: string[]
  full: string[]
}

export type BuiltStyle = {
  song: Song
  layers: StyleLayerBuckets
  knobs: SongKnobs
}

export type InstSpec = {
  kind: InstrumentKind
  name: string
  params?: ParamMap
}

export type PartSpec = {
  name: string
  instrument: string
  generator: GeneratorName
  params?: ParamMap
  /** Which energy buckets include this part */
  layers: Array<'quiet' | 'groove' | 'full'>
}

export type SectionSpec = {
  name: string
  bars: number
  /** Uses progression index */
  progression: number
  energy: 'quiet' | 'groove' | 'full'
  mods?: Song['sections'][0]['mods']
}

export type StyleRecipe = {
  entry: StyleEntry
  instruments: InstSpec[]
  /** Chord progression names + roman specs via theory helpers */
  progressions: Array<'pop' | 'anthem' | 'cafe' | 'soft'>
  parts: PartSpec[]
  sections: SectionSpec[]
  arrangement: string[]
}
