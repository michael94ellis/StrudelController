import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Trash2, Volume2, VolumeX } from 'lucide-react'
import type { BeatLayer } from '../music/types'
import { num } from '../music/types'
import { chordCraftSummary, isMelodicKind, patternStyleSummary } from '../music/layerStyles'
import { getLayerSampleId, sampleGroupsForKind } from '../music/sampleLayers'
import { useBeatStore } from '../store/beatStore'
import { LayerPanel } from './LayerPanel'
import { SampleSelect } from './controls/SampleSelect'
import { cn } from '../lib/cn'

type Props = { layer: BeatLayer }

export function LayerRow({ layer }: Props) {
  const [open, setOpen] = useState(false)
  const setLayerSample = useBeatStore((s) => s.setLayerSample)
  const setInstrumentParam = useBeatStore((s) => s.setInstrumentParam)
  const toggleLayer = useBeatStore((s) => s.toggleLayer)
  const duplicateLayer = useBeatStore((s) => s.duplicateLayer)
  const removeLayer = useBeatStore((s) => s.removeLayer)
  const renameLayer = useBeatStore((s) => s.renameLayer)

  const isDrum = layer.kind === 'drumkit'
  const showMoodSummary = layer.kind === 'subBass' || isMelodicKind(layer.kind)
  const sampleId = getLayerSampleId(layer)
  const gain = num(layer.instrumentParams, 'gain', isDrum ? 0.85 : 0.5)
  const sampleGroups = sampleGroupsForKind(layer.kind)

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-cream/40 transition',
        layer.enabled ? 'border-wood/20' : 'border-wood/10 opacity-55',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-wood/10 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex shrink-0 items-center self-center text-ink-soft hover:text-ink"
          aria-expanded={open}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex w-[9.5rem] shrink-0 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleLayer(layer.id)}
              title={layer.enabled ? 'Mute' : 'Unmute'}
              className="rounded-full border border-wood/20 p-1.5 text-ink-soft hover:border-wood/40"
            >
              {layer.enabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </button>

            <input
              type="text"
              value={layer.name}
              onChange={(e) => renameLayer(layer.id, e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium text-ink outline-none hover:border-wood/20 focus:border-amber"
            />
          </div>

          <label className="flex items-center gap-1.5 pl-0.5" title="Volume">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Vol</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={gain}
              onChange={(e) => setInstrumentParam(layer.id, 'gain', Number(e.target.value))}
              className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-paper-deep accent-amber"
            />
          </label>
        </div>

        <span
          className="hidden max-w-[10rem] truncate text-xs text-muted sm:inline"
          title={
            showMoodSummary
              ? `${patternStyleSummary(layer)} · ${chordCraftSummary(layer)}`
              : patternStyleSummary(layer)
          }
        >
          {showMoodSummary
            ? `${patternStyleSummary(layer)} · ${chordCraftSummary(layer)}`
            : patternStyleSummary(layer)}
        </span>

        <div className="min-w-[10rem] flex-1 basis-[12rem]">
          <SampleSelect
            label=""
            value={sampleId}
            groups={sampleGroups}
            onChange={(id) => setLayerSample(layer.id, id)}
            filterable
            placeholder="Sample…"
            className="[&>span:first-child]:hidden [&_input]:py-1.5 [&_select]:min-h-9 [&_select]:py-1.5"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => duplicateLayer(layer.id)}
            title="Duplicate track"
            className="rounded-full border border-wood/20 p-1.5 text-ink-soft hover:border-wood/40"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => removeLayer(layer.id)}
            title="Remove track"
            className="rounded-full border border-wood/20 p-1.5 text-ink-soft hover:border-red-300 hover:text-red-800"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open ? <LayerPanel layer={layer} /> : null}
    </article>
  )
}
