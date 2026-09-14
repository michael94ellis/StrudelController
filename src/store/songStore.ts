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
import { cloneSong } from '../music/presets'
import {
  loadLibrary,
  saveLibrary,
  uniqueSongTitle,
} from '../music/songLibrary'
import { instrumentDefs } from '../music/instruments/registry'
import { generatorDefs } from '../music/generators/registry'
import { isPlaying, playCode, stopCode, updateCode, getSession } from '../audio/strudelEngine'

type SongState = {
  songs: Song[]
  song: Song
  playMode: PlayMode
  loopSectionId: string | null
  playing: boolean
  error: string | null
  selectedInstrumentId: string | null
  selectedPartId: string | null
  selectedSectionId: string | null

  selectSong: (id: string) => void
  addSong: () => void
  renameSong: (title: string) => void
  deleteSong: (id?: string) => void
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

function selectionFor(song: Song) {
  return {
    loopSectionId: song.sections.find((s) => s.name.includes('verse'))?.id ?? song.sections[0]?.id ?? null,
    selectedInstrumentId: song.instruments[0]?.id ?? null,
    selectedPartId: song.parts[0]?.id ?? null,
    selectedSectionId: song.sections[0]?.id ?? null,
  }
}

const loaded = loadLibrary()
const initialSong =
  loaded.songs.find((s) => s.id === loaded.activeSongId) ?? loaded.songs[0]

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let persistTimer: ReturnType<typeof setTimeout> | null = null

function clearRefreshTimer() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

function queuePersist(get: () => SongState) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    const { songs, song } = get()
    saveLibrary(songs, song.id)
  }, 150)
}

function compileCurrent(s: SongState): string {
  if (s.playMode === 'song') return compileSong(s.song)
  return compileLoop(s.song, s.loopSectionId ?? s.song.sections[0]?.id)
}

async function reevaluateLive(get: () => SongState) {
  const code = compileCurrent(get())
  await updateCode(code)
}

/** Update the active song and mirror it into the library list, then persist. */
function patchSong(
  set: (partial: Partial<SongState> | ((s: SongState) => Partial<SongState>)) => void,
  get: () => SongState,
  recipe: (song: Song) => Song,
  extra?: Partial<SongState>,
) {
  set((s) => {
    const song = recipe(s.song)
    const songs = s.songs.map((x) => (x.id === song.id ? song : x))
    return { song, songs, ...extra }
  })
  queuePersist(get)
}

export const useSongStore = create<SongState>((set, get) => ({
  songs: loaded.songs,
  song: initialSong,
  playMode: 'loop',
  playing: false,
  error: null,
  ...selectionFor(initialSong),

  selectSong: (id) => {
    const next = get().songs.find((s) => s.id === id)
    if (!next || next.id === get().song.id) return
    clearRefreshTimer()
    set({
      song: next,
      error: null,
      ...selectionFor(next),
    })
    queuePersist(get)
    if (get().playing || isPlaying()) {
      void get().play()
    }
  },

  addSong: () => {
    const s = get()
    const base = cloneSong(s.song)
    const title = uniqueSongTitle('Untitled song', s.songs)
    const next: Song = {
      ...base,
      id: newId('song'),
      title,
    }
    // Fresh ids so edits don't collide with the template song's internal refs
    // cloneSong already deep-clones; regenerating top-level song id is enough
    // since instruments/parts/sections keep their own ids within this song.
    clearRefreshTimer()
    set({
      songs: [...s.songs, next],
      song: next,
      error: null,
      playMode: 'loop',
      ...selectionFor(next),
    })
    queuePersist(get)
  },

  renameSong: (title) => {
    const trimmed = title.trim() || 'Untitled song'
    patchSong(set, get, (song) => ({ ...song, title: trimmed }))
  },

  deleteSong: (id) => {
    const s = get()
    const targetId = id ?? s.song.id
    if (s.songs.length <= 1) return
    const songs = s.songs.filter((song) => song.id !== targetId)
    const switching = s.song.id === targetId
    const next = switching ? songs[0] : s.song
    clearRefreshTimer()
    set({
      songs,
      song: next,
      error: null,
      ...(switching ? selectionFor(next) : {}),
    })
    queuePersist(get)
    if (switching && (get().playing || isPlaying())) {
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
    patchSong(set, get, (song) => {
      const arrangement = [...song.arrangement]
      const [moved] = arrangement.splice(fromIndex, 1)
      if (!moved) return song
      arrangement.splice(toIndex, 0, moved)
      return { ...song, arrangement }
    })
    if (get().playMode === 'song' && (get().playing || isPlaying())) {
      void get().play()
    }
  },
  setBpm: (bpm) => {
    patchSong(set, get, (song) => ({
      ...song,
      globals: { ...song.globals, bpm },
    }))
    void get().refreshIfPlaying()
  },
  setKey: (key) => {
    patchSong(set, get, (song) => ({
      ...song,
      globals: { ...song.globals, key },
    }))
    void get().refreshIfPlaying()
  },
  setScale: (scale) => {
    patchSong(set, get, (song) => ({
      ...song,
      globals: { ...song.globals, scale },
    }))
    void get().refreshIfPlaying()
  },
  setSwing: (swing) => {
    patchSong(set, get, (song) => ({
      ...song,
      globals: { ...song.globals, swing },
    }))
    void get().refreshIfPlaying()
  },

  selectInstrument: (id) => set({ selectedInstrumentId: id }),
  selectPart: (id) => set({ selectedPartId: id }),
  selectSection: (id) => set({ selectedSectionId: id }),

  setInstrumentParam: (id, key, value) => {
    patchSong(set, get, (song) => ({
      ...song,
      instruments: song.instruments.map((i) =>
        i.id === id ? { ...i, params: { ...i.params, [key]: value } } : i,
      ),
    }))
    void get().refreshIfPlaying()
  },
  setPartParam: (id, key, value) => {
    patchSong(set, get, (song) => ({
      ...song,
      parts: song.parts.map((p) =>
        p.id === id ? { ...p, params: { ...p.params, [key]: value } } : p,
      ),
    }))
    void get().refreshIfPlaying()
  },
  togglePart: (id) => {
    patchSong(set, get, (song) => ({
      ...song,
      parts: song.parts.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
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
    patchSong(
      set,
      get,
      (song) => ({ ...song, instruments: [...song.instruments, instrument] }),
      { selectedInstrumentId: instrument.id },
    )
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
    patchSong(
      set,
      get,
      (song) => ({ ...song, parts: [...song.parts, p] }),
      { selectedPartId: p.id },
    )
    void get().refreshIfPlaying()
  },
  removeInstrument: (id) => {
    patchSong(
      set,
      get,
      (song) => ({
        ...song,
        instruments: song.instruments.filter((i) => i.id !== id),
        parts: song.parts.filter((p) => p.instrumentId !== id),
        sections: song.sections.map((sec) => ({
          ...sec,
          parts: sec.parts.filter((ref) => {
            const part = song.parts.find((p) => p.id === ref.partId)
            return part && part.instrumentId !== id
          }),
        })),
      }),
      {
        selectedInstrumentId:
          get().selectedInstrumentId === id ? null : get().selectedInstrumentId,
      },
    )
    void get().refreshIfPlaying()
  },
  removePart: (id) => {
    patchSong(
      set,
      get,
      (song) => ({
        ...song,
        parts: song.parts.filter((p) => p.id !== id),
        sections: song.sections.map((sec) => ({
          ...sec,
          parts: sec.parts.filter((ref) => ref.partId !== id),
        })),
      }),
      {
        selectedPartId: get().selectedPartId === id ? null : get().selectedPartId,
      },
    )
    void get().refreshIfPlaying()
  },
  setSectionBars: (id, bars) => {
    patchSong(set, get, (song) => ({
      ...song,
      sections: song.sections.map((sec) =>
        sec.id === id ? { ...sec, bars: Math.max(1, bars) } : sec,
      ),
    }))
    void get().refreshIfPlaying()
  },
  setSectionName: (id, name) => {
    const trimmed = name.trim() || 'untitled'
    patchSong(set, get, (song) => ({
      ...song,
      sections: song.sections.map((sec) =>
        sec.id === id ? { ...sec, name: trimmed } : sec,
      ),
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

    patchSong(
      set,
      get,
      (song) => ({
        ...song,
        sections: [...song.sections, section],
        arrangement: [...song.arrangement, { sectionId: section.id }],
      }),
      {
        selectedSectionId: section.id,
        loopSectionId: section.id,
        playMode: 'loop',
      },
    )
    void get().refreshIfPlaying()
  },
  removeSection: (id) => {
    const s = get()
    if (s.song.sections.length <= 1) return

    const sections = s.song.sections.filter((sec) => sec.id !== id)
    const arrangement = s.song.arrangement.filter((slot) => slot.sectionId !== id)
    const fallback = sections[0]?.id ?? null

    patchSong(
      set,
      get,
      (song) => ({ ...song, sections, arrangement }),
      {
        selectedSectionId: s.selectedSectionId === id ? fallback : s.selectedSectionId,
        loopSectionId: s.loopSectionId === id ? fallback : s.loopSectionId,
      },
    )
    void get().refreshIfPlaying()
  },
  addArrangementSlot: (sectionId) => {
    patchSong(set, get, (song) => ({
      ...song,
      arrangement: [...song.arrangement, { sectionId }],
    }))
    if (get().playMode === 'song' && (get().playing || isPlaying())) {
      void get().play()
    }
  },
  removeArrangementSlot: (index) => {
    patchSong(set, get, (song) => ({
      ...song,
      arrangement: song.arrangement.filter((_, i) => i !== index),
    }))
    if (get().playMode === 'song' && (get().playing || isPlaying())) {
      void get().play()
    }
  },
  toggleSectionPart: (sectionId, partId) => {
    patchSong(set, get, (song) => ({
      ...song,
      sections: song.sections.map((sec) => {
        if (sec.id !== sectionId) return sec
        const has = sec.parts.some((r) => r.partId === partId)
        return {
          ...sec,
          parts: has
            ? sec.parts.filter((r) => r.partId !== partId)
            : [...sec.parts, { partId }],
        }
      }),
    }))
    void get().refreshIfPlaying()
  },

  play: async () => {
    clearRefreshTimer()
    set({ error: null })
    try {
      const code = compileCurrent(get())
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
