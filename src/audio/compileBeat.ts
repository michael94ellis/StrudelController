import { getLayerDef } from '../layers/registry'
import type { GlobalCtx, LayerInstance } from '../layers/types'

export function compileBeat(globals: GlobalCtx, layers: LayerInstance[]): string {
  const enabled = layers.filter((l) => l.enabled)
  const lines = [`setcpm(${globals.bpm}/4)`]

  for (const layer of enabled) {
    const def = getLayerDef(layer.type)
    const fragment = def.compile(layer.params, globals).trim()
    if (!fragment || fragment === 'silence') continue
    lines.push(`$: ${fragment}`)
  }

  if (lines.length === 1) {
    lines.push('$: silence')
  }

  return lines.join('\n\n')
}
