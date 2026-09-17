import { KEYS } from '../music/theory'
import { useBeatStore } from '../store/beatStore'
import { Select } from './controls/Select'
import { Slider } from './controls/Slider'

const SCALES = [
  { value: 'major:pentatonic', label: 'Major pentatonic' },
  { value: 'major', label: 'Major' },
  { value: 'minor:pentatonic', label: 'Minor pentatonic' },
  { value: 'minor', label: 'Minor' },
  { value: 'dorian', label: 'Dorian' },
]

export function LoopSettings() {
  const beat = useBeatStore((s) => s.beat)
  const setBpm = useBeatStore((s) => s.setBpm)
  const setKey = useBeatStore((s) => s.setKey)
  const setScale = useBeatStore((s) => s.setScale)
  const shuffleVariation = useBeatStore((s) => s.shuffleVariation)

  const scaleLabel = SCALES.find((s) => s.value === beat.scale)?.label ?? beat.scale

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">Loop</h2>
        <p className="text-sm text-muted">
          Tempo and key for the whole beat. Groove and chord degrees are per track (expand a row).
        </p>
      </div>

      <div className="space-y-6 rounded-2xl border border-wood/15 bg-cream/40 p-4 sm:p-5">
        <p className="text-sm font-medium text-ink-soft">
          {beat.bpm} BPM · {beat.key} {scaleLabel}
        </p>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Tempo</p>
          <Slider
            label="BPM"
            value={beat.bpm}
            min={60}
            max={200}
            step={1}
            display={`${beat.bpm}`}
            onChange={setBpm}
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Key</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Key"
              value={beat.key}
              options={KEYS.map((k) => ({ value: k, label: k }))}
              onChange={setKey}
            />
            <Select label="Scale" value={beat.scale} options={SCALES} onChange={setScale} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-wood/10 pt-4">
          <p className="text-xs text-muted">Bar fills on supported drum patterns (all tracks)</p>
          <button
            type="button"
            onClick={() => shuffleVariation()}
            className="rounded-full border border-wood/25 bg-cream/60 px-4 py-2 text-sm font-medium text-ink hover:bg-cream"
          >
            Shuffle patterns
          </button>
        </div>
      </div>
    </section>
  )
}
