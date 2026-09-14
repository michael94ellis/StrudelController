import { Plus, Trash2 } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { instrumentDefs } from '../music/instruments/registry'
import type { InstrumentKind } from '../music/types'
import { SchemaForm } from './controls/SchemaForm'
import { cn } from '../lib/cn'

const KINDS = Object.keys(instrumentDefs) as InstrumentKind[]

export function InstrumentRack() {
  const instruments = useSongStore((s) => s.song.instruments)
  const selectedId = useSongStore((s) => s.selectedInstrumentId)
  const selectInstrument = useSongStore((s) => s.selectInstrument)
  const setInstrumentParam = useSongStore((s) => s.setInstrumentParam)
  const addInstrument = useSongStore((s) => s.addInstrument)
  const removeInstrument = useSongStore((s) => s.removeInstrument)

  const selected = instruments.find((i) => i.id === selectedId) ?? instruments[0]
  const def = selected ? instrumentDefs[selected.kind] : null

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Instruments</h2>
          <p className="text-sm text-muted">Timbre only — what things sound like.</p>
        </div>
        <div className="relative">
          <select
            className="appearance-none rounded-full border border-wood/20 bg-cream/80 py-1.5 pl-3 pr-8 text-xs font-medium text-ink-soft"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value as InstrumentKind
              if (v) addInstrument(v)
              e.target.value = ''
            }}
          >
            <option value="" disabled>
              Add…
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
        {instruments.map((inst) => (
          <button
            key={inst.id}
            type="button"
            onClick={() => selectInstrument(inst.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm border transition',
              selected?.id === inst.id
                ? 'bg-ink text-cream border-ink'
                : 'bg-cream/60 text-ink-soft border-wood/15 hover:border-wood/40',
            )}
          >
            {inst.name}
          </button>
        ))}
      </div>

      {selected && def ? (
        <div className="rounded-2xl border border-wood/15 bg-cream/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink">{selected.name}</p>
              <p className="text-xs text-muted">{def.label}</p>
            </div>
            <button
              type="button"
              onClick={() => removeInstrument(selected.id)}
              className="rounded-full p-2 text-muted hover:bg-wood/10 hover:text-ink"
              title="Remove instrument"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <SchemaForm
            schema={def.schema}
            params={selected.params}
            onChange={(key, value) => setInstrumentParam(selected.id, key, value)}
          />
        </div>
      ) : null}
    </section>
  )
}
