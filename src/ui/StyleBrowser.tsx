import { useSongStore } from '../store/songStore'
import { BEAT_STYLES, getStyle } from '../music/styles/catalog'
import { cn } from '../lib/cn'

export function StyleBrowser() {
  const styleId = useSongStore((s) => s.song.styleId)
  const applyStyle = useSongStore((s) => s.applyStyle)
  const active = styleId ? getStyle(styleId) : undefined

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">Beat style</h2>
        <p className="text-sm text-muted">
          Four distinct vibes — then shape them with the knobs below.
        </p>
        {active ? (
          <p className="mt-2 text-sm text-ink-soft">
            <span className="font-medium text-ink">{active.label}</span>
            {' — '}
            {active.blurb}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {BEAT_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => applyStyle(style.id)}
            className={cn(
              'rounded-2xl border px-4 py-3 text-left transition',
              styleId === style.id
                ? 'bg-wood text-cream border-wood'
                : 'bg-cream/70 text-ink border-wood/15 hover:border-wood/40',
            )}
          >
            <p className="font-medium">{style.label}</p>
            <p
              className={cn(
                'mt-1 text-xs leading-snug',
                styleId === style.id ? 'text-cream/75' : 'text-muted',
              )}
            >
              {style.blurb}
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}
