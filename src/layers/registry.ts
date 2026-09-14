import type { LayerDefinition, LayerType } from './types'
import { drumsLayer } from './drums'
import { bassLayer } from './bass'
import { keysLayer } from './keys'
import { melodyLayer } from './melody'
import { textureLayer } from './texture'

export const layerDefs: Record<LayerType, LayerDefinition> = {
  drums: drumsLayer,
  bass: bassLayer,
  keys: keysLayer,
  melody: melodyLayer,
  texture: textureLayer,
}

export const layerOrder: LayerType[] = ['drums', 'bass', 'keys', 'melody', 'texture']

export function getLayerDef(type: LayerType): LayerDefinition {
  return layerDefs[type]
}
