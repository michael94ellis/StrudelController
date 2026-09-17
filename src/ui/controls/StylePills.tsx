import { cn } from '../../lib/cn'

export type StylePillOption = {
  id: string
  label: string
}

type Props = {
  label: string
  hint?: string
  options: StylePillOption[]
  activeIds: string[]
  /** When true, only one option in this row can be on (radio). */
  exclusive?: boolean
  /** When exclusive, clicking the active pill turns it off. */
  allowOff?: boolean
  onChange: (nextActiveIds: string[], toggledId: string, on: boolean) => void
}

export function StylePills({
  label,
  hint,
  options,
  activeIds,
  exclusive = false,
  allowOff = false,
  onChange,
}: Props) {
  return (
    <div className="space-y-2">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = activeIds.includes(opt.id)
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                if (exclusive) {
                  if (on) {
                    if (allowOff) onChange([], opt.id, false)
                    return
                  }
                  onChange([opt.id], opt.id, true)
                  return
                }
                const next = on
                  ? activeIds.filter((id) => id !== opt.id)
                  : [...activeIds, opt.id]
                onChange(next, opt.id, !on)
              }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                on
                  ? 'border-amber bg-amber/15 text-ink'
                  : 'border-wood/20 bg-cream/60 text-ink-soft hover:border-wood/35',
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
