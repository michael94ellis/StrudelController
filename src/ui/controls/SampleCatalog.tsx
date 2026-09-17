import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { SampleOptionGroup } from '../../music/sampleLayers'
import { cn } from '../../lib/cn'

type Props = {
  label: string
  groups: SampleOptionGroup[]
  onPick: (sampleId: string) => void
  className?: string
}

/** Nested sample browser: category → samples (list of lists). */
export function SampleCatalog({ label, groups, onPick, className }: Props) {
  const [query, setQuery] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set())

  const q = query.trim().toLowerCase()
  const filteredGroups = useMemo(() => {
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            o.value.toLowerCase().includes(q) ||
            g.label.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.options.length > 0)
  }, [groups, q])

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
        <p className="mt-0.5 text-xs text-muted">Open a category, then pick a sample.</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search categories or samples…"
        className="w-full rounded-lg border border-wood/25 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-amber"
      />

      <div className="max-h-[22rem] space-y-1 overflow-y-auto rounded-xl border border-wood/15 bg-cream/40 p-1.5">
        {filteredGroups.map((group) => {
          const open = Boolean(q) || openGroups.has(group.label)
          return (
            <div key={group.label} className="overflow-hidden rounded-lg">
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm font-medium text-ink hover:bg-wood/5"
                aria-expanded={open}
              >
                {open ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                )}
                <span className="flex-1">{group.label}</span>
                <span className="text-xs tabular-nums text-muted">{group.options.length}</span>
              </button>

              {open ? (
                <ul className="space-y-0.5 pb-1.5 pl-7 pr-1">
                  {group.options.map((opt) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        onClick={() => onPick(opt.value)}
                        className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-ink-soft hover:bg-amber/15 hover:text-ink"
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        })}

        {!filteredGroups.length ? (
          <p className="px-3 py-6 text-center text-sm text-muted">No samples match.</p>
        ) : null}
      </div>
    </div>
  )
}
