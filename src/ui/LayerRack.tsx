import { useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { generatorDefs } from '../music/generators/registry'
import { getLayerSampleId, SAMPLE_OPTION_GROUPS } from '../music/sampleLayers'
import { useBeatStore } from '../store/beatStore'
import { LayerPanel } from './LayerPanel'
import { SampleSelect } from './controls/SampleSelect'
import { cn } from '../lib/cn'

export function LayerRack() {
  const layers = useBeatStore((s) => s.beat.layers)
  const addLayerFromSample = useBeatStore((s) => s.addLayerFromSample)
  const setLayerSample = useBeatStore((s) => s.setLayerSample)
  const removeLayer = useBeatStore((s) => s.removeLayer)
  const duplicateLayer = useBeatStore((s) => s.duplicateLayer)
  const toggleLayer = useBeatStore((s) => s.toggleLayer)
  const renameLayer = useBeatStore((s) => s.renameLayer)
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)

  useEffect(() => {
    if (!layers.length) {
      setActiveLayerId(null)
      return
    }
    if (!activeLayerId || !layers.some((l) => l.id === activeLayerId)) {
      setActiveLayerId(layers[0].id)
    }
  }, [layers, activeLayerId])

  const activeLayer = layers.find((l) => l.id === activeLayerId)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">Layers & samples</h2>
        <p className="text-sm text-muted">
          Pick a Strudel sample (GM, synth, drums) for each layer — search then choose from the list.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border-2 border-amber/30 bg-cream/70 p-4 shadow-sm">
        <SampleSelect
          label="Add new layer from sample"
          value=""
          placeholder="Choose a sample to add…"
          groups={SAMPLE_OPTION_GROUPS}
          onChange={(sampleId) => addLayerFromSample(sampleId)}
        />

        {activeLayer ? (
          <div className="border-t border-wood/15 pt-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Edit sample for layer
            </label>
            <select
              value={activeLayer.id}
              onChange={(e) => setActiveLayerId(e.target.value)}
              className="mb-3 w-full rounded-lg border border-wood/20 bg-cream px-3 py-2 text-sm text-ink"
            >
              {layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <SampleSelect
              label={`Sample · ${activeLayer.name}`}
              value={getLayerSampleId(activeLayer)}
              groups={SAMPLE_OPTION_GROUPS}
              onChange={(id) => setLayerSample(activeLayer.id, id)}
              filterable
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        {layers.map((layer) => {
          const open = openId === layer.id
          const active = layer.id === activeLayerId
          const sampleId = getLayerSampleId(layer)
          return (
            <div
              key={layer.id}
              className={cn(
                'rounded-2xl border bg-cream/50 transition',
                layer.enabled ? 'border-wood/15' : 'border-wood/10 opacity-60',
                active && 'ring-2 ring-amber/40',
              )}
              onClick={() => setActiveLayerId(layer.id)}
            >
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenId(open ? null : layer.id)
                  }}
                  className="inline-flex shrink-0 items-center text-ink-soft hover:text-ink"
                  aria-expanded={open}
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                <input
                  type="text"
                  value={layer.name}
                  onChange={(e) => renameLayer(layer.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium text-ink outline-none hover:border-wood/20 focus:border-amber"
                />

                <span
                  className="max-w-[12rem] truncate rounded-md bg-ink/5 px-2 py-1 font-mono text-xs text-ink-soft"
                  title={sampleId}
                >
                  {sampleId}
                </span>

                <span className="hidden text-xs text-muted sm:inline">
                  {generatorDefs[layer.generator].label}
                </span>

                <div className="flex items-center gap-1 sm:ml-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLayer(layer.id)
                    }}
                    title={layer.enabled ? 'Mute' : 'Unmute'}
                    className="rounded-full border border-wood/20 p-1.5 text-ink-soft hover:border-wood/40"
                  >
                    {layer.enabled ? (
                      <Volume2 className="h-3.5 w-3.5" />
                    ) : (
                      <VolumeX className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      duplicateLayer(layer.id)
                    }}
                    title="Duplicate"
                    className="rounded-full border border-wood/20 p-1.5 text-ink-soft hover:border-wood/40"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (openId === layer.id) setOpenId(null)
                      removeLayer(layer.id)
                    }}
                    title="Delete"
                    className="rounded-full border border-wood/20 p-1.5 text-ink-soft hover:border-red-300 hover:text-red-800"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {open ? <LayerPanel layer={layer} /> : null}
            </div>
          )
        })}

        {!layers.length ? (
          <p className="rounded-2xl border border-dashed border-wood/25 px-4 py-6 text-center text-sm text-muted">
            <Plus className="mr-1 inline h-4 w-4" />
            Use the <strong>sample picker</strong> above to add your first layer.
          </p>
        ) : null}
      </div>
    </section>
  )
}
