import { Plus } from 'lucide-react'
import { SAMPLE_OPTION_GROUPS } from '../music/sampleLayers'
import { useBeatStore } from '../store/beatStore'
import { LayerRow } from './LayerRow'
import { SampleSelect } from './controls/SampleSelect'

export function LayerRack() {
  const layers = useBeatStore((s) => s.beat.layers)
  const addLayerFromSample = useBeatStore((s) => s.addLayerFromSample)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">Tracks</h2>
        <p className="text-sm text-muted">
          One row per voice — pick a sample, then expand for pattern and timbre.
        </p>
      </div>

      <div className="space-y-3">
        {layers.map((layer) => (
          <LayerRow key={layer.id} layer={layer} />
        ))}

        {!layers.length ? (
          <p className="rounded-2xl border border-dashed border-wood/25 px-4 py-8 text-center text-sm text-muted">
            Add a sample below to start your first track.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-wood/15 bg-cream/50 p-4">
        <SampleSelect
          label="Add track from sample"
          value=""
          placeholder="Pick a sample…"
          groups={SAMPLE_OPTION_GROUPS}
          onChange={(sampleId) => addLayerFromSample(sampleId)}
          filterable
        />
        <p className="mt-2 flex items-center gap-1 text-xs text-muted">
          <Plus className="h-3.5 w-3.5" />
          Drums, bass, keys, synths, sax & horns, pads, and more.
        </p>
      </div>
    </section>
  )
}
