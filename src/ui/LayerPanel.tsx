import type { BeatLayer } from '../music/types'
import { layerInstrumentSchema } from '../music/sampleLayers'
import {
  CHORD_DEGREE_TOGGLES,
  CHORD_LOOP_LENGTHS,
  CHORD_PRESETS,
  patternGroupsForKind,
  resolvePattern,
} from '../music/layerStyles'
import { generatorDefs } from '../music/generators/registry'
import { useBeatStore } from '../store/beatStore'
import { SchemaForm } from './controls/SchemaForm'
import { StylePills } from './controls/StylePills'

type Props = { layer: BeatLayer }

export function LayerPanel({ layer }: Props) {
  const toggleLayerPatternStyle = useBeatStore((s) => s.toggleLayerPatternStyle)
  const toggleLayerChordDegree = useBeatStore((s) => s.toggleLayerChordDegree)
  const setLayerChordLength = useBeatStore((s) => s.setLayerChordLength)
  const applyLayerChordPreset = useBeatStore((s) => s.applyLayerChordPreset)
  const setLayerParam = useBeatStore((s) => s.setLayerParam)
  const setInstrumentParam = useBeatStore((s) => s.setInstrumentParam)

  const isDrum = layer.kind === 'drumkit'
  const patternGroups = patternGroupsForKind(layer.kind)
  const patternActive = layer.patternStyleIds ?? []
  const chordActive = layer.chordStyleIds ?? []
  const chordLength = layer.chordLength ?? 4
  const { generator } = resolvePattern(layer)
  const generatorDef = generatorDefs[generator]

  const timbreSchema = layerInstrumentSchema(layer.kind).filter((f) => {
    if (isDrum && (f.key === 'bank' || f.key === 'gain')) return false
    return true
  })

  return (
    <div className="space-y-5 border-t border-wood/10 px-4 py-4">
      {isDrum ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Beat flavors</p>
            <p className="mt-0.5 text-xs text-muted">
              Stack any mix — multiple per section is fine.
            </p>
          </div>
          {patternGroups.map((group) => (
            <StylePills
              key={group.id}
              label={group.label}
              options={group.options.map((o) => ({ id: o.id, label: o.label }))}
              activeIds={patternActive}
              exclusive={group.exclusive !== false}
              allowOff={group.allowOff === true}
              onChange={(_next, id) => toggleLayerPatternStyle(layer.id, group.id, id)}
            />
          ))}
        </div>
      ) : (
        patternGroups.map((group) => (
          <StylePills
            key={group.id}
            label={group.label}
            hint="Pick one groove or pattern shape for this track."
            options={group.options.map((o) => ({ id: o.id, label: o.label }))}
            activeIds={patternActive}
            exclusive={group.exclusive !== false}
            allowOff={group.allowOff === true}
            onChange={(_next, id) => toggleLayerPatternStyle(layer.id, group.id, id)}
          />
        ))
      )}

      {!isDrum ? (
        <div className="space-y-3 rounded-xl border border-wood/10 bg-cream/30 p-3">
          <StylePills
            label="Chord loop"
            hint="Turn degrees on/off — they play in order (I → ii → …) and repeat to fill the loop."
            options={CHORD_DEGREE_TOGGLES.map((t) => ({ id: t.id, label: t.short }))}
            activeIds={chordActive}
            onChange={(_next, id) => toggleLayerChordDegree(layer.id, id)}
          />
          <StylePills
            label="Loop length"
            hint="How many bars before the chord sequence repeats."
            options={CHORD_LOOP_LENGTHS.map((n) => ({ id: `len:${n}`, label: `${n} bars` }))}
            activeIds={[`len:${chordLength}`]}
            exclusive
            onChange={(_next, id) => {
              const n = Number(id.replace('len:', '')) as 4 | 8 | 16
              if (n === 4 || n === 8 || n === 16) setLayerChordLength(layer.id, n)
            }}
          />
          <StylePills
            label="Quick shapes"
            hint="One tap sets degrees + length."
            options={CHORD_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
            activeIds={
              CHORD_PRESETS.some(
                (p) =>
                  p.length === chordLength &&
                  p.degrees.length === chordActive.length &&
                  p.degrees.every((d, i) => chordActive[i] === d),
              )
                ? [
                    CHORD_PRESETS.find(
                      (p) =>
                        p.length === chordLength &&
                        p.degrees.length === chordActive.length &&
                        p.degrees.every((d, i) => chordActive[i] === d),
                    )!.id,
                  ]
                : []
            }
            exclusive
            onChange={(_next, id) => applyLayerChordPreset(layer.id, id)}
          />
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        {!isDrum && generatorDef.schema.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {generatorDef.label} settings
            </p>
            <SchemaForm
              schema={generatorDef.schema}
              params={layer.params}
              onChange={(key, value) => setLayerParam(layer.id, key, value)}
            />
          </div>
        ) : null}
        {timbreSchema.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {isDrum ? 'Drum options' : 'Timbre'}
            </p>
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
