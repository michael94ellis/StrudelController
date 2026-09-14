export type LayerType = 'drums' | 'bass' | 'keys' | 'melody' | 'texture'

export type VibeId = 'cozy' | 'town' | 'restaurant'

export type ParamValue = number | string | boolean

export type LayerParams = Record<string, ParamValue>

export type GlobalCtx = {
  bpm: number
  key: string
  scale: string
  vibe: VibeId
  swing: number
}

export type LayerInstance = {
  id: string
  type: LayerType
  name: string
  enabled: boolean
  params: LayerParams
}

export type LayerDefinition = {
  type: LayerType
  label: string
  description: string
  defaultParams: LayerParams
  compile: (params: LayerParams, ctx: GlobalCtx) => string
}

export function num(params: LayerParams, key: string, fallback: number): number {
  const v = params[key]
  return typeof v === 'number' ? v : fallback
}

export function str(params: LayerParams, key: string, fallback: string): string {
  const v = params[key]
  return typeof v === 'string' ? v : fallback
}

export function bool(params: LayerParams, key: string, fallback: boolean): boolean {
  const v = params[key]
  return typeof v === 'boolean' ? v : fallback
}

export function rootNote(key: string, octave: number): string {
  return `${key.toLowerCase()}${octave}`
}
