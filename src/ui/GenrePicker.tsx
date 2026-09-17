import { useBeatStore } from '../store/beatStore'
import { GENRES, getGenre } from '../music/genres'
import { cn } from '../lib/cn'

export function GenrePicker() {
  const genreId = useBeatStore((s) => s.beat.genreId)
  const setGenre = useBeatStore((s) => s.setGenre)
  const active = getGenre(genreId)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">Genre</h2>
        <p className="text-sm text-muted">
          Loads a starter layer stack, tempo, and harmony. Replaces the current layers.
        </p>
        {active ? (
          <p className="mt-2 text-sm text-ink-soft">
            <span className="font-medium text-ink">{active.label}</span>
            {'. '}
            {active.blurb}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {GENRES.map((genre) => (
          <button
            key={genre.id}
            type="button"
            onClick={() => setGenre(genre.id)}
            className={cn(
              'rounded-2xl border px-4 py-3 text-left transition',
              genreId === genre.id
                ? 'bg-wood text-cream border-wood'
                : 'bg-cream/70 text-ink border-wood/15 hover:border-wood/40',
            )}
          >
            <p className="font-medium">{genre.label}</p>
            <p
              className={cn(
                'mt-1 text-xs leading-snug',
                genreId === genre.id ? 'text-cream/75' : 'text-muted',
              )}
            >
              {genre.blurb}
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}
