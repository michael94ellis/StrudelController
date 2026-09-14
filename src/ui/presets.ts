import type { GlobalCtx, LayerInstance, LayerParams, LayerType, VibeId } from '../layers/types'
import { getLayerDef, layerOrder } from '../layers/registry'

let uid = 0
export function newId(prefix = 'layer') {
  uid += 1
  return `${prefix}-${uid}`
}

export function createLayer(type: LayerType, name?: string, params?: LayerParams): LayerInstance {
  const def = getLayerDef(type)
  return {
    id: newId(type),
    type,
    name: name ?? def.label,
    enabled: true,
    params: { ...def.defaultParams, ...params },
  }
}

export function defaultLayers(): LayerInstance[] {
  return layerOrder.map((type) => createLayer(type))
}

export type VibePreset = {
  id: VibeId
  label: string
  description: string
  globals: Partial<GlobalCtx>
  layers: Array<{ type: LayerType; enabled?: boolean; params?: LayerParams }>
}

export const vibePresets: VibePreset[] = [
  {
    id: 'cozy',
    label: 'Cozy',
    description: 'Soft, slow, warm bedroom vibe',
    globals: { bpm: 84, key: 'F', scale: 'major:pentatonic', swing: 0.12 },
    layers: [
      {
        type: 'drums',
        params: { pattern: 'four', hatStyle: 'sparse', kickDensity: 'sparse', clap: false, gain: 0.45 },
      },
      { type: 'bass', params: { pattern: 'roots', wave: 'triangle', lpf: 380, gain: 0.38 } },
      { type: 'keys', params: { sound: 'triangle', density: 'sparse', room: 0.4, gain: 0.26 } },
      { type: 'melody', params: { density: 'sparse', delay: 0.4, gain: 0.2 } },
      { type: 'texture', params: { density: 0.02, gain: 0.06 } },
    ],
  },
  {
    id: 'town',
    label: 'Town',
    description: 'Livelier street bounce',
    globals: { bpm: 96, key: 'F', scale: 'major:pentatonic', swing: 0.14 },
    layers: [
      {
        type: 'drums',
        params: { hatStyle: 'offbeat', kickDensity: 'full', clap: true, bank: 'RolandTR909', gain: 0.7 },
      },
      { type: 'bass', params: { pattern: 'walking', wave: 'triangle', lpf: 650, gain: 0.42 } },
      { type: 'keys', params: { sound: 'triangle', density: 'half', room: 0.22, gain: 0.24 } },
      { type: 'melody', params: { density: 'busy', delay: 0.3, gain: 0.26 } },
      { type: 'texture', params: { density: 0.015, gain: 0.04 } },
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    description: 'Casual cafe tutorial bed',
    globals: { bpm: 90, key: 'G', scale: 'major:pentatonic', swing: 0.1 },
    layers: [
      {
        type: 'drums',
        params: { hatStyle: 'sparse', kickDensity: 'full', clap: true, gain: 0.55 },
      },
      { type: 'bass', params: { pattern: 'walking', wave: 'sine', lpf: 380, gain: 0.4 } },
      { type: 'keys', params: { sound: 'piano', density: 'half', room: 0.3, gain: 0.32 } },
      { type: 'melody', params: { density: 'medium', delay: 0.3, gain: 0.22 } },
      { type: 'texture', params: { density: 0.015, gain: 0.03 } },
    ],
  },
]

export function applyVibe(preset: VibePreset): { globals: GlobalCtx; layers: LayerInstance[] } {
  const globals: GlobalCtx = {
    bpm: 90,
    key: 'F',
    scale: 'major:pentatonic',
    swing: 0.12,
    ...preset.globals,
    vibe: preset.id,
  }

  const layers = preset.layers.map((spec) =>
    createLayer(spec.type, undefined, {
      ...getLayerDef(spec.type).defaultParams,
      ...spec.params,
    }),
  )

  for (const layer of layers) {
    const match = preset.layers.find((l) => l.type === layer.type)
    if (match?.enabled === false) layer.enabled = false
  }

  return { globals, layers }
}
