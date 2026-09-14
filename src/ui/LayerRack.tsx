import {
  AudioLines,
  Copy,
  Drum,
  Guitar,
  Music2,
  Plus,
  Sparkles,
  Trash2,
  VolumeX,
  Volume2,
} from 'lucide-react'
import { useBeatStore } from '../store/beatStore'
import { layerOrder, getLayerDef } from '../layers/registry'
import type { LayerType } from '../layers/types'
import { LayerPanel } from './LayerPanel'
import { cn } from '../lib/cn'

const ICONS: Record<LayerType, typeof Drum> = {
  drums: Drum,
  bass: Guitar,
  keys: Music2,
  melody: AudioLines,
  texture: Sparkles,
}

export function LayerRack() {
  const layers = useBeatStore((s) => s.layers)
  const toggleLayer = useBeatStore((s) => s.toggleLayer)
  const removeLayer = useBeatStore((s) => s.removeLayer)
  const addLayer = useBeatStore((s) => s.addLayer)
  const duplicateLayer = useBeatStore((s) => s.duplicateLayer)
  const setLayerParam = useBeatStore((s) => s.setLayerParam)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Layers</h2>
          <p className="text-sm text-muted">Mute, tweak, add, or duplicate independently.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {layerOrder.map((type) => {
            const Icon = ICONS[type]
            return (
              <button
                key={type}
                type="button"
                onClick={() => addLayer(type)}
                className="inline-flex items-center gap-1.5 rounded-full border border-wood/20 bg-cream/80 px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-wood/40"
              >
                <Plus className="h-3.5 w-3.5" />
                <Icon className="h-3.5 w-3.5" />
                {getLayerDef(type).label}
              </button>
            )
          })}
        </div>
      </div>

      <ul className="space-y-3">
        {layers.map((layer) => {
          const Icon = ICONS[layer.type]
          const def = getLayerDef(layer.type)
          return (
            <li
              key={layer.id}
              className={cn(
                'rounded-2xl border border-wood/15 bg-cream/60 backdrop-blur-sm px-4 py-4 transition',
                !layer.enabled && 'opacity-55',
              )}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-deep text-wood-deep">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink leading-tight">{layer.name}</p>
                    <p className="text-xs text-muted">{def.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title={layer.enabled ? 'Mute' : 'Unmute'}
                    onClick={() => toggleLayer(layer.id)}
                    className="rounded-lg p-2 text-ink-soft hover:bg-paper-deep"
                  >
                    {layer.enabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Duplicate"
                    onClick={() => duplicateLayer(layer.id)}
                    className="rounded-lg p-2 text-ink-soft hover:bg-paper-deep"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Remove"
                    onClick={() => removeLayer(layer.id)}
                    className="rounded-lg p-2 text-ink-soft hover:bg-paper-deep"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {layer.enabled && (
                <LayerPanel
                  layer={layer}
                  onParam={(key, value) => setLayerParam(layer.id, key, value)}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
