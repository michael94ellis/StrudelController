import type { InstrumentKind, ParamMap } from '../types'
import type { InstrumentDef } from './core'
import { coreInstruments } from './core'
import { genreInstruments } from '../genres'

export type { InstrumentDef, InstrumentTable } from './core'

/**
 * Every instrument kind the app knows about: the core set plus whatever
 * each genre module registers for itself.
 */
export const instrumentDefs = {
  ...coreInstruments,
  ...genreInstruments(),
} as Record<InstrumentKind, InstrumentDef>

export function createInstrument(kind: InstrumentKind, name?: string, params?: ParamMap) {
  const def = instrumentDefs[kind]
  return {
    id: '',
    name: name ?? def.label,
    kind,
    params: { ...def.defaultParams, ...params },
  }
}

export function renderInstrument(
  kind: InstrumentKind,
  patternExpr: string,
  params: ParamMap,
  bpm: number,
): string {
  const def = instrumentDefs[kind]
  if (!def) throw new Error(`Unknown instrument kind "${kind}"`)
  return def.render(patternExpr, params, bpm)
}
