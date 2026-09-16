import { useMemo, useState } from 'react'
import type { SampleOptionGroup } from '../../music/sampleLayers'
import { cn } from '../../lib/cn'

type Props = {
  label: string
  value: string
  groups: SampleOptionGroup[]
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  /** Show search when the catalog is large */
  filterable?: boolean
}

export function SampleSelect({
  label,
  value,
  groups,
  onChange,
  className,
  placeholder,
  filterable = true,
}: Props) {
  const [query, setQuery] = useState('')
  const flat = useMemo(
    () => groups.flatMap((g) => g.options.map((o) => ({ ...o, group: g.label }))),
    [groups],
  )
  const inList = flat.some((o) => o.value === value)
  const selectValue = inList ? value : ''

  const q = query.trim().toLowerCase()
  const filteredGroups = useMemo(() => {
    if (!filterable || !q) return groups
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.options.length > 0)
  }, [groups, q, filterable])

  return (
    <div className={cn('flex min-w-0 w-full flex-col gap-2', className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
      {filterable ? (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search samples…"
          className="w-full rounded-lg border border-wood/25 bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-amber"
        />
      ) : null}
      <select
        value={selectValue}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value)
        }}
        className="w-full min-h-10 rounded-lg border-2 border-wood/25 bg-cream px-3 py-2 text-sm font-medium text-ink shadow-sm outline-none focus:border-amber"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {!inList && value ? (
          <option value="" disabled>
            {value} (current)
          </option>
        ) : null}
        {filteredGroups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {value && !placeholder ? (
        <p className="truncate text-xs text-muted">
          Playing: <span className="font-mono text-ink-soft">{value}</span>
        </p>
      ) : null}
    </div>
  )
}
