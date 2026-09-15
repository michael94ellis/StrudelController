import { create } from 'zustand'
import type { PlayMode, Song } from '../music/types'
import { compileLoop, compileSong } from '../music/compile'
import {
  loadLibrary,
  saveLibrary,
  uniqueSongTitle,
} from '../music/songLibrary'
import {
  applyKnobsToSong,
  buildStyle,
  setSongSectionEnergy,
} from '../music/styles/build'
import type { SongKnobs } from '../music/styles/types'
import { DEFAULT_KNOBS } from '../music/styles/types'
import { getStyle } from '../music/styles/catalog'
import { isPlaying, playCode, stopCode, updateCode, getSession } from '../audio/strudelEngine'

type SectionEnergy = 'quiet' | 'groove' | 'full'

type SongState = {
  songs: Song[]
  song: Song
  /** Pre-knob snapshot for the active style (avoids compounding knob math) */
  styleBase: Song | null
  playMode: PlayMode
  loopSectionId: string | null
  playing: boolean
  error: string | null
  selectedSectionId: string | null

  selectSong: (id: string) => void
  addSong: () => void
  renameSong: (title: string) => void
  deleteSong: (id?: string) => void
  applyStyle: (styleId: string) => void
  setKnob: (key: keyof SongKnobs, value: number) => void
  setSectionEnergy: (sectionId: string, energy: SectionEnergy) => void
  setPlayMode: (mode: PlayMode) => void
  setLoopSection: (id: string) => void
  playSection: (id: string) => void
  reorderArrangement: (fromIndex: number, toIndex: number) => void
  setBpm: (bpm: number) => void
  setKey: (key: string) => void
  setScale: (scale: string) => void
  selectSection: (id: string | null) => void
  setSectionBars: (id: string, bars: number) => void
  setSectionName: (id: string, name: string) => void
  addSection: (name?: string) => void
  removeSection: (id: string) => void
  addArrangementSlot: (sectionId: string) => void
  removeArrangementSlot: (index: number) => void
  play: () => Promise<void>
  /** Hot-swap if already playing; otherwise start. Avoids hush clicks. */
  audition: () => Promise<void>
  stop: () => void
  refreshIfPlaying: () => Promise<void>
}

function selectionFor(song: Song) {
  return {
    loopSectionId:
      song.sections.find((s) => s.name.includes('verse'))?.id ??
      song.sections[0]?.id ??
      null,
    selectedSectionId: song.sections[0]?.id ?? null,
  }
}

function snapshotFromStyle(song: Song): Song | null {
  if (!song.styleId) return null
  const built = buildStyle(song.styleId, song.title)
  built.song.id = song.id
  built.song.title = song.title
  return built.song
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
  await updateCode(compileCurrent(get()))
}

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
  styleBase: snapshotFromStyle(initialSong),
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
      styleBase: snapshotFromStyle(next),
      error: null,
      ...selectionFor(next),
    })
    queuePersist(get)
    if (get().playing || isPlaying()) void get().play()
  },

  addSong: () => {
    const s = get()
    const styleId = s.song.styleId ?? 'house'
    const title = uniqueSongTitle('Untitled beat', s.songs)
    const built = buildStyle(styleId, title)
    const song = applyKnobsToSong(built.song, s.song.knobs ?? DEFAULT_KNOBS)
    clearRefreshTimer()
    set({
      songs: [...s.songs, song],
      song,
      styleBase: built.song,
      error: null,
      playMode: 'loop',
      ...selectionFor(song),
    })
    queuePersist(get)
  },

  renameSong: (title) => {
    const trimmed = title.trim() || 'Untitled beat'
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
      styleBase: switching ? snapshotFromStyle(next) : s.styleBase,
      error: null,
      ...(switching ? selectionFor(next) : {}),
    })
    queuePersist(get)
    if (switching && (get().playing || isPlaying())) void get().play()
  },

  applyStyle: (styleId) => {
    const s = get()
    const entry = getStyle(styleId)
    const title = s.song.title || entry?.label || 'Beat'
    const knobs = s.song.knobs ?? DEFAULT_KNOBS
    const built = buildStyle(styleId, title)
    built.song.id = s.song.id
    const song = applyKnobsToSong(built.song, knobs)
    clearRefreshTimer()
    set({
      song,
      styleBase: built.song,
      songs: s.songs.map((x) => (x.id === song.id ? song : x)),
      error: null,
      ...selectionFor(song),
    })
    queuePersist(get)
    if (get().playing || isPlaying()) void get().play()
    else void get().play()
  },

  setKnob: (key, value) => {
    const s = get()
    const knobs = { ...(s.song.knobs ?? DEFAULT_KNOBS), [key]: value }
    const base = s.styleBase ?? snapshotFromStyle(s.song)
    if (!base) {
      patchSong(set, get, (song) => ({
        ...song,
        knobs,
        globals:
          key === 'groove'
            ? { ...song.globals, swing: 0.05 + value * 0.2 }
            : song.globals,
      }))
      void get().refreshIfPlaying()
      return
    }
    const next = applyKnobsToSong(
      {
        ...base,
        id: s.song.id,
        title: s.song.title,
        sections: s.song.sections,
        arrangement: s.song.arrangement,
        styleLayers: s.song.styleLayers ?? base.styleLayers,
      },
      knobs,
    )
    // Re-apply current section part lists (energy) onto knob-adjusted song
    next.sections = s.song.sections.map((sec) => {
      const fresh = next.sections.find((x) => x.name === sec.name)
      return fresh
        ? { ...fresh, parts: sec.parts, bars: sec.bars, mods: sec.mods }
        : sec
    })
    set({
      song: next,
      songs: s.songs.map((x) => (x.id === next.id ? next : x)),
    })
    queuePersist(get)
    void get().refreshIfPlaying()
  },

  setSectionEnergy: (sectionId, energy) => {
    patchSong(set, get, (song) => setSongSectionEnergy(song, sectionId, energy))
    set({ loopSectionId: sectionId, playMode: 'loop', selectedSectionId: sectionId })
    // Hot-swap when already playing — hard restart (hush) is what made energy
    // / section changes feel choppy.
    void get().audition()
  },

  setPlayMode: (mode) => {
    set({ playMode: mode })
    // Mode change needs a clean restart so arrange() starts at bar 1
    if (get().playing || isPlaying()) void get().play()
  },
  setLoopSection: (id) => {
    set({ loopSectionId: id, playMode: 'loop', selectedSectionId: id })
    void get().audition()
  },
  playSection: (id) => {
    clearRefreshTimer()
    set({ loopSectionId: id, playMode: 'loop', selectedSectionId: id })
    void get().audition()
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

  selectSection: (id) => set({ selectedSectionId: id }),
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
    const existingNames = new Set(s.song.sections.map((sec) => sec.name))
    let label = name?.trim() || 'verse'
    if (existingNames.has(label)) {
      let n = 2
      while (existingNames.has(`${label} ${n}`)) n += 1
      label = `${label} ${n}`
    }
    const layers = s.song.styleLayers
    const energyParts =
      layers?.groove?.map((partId) => ({ partId })) ??
      template?.parts.map((p) => ({ ...p })) ??
      []
    const section = {
      id: `sec-${Date.now()}`,
      name: label,
      bars: template?.bars ?? 8,
      progressionId:
        template?.progressionId ?? s.song.progressions[0]?.id ?? '',
      parts: energyParts,
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
        selectedSectionId:
          s.selectedSectionId === id ? fallback : s.selectedSectionId,
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

  play: async () => {
    clearRefreshTimer()
    set({ error: null })
    try {
      await playCode(compileCurrent(get()))
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
  audition: async () => {
    clearRefreshTimer()
    if (get().playing || isPlaying()) {
      set({ error: null })
      try {
        await updateCode(compileCurrent(get()))
        set({ playing: true, error: null })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        set({ error: message })
      }
      return
    }
    await get().play()
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
}))
