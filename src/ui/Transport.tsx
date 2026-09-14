import { Play, Square } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { Slider } from './controls/Slider'
import { cn } from '../lib/cn'

export function Transport() {
  const playing = useSongStore((s) => s.playing)
  const bpm = useSongStore((s) => s.song.globals.bpm)
  const playMode = useSongStore((s) => s.playMode)
  const play = useSongStore((s) => s.play)
  const stop = useSongStore((s) => s.stop)
  const setBpm = useSongStore((s) => s.setBpm)
  const setPlayMode = useSongStore((s) => s.setPlayMode)
  const error = useSongStore((s) => s.error)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void (playing ? stop() : play())}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition',
              playing
                ? 'bg-ink text-cream hover:bg-ink-soft'
                : 'bg-amber text-cream hover:bg-wood',
            )}
          >
            {playing ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            {playing ? 'Stop' : 'Play'}
          </button>
          <div className="inline-flex rounded-full border border-wood/20 bg-cream/60 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setPlayMode('loop')}
              className={cn(
                'rounded-full px-3 py-1.5 transition',
                playMode === 'loop' ? 'bg-wood text-cream' : 'text-ink-soft hover:text-ink',
              )}
            >
              Loop section
            </button>
            <button
              type="button"
              onClick={() => setPlayMode('song')}
              className={cn(
                'rounded-full px-3 py-1.5 transition',
                playMode === 'song' ? 'bg-wood text-cream' : 'text-ink-soft hover:text-ink',
              )}
            >
              Play song
            </button>
          </div>
          <div className="min-w-[10rem] flex-1 sm:min-w-[14rem]">
            <Slider
              label="BPM"
              value={bpm}
              min={60}
              max={140}
              step={1}
              display={`${bpm}`}
              onChange={setBpm}
            />
          </div>
        </div>
        {error ? (
          <p className="max-w-md text-xs text-red-800/80 bg-red-50/80 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : (
          <p className="text-xs text-muted">
            {playMode === 'song'
              ? 'Playing full arrangement (intro → outro).'
              : 'Looping one section — pick it below.'}
          </p>
        )}
      </div>
    </div>
  )
}
