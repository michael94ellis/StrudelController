import type { GeneratorTable } from '../generators/core'
import type { InstrumentTable } from '../instruments/core'
import type { GenreModule } from './types'
import { house } from './house'
import { videogame } from './videogame'
import { trap } from './trap'
import { lofi } from './lofi'
/** Register a genre here to make it selectable and contribute generators/instruments. */
export const GENRES: GenreModule[] = [house, videogame, trap, lofi]

const byId = new Map<string, GenreModule>()
for (const g of GENRES) {
  byId.set(g.id, g)
  for (const legacy of g.legacy?.ids ?? []) {
    byId.set(legacy, g)
  }
}

export function getGenre(id: string): GenreModule | undefined {
  return byId.get(id)
}

export function genreGenerators(): GeneratorTable {
  return Object.assign({}, ...GENRES.map((g) => g.generators))
}

export function genreInstruments(): InstrumentTable {
  return Object.assign({}, ...GENRES.map((g) => g.instruments ?? {}))
}

export type { GenreLayer, GenreModule, SwingModel } from './types'
