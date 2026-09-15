import { Plus, Trash2 } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { Slider } from './controls/Slider'
import { cn } from '../lib/cn'

type Energy = 'quiet' | 'groove' | 'full'

function inferEnergy(
  partIds: string[],
  layers: { quiet: string[]; groove: string[]; full: string[] } | undefined,
): Energy {
  if (!layers) return 'groove'
  const set = new Set(partIds)
  const score = (bucket: string[]) =>
    bucket.reduce((n, id) => n + (set.has(id) ? 1 : 0), 0)
  const q = score(layers.quiet)
  const g = score(layers.groove)
  const f = score(layers.full)
  if (f >= g && f >= q && f > 0) return 'full'
  if (q >= g && q > 0 && g === 0) return 'quiet'
  if (q > g) return 'quiet'
  return 'groove'
}

const ENERGIES: Array<{ id: Energy; label: string; hint: string }> = [
  { id: 'quiet', label: 'Quiet', hint: 'Sparse / intro feel' },
  { id: 'groove', label: 'Groove', hint: 'Main pocket' },
  { id: 'full', label: 'Full', hint: 'Chorus lift' },
]

export function SectionEditor() {
  const song = useSongStore((s) => s.song)
  const playMode = useSongStore((s) => s.playMode)
  const loopSectionId = useSongStore((s) => s.loopSectionId)
  const selectedSectionId = useSongStore((s) => s.selectedSectionId)
  const selectSection = useSongStore((s) => s.selectSection)
  const playSection = useSongStore((s) => s.playSection)
  const setSectionBars = useSongStore((s) => s.setSectionBars)
  const setSectionName = useSongStore((s) => s.setSectionName)
  const setSectionEnergy = useSongStore((s) => s.setSectionEnergy)
  const addSection = useSongStore((s) => s.addSection)
  const removeSection = useSongStore((s) => s.removeSection)

  const selected =
    song.sections.find((s) => s.id === selectedSectionId) ?? song.sections[0]
  const energy = selected
    ? inferEnergy(
        selected.parts.map((p) => p.partId),
        song.styleLayers,
      )
    : 'groove'

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Sections</h2>
          <p className="text-sm text-muted">
            Song form for this style. One section = loop forever.
          </p>
        </div>
        <button
          type="button"
          onClick={() => addSection()}
          className="inline-flex items-center gap-1 rounded-full border border-wood/20 bg-cream/80 px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-wood/40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add section
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {song.sections.map((sec) => {
          const isLoop = loopSectionId === sec.id
          const isSelected = selected?.id === sec.id
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                selectSection(sec.id)
                playSection(sec.id)
              }}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm border transition capitalize',
                isSelected
                  ? 'bg-ink text-cream border-ink'
                  : 'bg-cream/60 text-ink-soft border-wood/15 hover:border-wood/40',
                isLoop && playMode === 'loop' && 'ring-2 ring-amber/60 ring-offset-1',
              )}
            >
              {sec.name}
              <span className="ml-1 opacity-60 text-xs">{sec.bars}b</span>
            </button>
          )
        })}
      </div>

      {selected ? (
        <div className="rounded-2xl border border-wood/15 bg-cream/50 p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <label className="block text-xs font-medium text-muted">Name</label>
              <input
                type="text"
                value={selected.name}
                onChange={(e) => setSectionName(selected.id, e.target.value)}
                className="w-full max-w-xs rounded-lg border border-wood/20 bg-cream px-2.5 py-1.5 text-sm font-medium text-ink outline-none focus:border-amber capitalize"
              />
            </div>
            <button
              type="button"
              disabled={song.sections.length <= 1}
              onClick={() => removeSection(selected.id)}
              className="inline-flex items-center gap-1 rounded-full border border-wood/20 px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-red-300 hover:text-red-800 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>

          <Slider
            label="Bars"
            value={selected.bars}
            min={1}
            max={16}
            step={1}
            display={`${selected.bars}`}
            onChange={(v) => setSectionBars(selected.id, v)}
          />

          <div>
            <p className="mb-2 text-xs font-medium text-muted">Section energy</p>
            <div className="flex flex-wrap gap-2">
              {ENERGIES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!song.styleLayers}
                  onClick={() => setSectionEnergy(selected.id, opt.id)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm border transition',
                    energy === opt.id
                      ? 'bg-wood text-cream border-wood'
                      : 'bg-cream/70 text-ink-soft border-wood/15 hover:border-wood/40',
                    !song.styleLayers && 'opacity-40',
                  )}
                  title={opt.hint}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {!song.styleLayers ? (
              <p className="mt-2 text-xs text-muted">
                Pick a beat style to enable Quiet / Groove / Full.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
