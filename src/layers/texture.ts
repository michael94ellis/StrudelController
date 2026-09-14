import type { LayerDefinition } from './types'
import { bool, num } from './types'

export const textureLayer: LayerDefinition = {
  type: 'texture',
  label: 'Texture',
  description: 'Soft room grain',
  defaultParams: {
    enabledGrain: true,
    density: 0.02,
    gain: 0.05,
  },
  compile(params) {
    if (!bool(params, 'enabledGrain', true)) {
      return `silence`
    }
    const density = num(params, 'density', 0.02)
    const gain = num(params, 'gain', 0.05)
    return `s("crackle*2")
  .density(${density.toFixed(3)})
  .gain(${gain.toFixed(2)})
  .orbit(1)`
  },
}
