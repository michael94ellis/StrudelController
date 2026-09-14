import { create } from 'zustand'
import type {
  GeneratorName,
  InstrumentKind,
  ParamValue,
  PlayMode,
  Song,
} from '../music/types'
import { newId } from '../music/types'
import { compileLoop, compileSong } from '../music/compile'
import { cloneSong, songPresets } from '../music/presets'
import { instrumentDefs } from '../music/instruments/registry'
import { generatorDefs } from '../music/generators/registry'
import { isPlaying, playCode, stopCode, updateCode, getSession } from '../audio/strudelEngine'

type SongState = {
  song: Song
  playMode: PlayMode
  loopSectionId: string | null
  playing: boolean
  error: string | null
  selectedInstrumentId: string | null
  selectedPartId: string | null
  selectedSectionId: string | null

  loadPreset: (index: number) => void
  setPlayMode: (mode: PlayMode) => void
  setLoopSection: (id: string) => void
  playSection: (id: string) => void
  reorderArrangement: (fromIndex: number, toIndex: number) => void
  setBpm: (bpm: number) => void
  setKey: (key: string) => void
  setScale: (scale: string) => void
  setSwing: (swing: number) => void

  selectInstrument: (id: string | null) => void
  selectPart: (id: string | null) => void
  selectSection: (id: string | null) => void

  setInstrumentParam: (id: string, key: string, value: ParamValue) => void
  setPartParam: (id: string, key: string, value: ParamValue) => void
  togglePart: (id: string) => void
  addInstrument: (kind: InstrumentKind) => void
  addPart: (instrumentId: string, generator: GeneratorName) => void
  removeInstrument: (id: string) => void
  removePart: (id: string) => void
  setSectionBars: (id: string, bars: number) => void
  setSectionName: (id: string, name: string) => void
  addSection: (name?: string) => void
  removeSection: (id: string) => void
  addArrangementSlot: (sectionId: string) => void
  removeArrangementSlot: (index: number) => void
  toggleSectionPart: (sectionId: string, partId: string) => void

  play: () => Promise<void>
  stop: () => void
  refreshIfPlaying: () => Promise<void>
  compiledCode: () => string
}

const initial = cloneSong(songPresets[0])

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function clearRefreshTimer() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

function compileCurrent(s: SongState): string {
  if (s.playMode === 'song') return compileSong(s.song)
  return compileLoop(s.song, s.loopSectionId ?? s.song.sections[0]?.id)
}

async function reevaluateLive(get: () => SongState) {
  const code = compileCurrent(get())
  await updateCode(code)
}

export const useSongStore = create<SongState>((set, get) => ({
  song: initial,
  playMode: 'loop',
  loopSectionId: initial.sections[0]?.id ?? null,
  playing: false,
  error: null,
  selectedInstrumentId: initial.instruments[0]?.id ?? null,
  selectedPartId: initial.parts[0]?.id ?? null,
  selectedSectionId: initial.sections[0]?.id ?? null,

  loadPreset: (index) => {
    const next = cloneSong(songPresets[index] ?? songPresets[0])
    set({
      song: next,
      loopSectionId: next.sections.find((s) => s.name === 'verse')?.id ?? next.sections[0]?.id,
      selectedInstrumentId: next.instruments[0]?.id ?? null,
      selectedPartId: next.parts[0]?.id ?? null,
      selectedSectionId: next.sections[0]?.id ?? null,
      error: null,
    })
    if (get().playing || isPlaying()) {
      void get().play()
    }
  },
  setPlayMode: (mode) => {
    set({ playMode: mode })
    if (get().playing || isPlaying()) {
      void get().play()
    }
  },
  setLoopSection: (id) => {
    set({ loopSectionId: id, playMode: 'loop', selectedSectionId: id })
    if (get().playing || isPlaying()) {
      void get().play()
    }
  },
  playSection: (id) => {
    clearRefreshTimer()
    set({ loopSectionId: id, playMode: 'loop', selectedSectionId: id })
    void get().play()
  },
  reorderArrangement: (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    set((s) => {
      const arrangement = [...s.song.arrangement]
      const [moved] = arrangement.splice(fromIndex, 1)
      if (!moved) return s
      arrangement.splice(toIndex, 0, moved)
      return { song: { ...s.song, arrangement } }
    })
    if (get().playMode === 'song' && (get().playing || isPlaying())) {
      void get().play()
    }
  },
  setBpm: (bpm) => {
    set((s) => ({ song: { ...s.song, globals: { ...s.song.globals, bpm } } }))
    void get().refreshIfPlaying()
  },
  setKey: (key) => {
    set((s) => ({ song: { ...s.song, globals: { ...s.song.globals, key } } }))
    void get().refreshIfPlaying()
  },
  setScale: (scale) => {
    set((s) => ({ song: { ...s.song, globals: { ...s.song.globals, scale } } }))
    void get().refreshIfPlaying()
  },
  setSwing: (swing) => {
    set((s) => ({ song: { ...s.song, globals: { ...s.song.globals, swing } } }))
    void get().refreshIfPlaying()
  },

  selectInstrument: (id) => set({ selectedInstrumentId: id }),
  selectPart: (id) => set({ selectedPartId: id }),
  selectSection: (id) => set({ selectedSectionId: id }),

  setInstrumentParam: (id, key, value) => {
    set((s) => ({
      song: {
        ...s.song,
        instruments: s.song.instruments.map((i) =>
          i.id === id ? { ...i, params: { ...i.params, [key]: value } } : i,
        ),
      },
    }))
    void get().refreshIfPlaying()
  },
  setPartParam: (id, key, value) => {
    set((s) => ({
      song: {
        ...s.song,
        parts: s.song.parts.map((p) =>
          p.id === id ? { ...p, params: { ...p.params, [key]: value } } : p,
        ),
      },
    }))
    void get().refreshIfPlaying()
  },
  togglePart: (id) => {
    set((s) => ({
      song: {
        ...s.song,
        parts: s.song.parts.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
      },
    }))
    void get().refreshIfPlaying()
  },
  addInstrument: (kind) => {
    const def = instrumentDefs[kind]
    const instrument = {
      id: newId('inst'),
      name: def.label,
      kind,
      params: { ...def.defaultParams },
    }
    set((s) => ({
      song: { ...s.song, instruments: [...s.song.instruments, instrument] },
      selectedInstrumentId: instrument.id,
    }))
  },
  addPart: (instrumentId, generator) => {
    const def = generatorDefs[generator]
    const p = {
      id: newId('part'),
      name: def.label,
      instrumentId,
      generator,
      params: { ...def.defaultParams },
      enabled: true,
    }
    set((s) => ({
      song: { ...s.song, parts: [...s.song.parts, p] },
      selectedPartId: p.id,
    }))
    void get().refreshIfPlaying()
  },
  removeInstrument: (id) => {
    set((s) => ({
      song: {
        ...s.song,
        instruments: s.song.instruments.filter((i) => i.id !== id),
        parts: s.song.parts.filter((p) => p.instrumentId !== id),
        sections: s.song.sections.map((sec) => ({
          ...sec,
          parts: sec.parts.filter((ref) => {
            const part = s.song.parts.find((p) => p.id === ref.partId)
            return part && part.instrumentId !== id
          }),
        })),
      },
      selectedInstrumentId:
        s.selectedInstrumentId === id ? null : s.selectedInstrumentId,
    }))
    void get().refreshIfPlaying()
  },
  removePart: (id) => {
    set((s) => ({
      song: {
        ...s.song,
        parts: s.song.parts.filter((p) => p.id !== id),
        sections: s.song.sections.map((sec) => ({
          ...sec,
          parts: sec.parts.filter((ref) => ref.partId !== id),
        })),
      },
      selectedPartId: s.selectedPartId === id ? null : s.selectedPartId,
    }))
    void get().refreshIfPlaying()
  },
  setSectionBars: (id, bars) => {
    set((s) => ({
      song: {
        ...s.song,
        sections: s.song.sections.map((sec) =>
          sec.id === id ? { ...sec, bars: Math.max(1, bars) } : sec,
        ),
      },
    }))
    void get().refreshIfPlaying()
  },
  setSectionName: (id, name) => {
    const trimmed = name.trim() || 'untitled'
    set((s) => ({
      song: {
        ...s.song,
        sections: s.song.sections.map((sec) =>
          sec.id === id ? { ...sec, name: trimmed } : sec,
        ),
      },
    }))
  },
  addSection: (name) => {
    const s = get()
    const template =
      s.song.sections.find((sec) => sec.id === s.selectedSectionId) ??
      s.song.sections[0]
    const progressionId =
      template?.progressionId ?? s.song.progressions[0]?.id ?? ''
    const partRefs = template
      ? template.parts.map((p) => ({ ...p }))
      : s.song.parts.slice(0, 3).map((p) => ({ partId: p.id }))

    const existingNames = new Set(s.song.sections.map((sec) => sec.name))
    let label = name?.trim() || 'verse'
    if (existingNames.has(label)) {
      let n = 2
      while (existingNames.has(`${label} ${n}`)) n += 1
      label = `${label} ${n}`
    }

    const section = {
      id: newId('sec'),
      name: label,
      bars: template?.bars ?? 8,
      progressionId,
      parts: partRefs,
    }

    set({
      song: {
        ...s.song,
        sections: [...s.song.sections, section],
        arrangement: [...s.song.arrangement, { sectionId: section.id }],
      },
      selectedSectionId: section.id,
      loopSectionId: section.id,
      playMode: 'loop',
    })
    void get().refreshIfPlaying()
  },
  removeSection: (id) => {
    const s = get()
    if (s.song.sections.length <= 1) return

    const sections = s.song.sections.filter((sec) => sec.id !== id)
    const arrangement = s.song.arrangement.filter((slot) => slot.sectionId !== id)
    const fallback = sections[0]?.id ?? null

    set({
      song: { ...s.song, sections, arrangement },
      selectedSectionId: s.selectedSectionId === id ? fallback : s.selectedSectionId,
      loopSectionId: s.loopSectionId === id ? fallback : s.loopSectionId,
    })
    void get().refreshIfPlaying()
  },
  addArrangementSlot: (sectionId) => {
    set((s) => ({
      song: {
        ...s.song,
        arrangement: [...s.song.arrangement, { sectionId }],
      },
    }))
    if (get().playMode === 'song' && (get().playing || isPlaying())) {
      void get().play()
    }
  },
  removeArrangementSlot: (index) => {
    set((s) => ({
      song: {
        ...s.song,
        arrangement: s.song.arrangement.filter((_, i) => i !== index),
      },
    }))
    if (get().playMode === 'song' && (get().playing || isPlaying())) {
      void get().play()
    }
  },
  toggleSectionPart: (sectionId, partId) => {
    set((s) => ({
      song: {
        ...s.song,
        sections: s.song.sections.map((sec) => {
          if (sec.id !== sectionId) return sec
          const has = sec.parts.some((r) => r.partId === partId)
          return {
            ...sec,
            parts: has
              ? sec.parts.filter((r) => r.partId !== partId)
              : [...sec.parts, { partId }],
          }
        }),
      },
    }))
    void get().refreshIfPlaying()
  },

  play: async () => {
    clearRefreshTimer()
    set({ error: null })
    try {
      const code = compileCurrent(get())
      // Hard restart from cycle 0 (intro / section start)
      await playCode(code)
      if (!isPlaying()) {
        set({ playing: false })
        return
      }
      set({ playing: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set({ error: message, playing: false })
    }
  },
  stop: () => {
    clearRefreshTimer()
    stopCode()
    set({ playing: false })
  },
  refreshIfPlaying: async () => {
    if (!get().playing && !isPlaying()) return
    clearRefreshTimer()
    const startedAt = getSession()
    debounceTimer = setTimeout(async () => {
      // Bail if user stopped (or restarted) while we were waiting
      if (getSession() !== startedAt) return
      if (!get().playing && !isPlaying()) return
      try {
        await reevaluateLive(get)
        if (getSession() !== startedAt) return
        set({ playing: true, error: null })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        set({ error: message })
      }
    }, 100)
  },
  compiledCode: () => compileCurrent(get()),
}))
