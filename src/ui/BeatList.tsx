import { Copy, Plus, Trash2 } from 'lucide-react'
import { useBeatStore } from '../store/beatStore'
import { cn } from '../lib/cn'

export function BeatList() {
  const beats = useBeatStore((s) => s.beats)
  const beat = useBeatStore((s) => s.beat)
  const selectBeat = useBeatStore((s) => s.selectBeat)
  const addBeat = useBeatStore((s) => s.addBeat)
  const duplicateBeat = useBeatStore((s) => s.duplicateBeat)
  const renameBeat = useBeatStore((s) => s.renameBeat)
  const deleteBeat = useBeatStore((s) => s.deleteBeat)

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Beats</h2>
          <p className="text-sm text-muted">Saved in this browser</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addBeat()}
            className="inline-flex items-center gap-1 rounded-full border border-wood/20 bg-cream/80 px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-wood/40"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
          <button
            type="button"
            onClick={() => duplicateBeat()}
            className="inline-flex items-center gap-1 rounded-full border border-wood/20 bg-cream/80 px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-wood/40"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <button
            type="button"
            disabled={beats.length <= 1}
            onClick={() => deleteBeat()}
            className="inline-flex items-center gap-1 rounded-full border border-wood/20 px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-red-300 hover:text-red-800 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {beats.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => selectBeat(entry.id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition border',
              beat.id === entry.id
                ? 'bg-wood text-cream border-wood'
                : 'bg-cream/70 text-ink-soft border-wood/15 hover:border-wood/40',
            )}
          >
            {entry.name}
          </button>
        ))}
      </div>

      <label className="flex max-w-md flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Beat name</span>
        <input
          type="text"
          value={beat.name}
          onChange={(e) => renameBeat(e.target.value)}
          className="rounded-lg border border-wood/20 bg-cream px-2.5 py-2 text-sm text-ink outline-none focus:border-amber"
        />
      </label>
    </section>
  )
}
