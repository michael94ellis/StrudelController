import type { BeatLayer } from '../music/types'
import { layerInstrumentSchema } from '../music/sampleLayers'
import { CHORD_PRESETS, chordPresetPillLabel, isMelodicKind, patternGroupsForKind } from '../music/layerStyles'
import { useBeatStore } from '../store/beatStore'
import { SchemaForm } from './controls/SchemaForm'
import { StylePills } from './controls/StylePills'

type Props = { layer: BeatLayer }

export function LayerPanel({ layer }: Props) {
  const toggleLayerPatternStyle = useBeatStore((s) => s.toggleLayerPatternStyle)
  const applyLayerChordPreset = useBeatStore((s) => s.applyLayerChordPreset)
  const setInstrumentParam = useBeatStore((s) => s.setInstrumentParam)

  const isDrum = layer.kind === 'drumkit'
  const showMood = layer.kind === 'subBass' || isMelodicKind(layer.kind)
  const patternGroups = patternGroupsForKind(layer.kind)
  const patternActive = layer.patternStyleIds ?? []
  const chordActive = layer.chordStyleIds ?? []
  const chordLength = layer.chordLength ?? 4

  const timbreSchema = layerInstrumentSchema(layer.kind).filter((f) => {
    if (f.key === 'bank' || f.key === 'gain') return false
    if (f.key === 'strudelSound' || f.key === 'strudelSoundCustom') return false
    // Keep a couple of audible timbre knobs only
    if (isDrum) return f.key === 'crunch'
    if (layer.kind === 'subBass') return f.key === 'cutoff'
    return f.key === 'cutoff' || f.key === 'room'
  })

  const activeMoodId =
    CHORD_PRESETS.find(
      (p) =>
        p.length === chordLength &&
        p.degrees.length === chordActive.length &&
        p.degrees.every((d, i) => chordActive[i] === d),
    )?.id ?? null

  return (
    <div className="space-y-5 border-t border-wood/10 px-4 py-4">
      <div className="space-y-4">
        {patternGroups.map((group) => (
          <StylePills
            key={group.id}
            label={group.label}
            hint={group.hint}
            options={group.options.map((o) => ({ id: o.id, label: o.label }))}
            activeIds={patternActive}
            exclusive={group.exclusive !== false}
            allowOff={group.allowOff === true}
            onChange={(_next, id) => toggleLayerPatternStyle(layer.id, group.id, id)}
          />
        ))}
      </div>

      {showMood ? (
        <StylePills
          label="Chords that play under this layer"
          hint="Roman numerals — actual chords follow the loop key."
          pillWrap
          options={CHORD_PRESETS.map((p) => ({
            id: p.id,
            label: chordPresetPillLabel(p),
          }))}
          activeIds={activeMoodId ? [activeMoodId] : []}
          exclusive
          onChange={(_next, id) => applyLayerChordPreset(layer.id, id)}
        />
      ) : null}

      {timbreSchema.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {isDrum ? 'Drum options' : 'Sound'}
          </p>
          <SchemaForm
            schema={timbreSchema}
            params={layer.instrumentParams}
            onChange={(key, value) => setInstrumentParam(layer.id, key, value)}
          />
        </div>
      ) : null}
    </div>
  )
}
