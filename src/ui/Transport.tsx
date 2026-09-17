import { useEffect, useState } from 'react'
import { Circle, Download, Play, Square } from 'lucide-react'
import { useBeatStore } from '../store/beatStore'
import { liveRecordingElapsed } from '../audio/exportLoop'
import {
  EXPORT_LOOP_COUNTS,
  formatExportPlan,
  planExport,
  type ExportLength,
} from '../music/loopDuration'
import { cn } from '../lib/cn'

export function Transport() {
  const [selectedLength, setSelectedLength] = useState<ExportLength>(2)
  const [elapsed, setElapsed] = useState(0)
  const playing = useBeatStore((s) => s.playing)
  const name = useBeatStore((s) => s.beat.name)
  const beat = useBeatStore((s) => s.beat)
  const play = useBeatStore((s) => s.play)
  const stop = useBeatStore((s) => s.stop)
  const exportLoop = useBeatStore((s) => s.exportLoop)
  const stopExport = useBeatStore((s) => s.stopExport)
  const exporting = useBeatStore((s) => s.exporting)
  const exportLabel = useBeatStore((s) => s.exportLabel)
  const error = useBeatStore((s) => s.error)

  const plan = planExport(beat, selectedLength)
  const indefinite = selectedLength === 'indefinite'
  const recordingOpenEnded = exporting && indefinite

  useEffect(() => {
    if (!recordingOpenEnded) {
      setElapsed(0)
      return
    }
    const id = window.setInterval(() => setElapsed(liveRecordingElapsed()), 200)
    return () => window.clearInterval(id)
  }, [recordingOpenEnded])

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
            {exportLabel ??
              (recordingOpenEnded ? `Recording… ${elapsed.toFixed(0)}s` : `Looping ${name}`)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted">
          <Download className="h-3.5 w-3.5" />
          Length
        </span>
        {EXPORT_LOOP_COUNTS.map((n) => {
          const selected = selectedLength === n
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              disabled={exporting}
              onClick={() => setSelectedLength(n)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                selected
                  ? 'border-amber bg-amber/20 text-ink'
                  : 'border-wood/25 bg-cream/70 text-ink-soft hover:border-wood/40',
                exporting && 'opacity-60',
              )}
            >
              {n}×
            </button>
          )
        })}
        <button
          type="button"
          aria-pressed={indefinite}
          disabled={exporting}
          onClick={() => setSelectedLength('indefinite')}
          title="Record until you stop — finishes on a loop boundary"
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
            indefinite
              ? 'border-amber bg-amber/20 text-ink'
              : 'border-wood/25 bg-cream/70 text-ink-soft hover:border-wood/40',
            exporting && 'opacity-60',
          )}
        >
          ∞
        </button>

        {recordingOpenEnded ? (
          <button
            type="button"
            onClick={() => void stopExport()}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100"
          >
            <Square className="h-3 w-3 fill-current" />
            Stop & save
          </button>
        ) : (
          <button
            type="button"
            title={formatExportPlan(plan)}
            disabled={exporting}
            onClick={() => void exportLoop(selectedLength)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
              exporting
                ? 'cursor-wait border-red-200 bg-red-50 text-red-800'
                : 'border-wood/30 bg-ink text-cream hover:bg-ink-soft',
            )}
          >
            <Circle
              className={cn(
                'h-3 w-3',
                exporting ? 'fill-red-600 text-red-600' : 'fill-red-500 text-red-500',
              )}
            />
            {exporting ? 'Recording…' : 'Record'}
          </button>
        )}

        {!exporting ? (
          <span className="text-[11px] text-muted" title={formatExportPlan(plan)}>
            {formatExportPlan(plan)}
          </span>
        ) : null}
      </div>
    </div>
  )
}
