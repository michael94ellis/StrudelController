import { create } from 'zustand'
import type { Beat, BeatLayer, GeneratorName, InstrumentKind, ParamValue } from '../music/types'
import { newId } from '../music/types'
import { compileBeat } from '../music/compile'
import { loadLibrary, saveLibrary, uniqueBeatName } from '../music/library'
import {
  applyGenre,
  createBeat,
  duplicateLayer as copyLayer,
  withGenerator,
  withKind,
} from '../music/beats/build'
import { applySampleToLayer, createLayerFromSample } from '../music/sampleLayers'
import { preferredDrumBank } from '../music/drums'
import {
  ensureDrumBank,
  ensureStrudel,
  getDrumPlayback,
  getSession,
  isPlaying,
  loadDrumKitsUntilReady,
  playCode,
  stopCode,
  updateCode,
} from '../audio/strudelEngine'

type BeatState = {
  beats: Beat[]
  beat: Beat
  playing: boolean
  error: string | null

  selectBeat: (id: string) => void
  addBeat: () => void
  duplicateBeat: (id?: string) => void
  renameBeat: (name: string) => void
  deleteBeat: (id?: string) => void

  setGenre: (genreId: string) => void
  setBpm: (bpm: number) => void
  setKey: (key: string) => void
  setScale: (scale: string) => void
  setLayerProgression: (layerId: string, progressionId: string) => void
  /** New bar fills / phrase shapes without changing genre or harmony. */
  shuffleVariation: () => void

  addLayerFromSample: (sampleId: string) => void
  setLayerSample: (id: string, sampleId: string) => void
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  toggleLayer: (id: string) => void
  renameLayer: (id: string, name: string) => void
  setLayerKind: (id: string, kind: InstrumentKind) => void
  setLayerGenerator: (id: string, generator: GeneratorName) => void
  setLayerParam: (id: string, key: string, value: ParamValue) => void
  setInstrumentParam: (id: string, key: string, value: ParamValue) => void

  play: () => Promise<void>
  stop: () => void
  /** Hot-swap when already playing; otherwise start. Avoids hush clicks. */
  audition: () => Promise<void>
  refreshIfPlaying: () => Promise<void>
}

const loaded = loadLibrary()
const initialBeat = loaded.beats.find((b) => b.id === loaded.activeBeatId) ?? loaded.beats[0]

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let persistTimer: ReturnType<typeof setTimeout> | null = null

function clearRefreshTimer() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

function queuePersist(get: () => BeatState) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    const { beats, beat } = get()
    saveLibrary(beats, beat.id)
  }, 150)
}

export const useBeatStore = create<BeatState>((set, get) => {
  /** Apply a change to the active beat, keep the library in sync, then re-audition. */
  function patch(recipe: (beat: Beat) => Beat, refresh = true) {
    set((s) => {
      const beat = recipe(s.beat)
      return { beat, beats: s.beats.map((b) => (b.id === beat.id ? beat : b)) }
    })
    queuePersist(get)
    if (refresh) void get().refreshIfPlaying()
  }

  function patchLayer(id: string, recipe: (layer: BeatLayer) => BeatLayer, refresh = true) {
    patch(
      (beat) => ({
        ...beat,
        layers: beat.layers.map((l) => (l.id === id ? recipe(l) : l)),
      }),
      refresh,
    )
  }

  /** Switch the active beat — a hard restart so the new loop starts at bar 1. */
  function activate(beat: Beat, beats: Beat[]) {
    clearRefreshTimer()
    set({ beat, beats, error: null })
    queuePersist(get)
    if (get().playing || isPlaying()) void get().play()
  }

  return {
    beats: loaded.beats,
    beat: initialBeat,
    playing: false,
    error: null,

    selectBeat: (id) => {
      const s = get()
      const next = s.beats.find((b) => b.id === id)
      if (!next || next.id === s.beat.id) return
      activate(next, s.beats)
    },

    addBeat: () => {
      const s = get()
      const beat = createBeat(s.beat.genreId, uniqueBeatName('Untitled beat', s.beats))
      activate(beat, [...s.beats, beat])
    },

    duplicateBeat: (id) => {
      const s = get()
      const source = s.beats.find((b) => b.id === (id ?? s.beat.id))
      if (!source) return
      const beat: Beat = {
        ...source,
        id: newId('beat'),
        name: uniqueBeatName(`${source.name} copy`, s.beats),
        variation: source.variation,
        layers: source.layers.map((l) => ({
          ...copyLayer(l),
          name: l.name,
          progressionId: l.progressionId,
        })),
      }
      activate(beat, [...s.beats, beat])
    },

    renameBeat: (name) => {
      patch((beat) => ({ ...beat, name: name.trim() || 'Untitled beat' }), false)
    },

    deleteBeat: (id) => {
      const s = get()
      const targetId = id ?? s.beat.id
      if (s.beats.length <= 1) return
      const beats = s.beats.filter((b) => b.id !== targetId)
      if (s.beat.id !== targetId) {
        set({ beats })
        queuePersist(get)
        return
      }
      activate(beats[0], beats)
    },

    setGenre: (genreId) => {
      const s = get()
      if (s.beat.genreId === genreId) return
      const beat = applyGenre(s.beat, genreId)
      // New tempo and layer stack — restart rather than hot-swap
      activate(beat, s.beats.map((b) => (b.id === beat.id ? beat : b)))
    },

    setBpm: (bpm) => patch((beat) => ({ ...beat, bpm })),
    setKey: (key) => patch((beat) => ({ ...beat, key })),
    setScale: (scale) => patch((beat) => ({ ...beat, scale })),
    setLayerProgression: (layerId, progressionId) =>
      patchLayer(layerId, (l) => ({ ...l, progressionId })),
    shuffleVariation: () => patch((beat) => ({ ...beat, variation: beat.variation + 1 })),

    addLayerFromSample: (sampleId) => {
      const layer = createLayerFromSample(sampleId)
      patch((beat) => ({ ...beat, layers: [...beat.layers, layer] }))
    },
    setLayerSample: (id, sampleId) =>
      patchLayer(id, (layer) => applySampleToLayer(layer, sampleId)),
    removeLayer: (id) =>
      patch((beat) => ({ ...beat, layers: beat.layers.filter((l) => l.id !== id) })),
    duplicateLayer: (id) =>
      patch((beat) => {
        const index = beat.layers.findIndex((l) => l.id === id)
        if (index < 0) return beat
        const layers = [...beat.layers]
        layers.splice(index + 1, 0, copyLayer(beat.layers[index]))
        return { ...beat, layers }
      }),
    toggleLayer: (id) => patchLayer(id, (l) => ({ ...l, enabled: !l.enabled })),
    renameLayer: (id, name) =>
      patchLayer(id, (l) => ({ ...l, name: name.trim() || 'Layer' }), false),
    setLayerKind: (id, kind) => patchLayer(id, (l) => withKind(l, kind)),
    setLayerGenerator: (id, generator) => patchLayer(id, (l) => withGenerator(l, generator)),
    setLayerParam: (id, key, value) =>
      patchLayer(id, (l) => ({ ...l, params: { ...l.params, [key]: value } })),
    setInstrumentParam: (id, key, value) =>
      patchLayer(id, (l) => ({
        ...l,
        instrumentParams: { ...l.instrumentParams, [key]: value },
      })),

    play: async () => {
      clearRefreshTimer()
      set({ error: null })
      try {
        // Load samples before compiling: the drum renderer picks bank vs
        // alias naming from whichever kit actually registered.
        await ensureStrudel()
        const beat = get().beat
        const drums = preferredDrumBank(beat)
        const loaded = await ensureDrumBank(drums)
        if (!loaded) {
          await loadDrumKitsUntilReady()
        }
        if (!getDrumPlayback()) {
          throw new Error(
            'Drum samples did not load. Check your network, then press Play again.',
          )
        }
        await playCode(compileBeat(beat), drums)
        set({ playing: isPlaying() })
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err), playing: false })
      }
    },

    stop: () => {
      clearRefreshTimer()
      stopCode()
      set({ playing: false })
    },

    audition: async () => {
      clearRefreshTimer()
      if (get().playing || isPlaying()) {
        try {
          const beat = get().beat
          await ensureDrumBank(preferredDrumBank(beat))
          await updateCode(compileBeat(beat))
          set({ playing: true, error: null })
        } catch (err) {
          set({ error: err instanceof Error ? err.message : String(err) })
        }
        return
      }
      await get().play()
    },

    refreshIfPlaying: async () => {
      if (!get().playing && !isPlaying()) return
      clearRefreshTimer()
      const startedAt = getSession()
      debounceTimer = setTimeout(async () => {
        if (getSession() !== startedAt) return
        if (!get().playing && !isPlaying()) return
        try {
          const beat = get().beat
          await ensureDrumBank(preferredDrumBank(beat))
          await updateCode(compileBeat(beat))
          if (getSession() !== startedAt) return
          set({ playing: true, error: null })
        } catch (err) {
          set({ error: err instanceof Error ? err.message : String(err) })
        }
      }, 280)
    },
  }
})
