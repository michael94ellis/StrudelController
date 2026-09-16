import type { GeneratorName, HarmonyCtx, ParamMap } from '../types'
import type { GeneratorDef } from './core'
import { coreGenerators } from './core'
import { genreGenerators } from '../genres'

export type { GeneratorDef, GeneratorTable } from './core'

/**
 * Every generator the app knows about: the genre-agnostic core set plus
 * whatever each genre module registers for itself.
 */
export const generatorDefs = {
  ...coreGenerators,
  ...genreGenerators(),
} as Record<GeneratorName, GeneratorDef>

export function generatePart(name: GeneratorName, ctx: HarmonyCtx, params: ParamMap): string {
  const def = generatorDefs[name]
  if (!def) throw new Error(`Unknown generator "${name}"`)
  return def.generate(ctx, params)
}
