import type { BeatLayer } from '../music/types'
import { generatorDefs } from '../music/generators/registry'
import { generatorsFor } from '../music/beats/build'
import { layerInstrumentSchema } from '../music/sampleLayers'
import { useBeatStore } from '../store/beatStore'
import { SchemaForm } from './controls/SchemaForm'
import { Select } from './controls/Select'

type Props = { layer: BeatLayer }

export function LayerPanel({ layer }: Props) {
  const setLayerGenerator = useBeatStore((s) => s.setLayerGenerator)
  const setLayerParam = useBeatStore((s) => s.setLayerParam)
  const setInstrumentParam = useBeatStore((s) => s.setInstrumentParam)

  const generator = generatorDefs[layer.generator]
  const generatorOptions = generatorsFor(layer.kind).map((name) => ({
    value: name,
    label: generatorDefs[name].label,
  }))
  const timbreSchema = layerInstrumentSchema(layer.kind)

  return (
    <div className="space-y-4 border-t border-wood/10 px-4 py-4">
      <Select
        label="Pattern"
        value={layer.generator}
        options={generatorOptions}
        onChange={(v) => setLayerGenerator(layer.id, v as BeatLayer['generator'])}
      />

      {layer.kind !== 'drumkit' ? (
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted">Other sample name</span>
          <input
            type="text"
            value={String(layer.instrumentParams.strudelSoundCustom ?? '')}
            placeholder="Any Strudel s() name not in the list"
            onChange={(e) => setInstrumentParam(layer.id, 'strudelSoundCustom', e.target.value)}
            className="w-full rounded-lg border border-wood/20 bg-cream/80 px-3 py-2 text-sm text-ink"
          />
        </label>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {generator.label} pattern
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
