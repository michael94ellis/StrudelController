import { Play, Square } from 'lucide-react'
import { useBeatStore } from '../store/beatStore'
import { Slider } from './controls/Slider'
import { cn } from '../lib/cn'

export function Transport() {
  const playing = useBeatStore((s) => s.playing)
  const name = useBeatStore((s) => s.beat.name)
  const bpm = useBeatStore((s) => s.beat.bpm)
  const play = useBeatStore((s) => s.play)
  const stop = useBeatStore((s) => s.stop)
  const setBpm = useBeatStore((s) => s.setBpm)
  const error = useBeatStore((s) => s.error)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void (playing ? stop() : play())}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition',
            playing ? 'bg-ink text-cream hover:bg-ink-soft' : 'bg-amber text-cream hover:bg-wood',
          )}
        >
          {playing ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
          {playing ? 'Stop' : 'Play'}
        </button>
        <div className="min-w-[10rem] flex-1 sm:min-w-[14rem]">
          <Slider
            label="BPM"
            value={bpm}
            min={60}
            max={200}
            step={1}
            display={`${bpm}`}
            onChange={setBpm}
          />
        </div>
      </div>
      {error ? (
        <p className="max-w-md rounded-lg bg-red-50/80 px-3 py-2 text-xs text-red-800/80">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted">Looping {name}</p>
      )}
    </div>
  )
}
