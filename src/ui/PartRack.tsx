import { Plus, Trash2 } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { generatorDefs } from '../music/generators/registry'
import type { GeneratorName } from '../music/types'
import { SchemaForm } from './controls/SchemaForm'
import { Toggle } from './controls/Toggle'
import { cn } from '../lib/cn'

const QUICK_ADD: GeneratorName[] = [
  'fourOnFloor',
  'rootBass',
  'chordStabs',
  'melodyPhrase',
  'arpUp',
  'chimeHits',
]

export function PartRack() {
  const parts = useSongStore((s) => s.song.parts)
  const instruments = useSongStore((s) => s.song.instruments)
  const selectedId = useSongStore((s) => s.selectedPartId)
  const selectedInstrumentId = useSongStore((s) => s.selectedInstrumentId)
  const selectPart = useSongStore((s) => s.selectPart)
  const setPartParam = useSongStore((s) => s.setPartParam)
  const togglePart = useSongStore((s) => s.togglePart)
  const addPart = useSongStore((s) => s.addPart)
  const removePart = useSongStore((s) => s.removePart)

  const selected = parts.find((p) => p.id === selectedId) ?? parts[0]
  const def = selected ? generatorDefs[selected.generator] : null
  const instrument = selected
    ? instruments.find((i) => i.id === selected.instrumentId)
    : null
  const targetInstrumentId = selectedInstrumentId ?? instruments[0]?.id

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">Parts</h2>
        <p className="text-sm text-muted">
          Generators on an instrument — rhythm and notes without changing timbre.
          {targetInstrumentId
            ? ` Adding onto “${instruments.find((i) => i.id === targetInstrumentId)?.name}”.`
            : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_ADD.map((g) => (
          <button
            key={g}
            type="button"
            disabled={!targetInstrumentId}
            onClick={() => {
              if (targetInstrumentId) addPart(targetInstrumentId, g)
            }}
            className="inline-flex items-center gap-1 rounded-full border border-wood/15 bg-cream/60 px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-wood/40 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            {generatorDefs[g].label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {parts.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPart(p.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm border transition',
              !p.enabled && 'opacity-40',
              selected?.id === p.id
                ? 'bg-ink text-cream border-ink'
                : 'bg-cream/60 text-ink-soft border-wood/15 hover:border-wood/40',
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {selected && def ? (
        <div className="rounded-2xl border border-wood/15 bg-cream/50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-ink">{selected.name}</p>
              <p className="text-xs text-muted">
                {def.label}
                {instrument ? ` · ${instrument.name}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Toggle
                label="On"
                checked={selected.enabled}
                onChange={() => togglePart(selected.id)}
              />
              <button
                type="button"
                onClick={() => removePart(selected.id)}
                className="rounded-full p-2 text-muted hover:bg-wood/10 hover:text-ink"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <SchemaForm
            schema={def.schema}
            params={selected.params}
            onChange={(key, value) => setPartParam(selected.id, key, value)}
          />
        </div>
      ) : null}
    </section>
  )
}
