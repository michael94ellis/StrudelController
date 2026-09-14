import { useSongStore } from '../store/songStore'
import { songPresets } from '../music/presets'
import { Select } from './controls/Select'
import { Slider } from './controls/Slider'
import { cn } from '../lib/cn'

const KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb']
const SCALES = [
  { value: 'major:pentatonic', label: 'Major pentatonic' },
  { value: 'major', label: 'Major' },
  { value: 'minor:pentatonic', label: 'Minor pentatonic' },
  { value: 'minor', label: 'Minor' },
  { value: 'dorian', label: 'Dorian' },
]

export function GlobalPanel() {
  const globals = useSongStore((s) => s.song.globals)
  const title = useSongStore((s) => s.song.title)
  const setKey = useSongStore((s) => s.setKey)
  const setScale = useSongStore((s) => s.setScale)
  const setSwing = useSongStore((s) => s.setSwing)
  const loadPreset = useSongStore((s) => s.loadPreset)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">Song</h2>
        <p className="text-sm text-muted">
          Load a full arrangement, then tweak instruments, parts, and sections.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {songPresets.map((preset, i) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => loadPreset(i)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition border',
              title === preset.title
                ? 'bg-wood text-cream border-wood'
                : 'bg-cream/70 text-ink-soft border-wood/15 hover:border-wood/40',
            )}
          >
            {preset.title}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Key"
          value={globals.key}
          options={KEYS.map((k) => ({ value: k, label: k }))}
          onChange={setKey}
        />
        <Select label="Scale" value={globals.scale} options={SCALES} onChange={setScale} />
        <Slider
          label="Swing"
          value={globals.swing}
          min={0.05}
          max={0.25}
          step={0.01}
          display={globals.swing.toFixed(2)}
          onChange={setSwing}
        />
      </div>
    </section>
  )
}
