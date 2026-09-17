import { useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import { Transport } from './ui/Transport'
import { BeatList } from './ui/BeatList'
import { GenrePicker } from './ui/GenrePicker'
import { LoopSettings } from './ui/LoopSettings'
import { LayerRack } from './ui/LayerRack'
import { useBeatStore } from './store/beatStore'
import { compileBeat } from './music/compile'
import { BeatStudioLogo } from './ui/BeatStudioLogo'
import { strudelCcUrl } from './lib/strudelShare'

export default function App() {
  const beat = useBeatStore((s) => s.beat)
  const code = useMemo(() => compileBeat(beat), [beat])
  const openInStrudel = useMemo(() => strudelCcUrl(code), [code])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex gap-4 sm:gap-5">
        <BeatStudioLogo className="h-14 w-14 sm:h-16 sm:w-16" />
        <div className="min-w-0">
          <h1 className="font-display text-4xl sm:text-5xl text-ink leading-tight">Beat Strudelio</h1>
          <p className="mt-2 max-w-xl text-base text-ink-soft">
            Build looping beats: set the loop, then stack sample rows per voice.
          </p>
          <p className="mt-1 text-xs text-muted">Powered by Strudel</p>
        </div>
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={openInStrudel}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-wood/30 bg-ink px-3.5 py-1.5 text-xs font-semibold text-cream transition hover:bg-ink-soft"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in strudel.cc
            </a>
            <span className="text-[11px] text-muted">Opens this beat’s pattern in the Strudel REPL</span>
          </div>
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
        {' · '}
        <a
          className="underline hover:text-ink"
          href={openInStrudel}
          target="_blank"
          rel="noreferrer"
        >
          Open current beat in strudel.cc
        </a>
      </footer>
    </div>
  )
}
