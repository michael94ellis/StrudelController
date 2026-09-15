import { Copy, Plus, Trash2 } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { instrumentDefs } from '../music/instruments/registry'
import { generatorDefs } from '../music/generators/registry'
import type { GeneratorName, InstrumentKind } from '../music/types'
import { SchemaForm } from './controls/SchemaForm'
import { Select } from './controls/Select'
import { Toggle } from './controls/Toggle'
import { cn } from '../lib/cn'

const KINDS = Object.keys(instrumentDefs) as InstrumentKind[]

function generatorsFor(kind: InstrumentKind): GeneratorName[] {
  return (Object.keys(generatorDefs) as GeneratorName[]).filter((g) =>
    generatorDefs[g].suits.includes(kind),
  )
}

export function TrackRack() {
  const instruments = useSongStore((s) => s.song.instruments)
  const parts = useSongStore((s) => s.song.parts)
  const selectedInstrumentId = useSongStore((s) => s.selectedInstrumentId)
  const selectedPartId = useSongStore((s) => s.selectedPartId)
  const selectInstrument = useSongStore((s) => s.selectInstrument)
  const selectPart = useSongStore((s) => s.selectPart)
  const addTrack = useSongStore((s) => s.addTrack)
  const addPart = useSongStore((s) => s.addPart)
  const removeInstrument = useSongStore((s) => s.removeInstrument)
  const removePart = useSongStore((s) => s.removePart)
  const setInstrumentParam = useSongStore((s) => s.setInstrumentParam)
  const setInstrumentName = useSongStore((s) => s.setInstrumentName)
  const setPartParam = useSongStore((s) => s.setPartParam)
  const setPartName = useSongStore((s) => s.setPartName)
  const setPartGenerator = useSongStore((s) => s.setPartGenerator)
  const duplicatePart = useSongStore((s) => s.duplicatePart)
  const togglePart = useSongStore((s) => s.togglePart)

  const selectedInstrument =
    instruments.find((i) => i.id === selectedInstrumentId) ?? instruments[0]
  const trackParts = selectedInstrument
    ? parts.filter((p) => p.instrumentId === selectedInstrument.id)
    : []
  const selectedPart =
    trackParts.find((p) => p.id === selectedPartId) ?? trackParts[0] ?? null

  const instrumentDef = selectedInstrument
    ? instrumentDefs[selectedInstrument.kind]
    : null
  const partDef = selectedPart ? generatorDefs[selectedPart.generator] : null
  const suitedGens = selectedInstrument
    ? generatorsFor(selectedInstrument.kind)
    : []

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Tracks</h2>
          <p className="text-sm text-muted">
            Sound library for the song. Patterns are reused in sections — duplicate
            a pattern to vary verse vs chorus.
          </p>
        </div>
        <div className="relative">
          <select
            className="appearance-none rounded-full border border-wood/20 bg-cream/80 py-1.5 pl-3 pr-8 text-xs font-medium text-ink-soft"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value as InstrumentKind
              if (v) addTrack(v)
              e.target.value = ''
            }}
          >
            <option value="" disabled>
              Add track…
            </option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {instrumentDefs[k].label}
              </option>
            ))}
          </select>
          <Plus className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {instruments.map((inst) => {
          const count = parts.filter((p) => p.instrumentId === inst.id).length
          return (
            <button
              key={inst.id}
              type="button"
              onClick={() => {
                selectInstrument(inst.id)
                const first = parts.find((p) => p.instrumentId === inst.id)
                if (first) selectPart(first.id)
              }}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm border transition',
                selectedInstrument?.id === inst.id
                  ? 'bg-ink text-cream border-ink'
                  : 'bg-cream/60 text-ink-soft border-wood/15 hover:border-wood/40',
              )}
            >
              {inst.name}
              <span className="ml-1 opacity-60 text-xs">{count}</span>
            </button>
          )
        })}
      </div>

      {selectedInstrument && instrumentDef ? (
        <div className="rounded-2xl border border-wood/15 bg-cream/50 p-4 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <label className="block text-xs font-medium text-muted">
                Track name
              </label>
              <input
                type="text"
                value={selectedInstrument.name}
                onChange={(e) =>
                  setInstrumentName(selectedInstrument.id, e.target.value)
                }
                className="w-full max-w-xs rounded-lg border border-wood/20 bg-cream px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-amber"
              />
              <p className="text-xs text-muted">{instrumentDef.label} · sound</p>
            </div>
            <button
              type="button"
              onClick={() => removeInstrument(selectedInstrument.id)}
              className="rounded-full p-2 text-muted hover:bg-wood/10 hover:text-ink"
              title="Remove track"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted">Sound</p>
            <SchemaForm
              schema={instrumentDef.schema}
              params={selectedInstrument.params}
              onChange={(key, value) =>
                setInstrumentParam(selectedInstrument.id, key, value)
              }
            />
          </div>

          <div className="border-t border-wood/10 pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted">Patterns</p>
                <p className="text-xs text-muted/80">
                  Assign these per section in Sections. Duplicate to make a chorus
                  variant with different settings.
                </p>
              </div>
              <div className="relative">
                <select
                  className="appearance-none rounded-full border border-wood/20 bg-cream py-1 pl-3 pr-7 text-xs font-medium text-ink-soft"
                  defaultValue=""
                  onChange={(e) => {
                    const g = e.target.value as GeneratorName
                    if (g) addPart(selectedInstrument.id, g)
                    e.target.value = ''
                  }}
                >
                  <option value="" disabled>
                    Add pattern…
                  </option>
                  {suitedGens.map((g) => (
                    <option key={g} value={g}>
                      {generatorDefs[g].label}
                    </option>
                  ))}
                </select>
                <Plus className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" />
              </div>
            </div>

            {trackParts.length === 0 ? (
              <p className="text-xs text-muted">
                No patterns yet — add one so this track can play.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trackParts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPart(p.id)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs border transition',
                      !p.enabled && 'opacity-40',
                      selectedPart?.id === p.id
                        ? 'bg-wood text-cream border-wood'
                        : 'bg-transparent text-ink-soft border-wood/20 hover:border-wood/40',
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {selectedPart && partDef ? (
              <div className="rounded-xl border border-wood/10 bg-cream/70 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      type="text"
                      value={selectedPart.name}
                      onChange={(e) =>
                        setPartName(selectedPart.id, e.target.value)
                      }
                      className="w-full max-w-xs rounded-lg border border-wood/20 bg-cream px-2 py-1 text-sm text-ink outline-none focus:border-amber"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle
                      label="On"
                      checked={selectedPart.enabled}
                      onChange={() => togglePart(selectedPart.id)}
                    />
                    <button
                      type="button"
                      onClick={() => duplicatePart(selectedPart.id)}
                      className="rounded-full p-1.5 text-muted hover:bg-wood/10 hover:text-ink"
                      title="Duplicate pattern"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePart(selectedPart.id)}
                      className="rounded-full p-1.5 text-muted hover:bg-wood/10 hover:text-ink"
                      title="Delete pattern"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <Select
                  label="Beat / pattern type"
                  value={selectedPart.generator}
                  options={suitedGens.map((g) => ({
                    value: g,
                    label: generatorDefs[g].label,
                  }))}
                  onChange={(g) =>
                    setPartGenerator(selectedPart.id, g as GeneratorName)
                  }
                />
                <SchemaForm
                  schema={partDef.schema}
                  params={selectedPart.params}
                  onChange={(key, value) =>
                    setPartParam(selectedPart.id, key, value)
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
