import { useSongStore } from '../store/songStore'
import { DEFAULT_KNOBS } from '../music/styles/types'
import { Slider } from './controls/Slider'
import { Select } from './controls/Select'

const KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb']
const SCALES = [
  { value: 'major:pentatonic', label: 'Major pentatonic' },
  { value: 'major', label: 'Major' },
  { value: 'minor:pentatonic', label: 'Minor pentatonic' },
  { value: 'minor', label: 'Minor' },
  { value: 'dorian', label: 'Dorian' },
]

export function VibeKnobs() {
  const knobs = useSongStore((s) => s.song.knobs ?? DEFAULT_KNOBS)
  const globals = useSongStore((s) => s.song.globals)
  const setKnob = useSongStore((s) => s.setKnob)
  const setBpm = useSongStore((s) => s.setBpm)
  const setKey = useSongStore((s) => s.setKey)
  const setScale = useSongStore((s) => s.setScale)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">Variations</h2>
        <p className="text-sm text-muted">
          Tweak the feel without digging into individual instruments.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider
          label="Energy"
          value={knobs.energy}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(knobs.energy * 100)}%`}
          onChange={(v) => setKnob('energy', v)}
        />
        <Slider
          label="Density"
          value={knobs.density}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(knobs.density * 100)}%`}
          onChange={(v) => setKnob('density', v)}
        />
        <Slider
          label="Groove"
          value={knobs.groove}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(knobs.groove * 100)}%`}
          onChange={(v) => setKnob('groove', v)}
        />
        <Slider
          label="Brightness"
          value={knobs.brightness}
          min={0}
          max={1}
          step={0.01}
          display={`${Math.round(knobs.brightness * 100)}%`}
          onChange={(v) => setKnob('brightness', v)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Slider
          label="BPM"
          value={globals.bpm}
          min={70}
          max={150}
          step={1}
          display={`${globals.bpm}`}
          onChange={setBpm}
        />
        <Select
          label="Key"
          value={globals.key}
          options={KEYS.map((k) => ({ value: k, label: k }))}
          onChange={setKey}
        />
        <Select label="Scale" value={globals.scale} options={SCALES} onChange={setScale} />
      </div>
    </section>
  )
}
