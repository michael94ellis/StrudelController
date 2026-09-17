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
import {
  CHORD_PRESETS,
  patternGroupsForKind,
  progressionToChordStyles,
  resolvePattern,
} from '../music/layerStyles'
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
import { preloadBeatFonts } from '../audio/preloadFonts'
import { downloadBlob, recordLoopAudio, sanitizeFilename, startLiveRecording, stopLiveRecordingAligned, cancelLiveRecording, isLiveRecording } from '../audio/exportLoop'
import { planExport, type ExportLength, trimToFullCycles } from '../music/loopDuration'

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
  toggleLayerPatternStyle: (layerId: string, groupId: string, styleId: string) => void
  toggleLayerChordDegree: (layerId: string, degreeId: string) => void
  setLayerChordLength: (layerId: string, length: 4 | 8 | 16) => void
  applyLayerChordPreset: (layerId: string, presetId: string) => void
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
  /**
   * Download a seamless loop: fixed cycle counts (1/2/4/8) or indefinite
   * (record until stopExport).
   */
  exportLoop: (length: ExportLength) => Promise<void>
  stopExport: () => Promise<void>
  cancelExport: () => void
  exporting: boolean
  /** Fixed-length take vs open-ended ∞ take (drives Stop & save UI). */
  exportMode: null | 'fixed' | 'live'
  exportLabel: string | null
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
    exporting: false,
    exportMode: null,
    exportLabel: null,

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
    toggleLayerPatternStyle: (layerId, groupId, styleId) =>
      patchLayer(layerId, (l) => {
        const groups = patternGroupsForKind(l.kind)
        const group = groups.find((g) => g.id === groupId)
        if (!group) return l
        const inGroup = new Set(group.options.map((o) => o.id))
        const current = l.patternStyleIds ?? []
        const rest = current.filter((id) => !inGroup.has(id))
        const exclusive = group.exclusive !== false
        const alreadyOn = current.includes(styleId)

        let patternStyleIds: string[]
        if (exclusive) {
          if (alreadyOn) {
            if (!group.allowOff) return l
            patternStyleIds = rest
          } else {
            patternStyleIds = [...rest, styleId]
          }
        } else {
          patternStyleIds = alreadyOn
            ? current.filter((id) => id !== styleId)
            : [...current, styleId]
        }

        const draft = { ...l, patternStyleIds }
        const { generator, params } = resolvePattern(draft)
        return { ...draft, generator, params }
      }),
    toggleLayerChordDegree: (layerId, degreeId) =>
      patchLayer(layerId, (l) => {
        const ids = l.chordStyleIds ?? progressionToChordStyles(l.progressionId).chordStyleIds
        const next = ids.includes(degreeId)
          ? ids.filter((id) => id !== degreeId)
          : [...ids, degreeId]
        const chordStyleIds = next.length ? next : ['deg:I']
        return { ...l, chordStyleIds }
      }),
    setLayerChordLength: (layerId, length) =>
      patchLayer(layerId, (l) => ({ ...l, chordLength: length })),
    applyLayerChordPreset: (layerId, presetId) =>
      patchLayer(layerId, (l) => {
        const preset = CHORD_PRESETS.find((p) => p.id === presetId)
        if (!preset) return l
        return {
          ...l,
          chordStyleIds: [...preset.degrees],
          chordLength: preset.length,
        }
      }),
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
        await preloadBeatFonts(beat)
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
          await preloadBeatFonts(beat)
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
          await preloadBeatFonts(beat)
          await updateCode(compileBeat(beat))
          if (getSession() !== startedAt) return
          set({ playing: true, error: null })
        } catch (err) {
          set({ error: err instanceof Error ? err.message : String(err) })
        }
      }, 280)
    },

    exportLoop: async (length) => {
      if (get().exporting) return
      clearRefreshTimer()
      const beat = get().beat
      const plan = planExport(beat, length)

      const prepare = async () => {
        await ensureStrudel()
        const drums = preferredDrumBank(beat)
        const loaded = await ensureDrumBank(drums)
        if (!loaded) await loadDrumKitsUntilReady()
        if (!getDrumPlayback()) {
          throw new Error('Drum samples did not load. Check your network, then try again.')
        }
        await preloadBeatFonts(beat)
        await playCode(compileBeat(beat), drums)
        set({ playing: isPlaying() })
      }

      if (length === 'indefinite') {
        set({
          exporting: true,
          exportMode: 'live',
          exportLabel: 'Recording… tap Stop & save when done',
          error: null,
        })
        try {
          await prepare()
          await startLiveRecording()
        } catch (err) {
          cancelLiveRecording()
          set({
            exporting: false,
            exportMode: null,
            exportLabel: null,
            error: err instanceof Error ? err.message : String(err),
          })
        }
        return
      }

      const sec = plan.seconds!
      const label = `Recording ${plan.loops}× (~${sec.toFixed(1)}s)…`
      set({ exporting: true, exportMode: 'fixed', exportLabel: label, error: null })
      try {
        await prepare()
        const { blob, extension, seconds } = await recordLoopAudio(sec)
        const base = sanitizeFilename(beat.name)
        const secTag = Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1)
        downloadBlob(blob, `${base}-${plan.loops}x-${secTag}s.${extension}`)
        set({ exportLabel: null })
      } catch (err) {
        cancelLiveRecording()
        const msg = err instanceof Error ? err.message : String(err)
        set({
          error: msg === 'Recording cancelled.' ? null : msg,
          exportLabel: null,
        })
      } finally {
        set({ exporting: false, exportMode: null })
      }
    },

    stopExport: async () => {
      if (!get().exporting || get().exportMode !== 'live' || !isLiveRecording()) return
      const beat = get().beat
      const plan = planExport(beat, 'indefinite')
      set({ exportLabel: 'Finishing loop…' })
      try {
        const { blob, extension, seconds } = await stopLiveRecordingAligned(plan.cycleSeconds)
        const seamless = trimToFullCycles(seconds, plan.cycleSeconds)
        const base = sanitizeFilename(beat.name)
        const secTag = Number.isInteger(seamless) ? String(seamless) : seamless.toFixed(1)
        const loops = Math.max(1, Math.round(seamless / plan.cycleSeconds))
        downloadBlob(blob, `${base}-${loops}x-${secTag}s.${extension}`)
        set({ exportLabel: null, exporting: false, exportMode: null })
      } catch (err) {
        cancelLiveRecording()
        const msg = err instanceof Error ? err.message : String(err)
        set({
          exporting: false,
          exportMode: null,
          exportLabel: null,
          error: msg === 'Recording cancelled.' ? null : msg,
        })
      }
    },

    cancelExport: () => {
      if (!get().exporting) return
      cancelLiveRecording()
      if (get().exportMode === 'live') {
        set({
          exporting: false,
          exportMode: null,
          exportLabel: null,
          error: null,
        })
      }
      // Fixed takes unwind via recordLoopAudio → exportLoop finally.
    },
  }
})
