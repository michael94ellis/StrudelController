import type { BeatKnobs } from '../music/types'
import { useBeatStore } from '../store/beatStore'
import { Slider } from './controls/Slider'

const KNOBS: Array<{ key: keyof BeatKnobs; label: string }> = [
  { key: 'energy', label: 'Energy' },
  { key: 'density', label: 'Density' },
  { key: 'groove', label: 'Groove' },
  { key: 'brightness', label: 'Brightness' },
]

export function VibeKnobs() {
  const knobs = useBeatStore((s) => s.beat.knobs)
  const setKnob = useBeatStore((s) => s.setKnob)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">Vibe</h2>
        <p className="text-sm text-muted">
          Shape the whole loop without digging into individual layers.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {KNOBS.map((knob) => (
          <Slider
            key={knob.key}
            label={knob.label}
            value={knobs[knob.key]}
            min={0}
            max={1}
            step={0.01}
            display={`${Math.round(knobs[knob.key] * 100)}%`}
            onChange={(v) => setKnob(knob.key, v)}
          />
        ))}
      </div>
    </section>
  )
}
