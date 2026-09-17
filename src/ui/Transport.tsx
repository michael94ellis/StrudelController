import { Download, Play, Square } from 'lucide-react'
import { useBeatStore } from '../store/beatStore'
import { snapExportDuration } from '../music/loopDuration'
import { cn } from '../lib/cn'

const EXPORT_TARGETS = [5, 10, 15, 30] as const

export function Transport() {
  const playing = useBeatStore((s) => s.playing)
  const name = useBeatStore((s) => s.beat.name)
  const beat = useBeatStore((s) => s.beat)
  const play = useBeatStore((s) => s.play)
  const stop = useBeatStore((s) => s.stop)
  const exportLoop = useBeatStore((s) => s.exportLoop)
  const exporting = useBeatStore((s) => s.exporting)
  const exportLabel = useBeatStore((s) => s.exportLabel)
  const error = useBeatStore((s) => s.error)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => void (playing ? stop() : play())}
          disabled={exporting}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition',
            playing ? 'bg-ink text-cream hover:bg-ink-soft' : 'bg-amber text-cream hover:bg-wood',
            exporting && 'opacity-60',
          )}
        >
          {playing ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          {playing ? 'Stop' : 'Play'}
        </button>
        {error ? (
          <p className="max-w-md rounded-lg bg-red-50/80 px-3 py-2 text-xs text-red-800/80">
            {error}
          </p>
        ) : (
          <p className="text-xs text-muted">
            {exportLabel ?? `Looping ${name}`}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted">
          <Download className="h-3.5 w-3.5" />
          Download
        </span>
        {EXPORT_TARGETS.map((target) => {
          const snap = snapExportDuration(beat, target)
          const title =
            Math.abs(snap.seconds - target) < 0.05
              ? `${target}s seamless loop`
              : `Target ${target}s → ${snap.seconds.toFixed(1)}s (${snap.loops}× ${snap.cycleBars}-bar cycle) so it loops cleanly`
          return (
            <button
              key={target}
              type="button"
              title={title}
              disabled={exporting}
              onClick={() => void exportLoop(target)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                exporting
                  ? 'cursor-wait border-wood/15 text-muted'
                  : 'border-wood/25 bg-cream/70 text-ink hover:border-amber hover:bg-amber/15',
              )}
            >
              {target}s
            </button>
          )
        })}
      </div>
    </div>
  )
}
