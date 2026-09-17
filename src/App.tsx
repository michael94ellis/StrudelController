import { useMemo } from 'react'
import { Transport } from './ui/Transport'
import { BeatList } from './ui/BeatList'
import { GenrePicker } from './ui/GenrePicker'
import { LoopSettings } from './ui/LoopSettings'
import { LayerRack } from './ui/LayerRack'
import { useBeatStore } from './store/beatStore'
import { compileBeat } from './music/compile'

export default function App() {
  const beat = useBeatStore((s) => s.beat)
  const code = useMemo(() => compileBeat(beat), [beat])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wood">Strudel</p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink mt-1">Beat Studio</h1>
        <p className="mt-2 max-w-xl text-base text-ink-soft">
          Build looping beats — set the loop, then stack sample rows per voice.
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 mb-8 border-b border-wood/10 bg-[#f3ebe0]/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <Transport />
      </div>

      <div className="space-y-10">
        <BeatList />
        <LayerRack />
        <details className="rounded-2xl border border-wood/15 bg-cream/40 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-soft">
            Genre & loop settings
          </summary>
          <div className="mt-4 space-y-10">
            <GenrePicker />
            <LoopSettings />
          </div>
        </details>

        <details className="rounded-2xl border border-wood/15 bg-cream/40 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-soft">
            Generated Strudel code
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-ink p-4 text-xs leading-relaxed text-cream">
            {code}
          </pre>
        </details>
      </div>

      <footer className="mt-12 border-t border-wood/10 pt-4 text-xs text-muted">
        AGPL-3.0 · Uses{' '}
        <a
          className="underline hover:text-ink"
          href="https://strudel.cc"
          target="_blank"
          rel="noreferrer"
        >
          @strudel/web
        </a>
      </footer>
    </div>
  )
}
