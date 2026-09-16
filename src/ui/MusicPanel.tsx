import { useBeatStore } from '../store/beatStore'
import { KEYS, PROGRESSIONS, getProgression } from '../music/theory'
import { Select } from './controls/Select'

const SCALES = [
  { value: 'major:pentatonic', label: 'Major pentatonic' },
  { value: 'major', label: 'Major' },
  { value: 'minor:pentatonic', label: 'Minor pentatonic' },
  { value: 'minor', label: 'Minor' },
  { value: 'dorian', label: 'Dorian' },
]

export function MusicPanel() {
  const beat = useBeatStore((s) => s.beat)
  const setKey = useBeatStore((s) => s.setKey)
  const setScale = useBeatStore((s) => s.setScale)
  const setProgression = useBeatStore((s) => s.setProgression)

  const bars = getProgression(beat.progressionId).chords.length

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg text-ink">Harmony</h2>
        <p className="text-sm text-muted">
          One chord per bar — this loop is {bars} {bars === 1 ? 'bar' : 'bars'} long. Use{' '}
          <span className="text-ink-soft">16-bar journey</span> or longer if you do not want an
          obvious repeat.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Chord progression"
          value={beat.progressionId}
          options={PROGRESSIONS.map((p) => ({ value: p.id, label: p.label }))}
          onChange={setProgression}
        />
        <Select
          label="Key"
          value={beat.key}
          options={KEYS.map((k) => ({ value: k, label: k }))}
          onChange={setKey}
        />
        <Select label="Scale" value={beat.scale} options={SCALES} onChange={setScale} />
      </div>
    </section>
  )
}
