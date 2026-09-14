import { cn } from '../../lib/cn'

type ToggleProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 text-sm"
    >
      <span className="text-ink-soft font-medium">{label}</span>
      <span
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-amber' : 'bg-paper-deep',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-cream shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}
