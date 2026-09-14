import { cn } from '../../lib/cn'

type SliderProps = {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  display?: string
}

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  display,
}: SliderProps) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="flex justify-between text-xs font-medium text-muted">
        <span>{label}</span>
        <span className="tabular-nums text-ink-soft">{display ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'w-full accent-amber h-1.5 cursor-pointer appearance-none rounded-full',
          'bg-paper-deep',
        )}
      />
    </label>
  )
}
