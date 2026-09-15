import { Plus, Trash2 } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { cn } from '../lib/cn'

export function GlobalPanel() {
  const songs = useSongStore((s) => s.songs)
  const song = useSongStore((s) => s.song)
  const selectSong = useSongStore((s) => s.selectSong)
  const addSong = useSongStore((s) => s.addSong)
  const renameSong = useSongStore((s) => s.renameSong)
  const deleteSong = useSongStore((s) => s.deleteSong)

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Songs</h2>
          <p className="text-sm text-muted">Saved in this browser</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addSong()}
            className="inline-flex items-center gap-1 rounded-full border border-wood/20 bg-cream/80 px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-wood/40"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
          <button
            type="button"
            disabled={songs.length <= 1}
            onClick={() => deleteSong()}
            className="inline-flex items-center gap-1 rounded-full border border-wood/20 px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-red-300 hover:text-red-800 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {songs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => selectSong(entry.id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition border',
              song.id === entry.id
                ? 'bg-wood text-cream border-wood'
                : 'bg-cream/70 text-ink-soft border-wood/15 hover:border-wood/40',
            )}
          >
            {entry.title}
          </button>
        ))}
      </div>

      <label className="flex max-w-md flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Song name</span>
        <input
          type="text"
          value={song.title}
          onChange={(e) => renameSong(e.target.value)}
          className="rounded-lg border border-wood/20 bg-cream px-2.5 py-2 text-sm text-ink outline-none focus:border-amber"
        />
      </label>
    </section>
  )
}
