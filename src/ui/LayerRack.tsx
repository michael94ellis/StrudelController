import { SAMPLE_OPTION_GROUPS } from '../music/sampleLayers'
import { useBeatStore } from '../store/beatStore'
import { LayerRow } from './LayerRow'
import { SampleCatalog } from './controls/SampleCatalog'

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
        <SampleCatalog
          label="Add track from sample"
          groups={SAMPLE_OPTION_GROUPS}
          onPick={addLayerFromSample}
        />
      </div>
    </section>
  )
}
