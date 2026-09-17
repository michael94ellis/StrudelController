import type { BeatLayer } from '../music/types'
import { generatorDefs } from '../music/generators/registry'
import { generatorsFor } from '../music/beats/build'
import { layerInstrumentSchema } from '../music/sampleLayers'
import { PROGRESSIONS } from '../music/theory'
import { useBeatStore } from '../store/beatStore'
import { SchemaForm } from './controls/SchemaForm'
import { Select } from './controls/Select'

type Props = { layer: BeatLayer }

export function LayerPanel({ layer }: Props) {
  const setLayerGenerator = useBeatStore((s) => s.setLayerGenerator)
  const setLayerParam = useBeatStore((s) => s.setLayerParam)
  const setLayerProgression = useBeatStore((s) => s.setLayerProgression)
  const setInstrumentParam = useBeatStore((s) => s.setInstrumentParam)

  const generator = generatorDefs[layer.generator]
  const generatorOptions = generatorsFor(layer.kind).map((name) => ({
    value: name,
    label: generatorDefs[name].label,
  }))
  const timbreSchema = layerInstrumentSchema(layer.kind)

  return (
    <div className="space-y-4 border-t border-wood/10 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Pattern"
          value={layer.generator}
          options={generatorOptions}
          onChange={(v) => setLayerGenerator(layer.id, v as BeatLayer['generator'])}
        />
        <Select
          label="Chord pattern"
          value={layer.progressionId}
          options={PROGRESSIONS.map((p) => ({ value: p.id, label: p.label }))}
          onChange={(v) => setLayerProgression(layer.id, v)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {generator.label} settings
          </p>
          <SchemaForm
            schema={generator.schema}
            params={layer.params}
            onChange={(key, value) => setLayerParam(layer.id, key, value)}
          />
        </div>
        {timbreSchema.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Timbre</p>
            <SchemaForm
              schema={timbreSchema}
              params={layer.instrumentParams}
              onChange={(key, value) => setInstrumentParam(layer.id, key, value)}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
