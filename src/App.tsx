import { useMemo } from 'react'
import { Transport } from './ui/Transport'
import { GlobalPanel } from './ui/GlobalPanel'
import { StyleBrowser } from './ui/StyleBrowser'
import { VibeKnobs } from './ui/VibeKnobs'
import { SectionEditor } from './ui/SectionEditor'
import { ArrangementTimeline } from './ui/ArrangementTimeline'
import { useSongStore } from './store/songStore'
import { compileLoop, compileSong } from './music/compile'

export default function App() {
  const song = useSongStore((s) => s.song)
  const playMode = useSongStore((s) => s.playMode)
  const loopSectionId = useSongStore((s) => s.loopSectionId)

  const code = useMemo(() => {
    if (playMode === 'song') return compileSong(song)
    return compileLoop(song, loopSectionId ?? song.sections[0]?.id)
  }, [song, playMode, loopSectionId])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wood">Strudel</p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink mt-1">Beat Studio</h1>
        <p className="mt-2 max-w-xl text-base text-ink-soft">
          Start from popular beat styles, then shape energy, density, and song form.
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 mb-8 border-b border-wood/10 bg-[#f3ebe0]/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <Transport />
      </div>

      <div className="space-y-10">
        <GlobalPanel />
        <StyleBrowser />
        <VibeKnobs />
        <ArrangementTimeline />
        <SectionEditor />

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
        <a className="underline hover:text-ink" href="https://strudel.cc" target="_blank" rel="noreferrer">
          @strudel/web
        </a>
      </footer>
    </div>
  )
}
