import { create } from 'zustand'
import type { GlobalCtx, LayerInstance, LayerParams, LayerType, ParamValue, VibeId } from '../layers/types'
import { applyVibe, createLayer, defaultLayers, vibePresets } from '../ui/presets'
import { compileBeat } from '../audio/compileBeat'
import { isPlaying, playCode, stopCode } from '../audio/strudelEngine'

type BeatState = {
  globals: GlobalCtx
  layers: LayerInstance[]
  playing: boolean
  error: string | null
  setBpm: (bpm: number) => void
  setKey: (key: string) => void
  setScale: (scale: string) => void
  setSwing: (swing: number) => void
  setVibe: (vibe: VibeId) => void
  toggleLayer: (id: string) => void
  removeLayer: (id: string) => void
  addLayer: (type: LayerType) => void
  duplicateLayer: (id: string) => void
  setLayerParam: (id: string, key: string, value: ParamValue) => void
  setLayerName: (id: string, name: string) => void
  play: () => Promise<void>
  stop: () => void
  refreshIfPlaying: () => Promise<void>
}

const initial = applyVibe(vibePresets[0])

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function reevaluate(get: () => BeatState) {
  const { globals, layers } = get()
  const code = compileBeat(globals, layers)
  try {
    await playCode(code)
    get().playing // noop read
  } catch (err) {
    console.error(err)
    throw err
  }
}

export const useBeatStore = create<BeatState>((set, get) => ({
  globals: initial.globals,
  layers: initial.layers.length ? initial.layers : defaultLayers(),
  playing: false,
  error: null,

  setBpm: (bpm) => {
    set((s) => ({ globals: { ...s.globals, bpm } }))
    void get().refreshIfPlaying()
  },
  setKey: (key) => {
    set((s) => ({ globals: { ...s.globals, key } }))
    void get().refreshIfPlaying()
  },
  setScale: (scale) => {
    set((s) => ({ globals: { ...s.globals, scale } }))
    void get().refreshIfPlaying()
  },
  setSwing: (swing) => {
    set((s) => ({ globals: { ...s.globals, swing } }))
    void get().refreshIfPlaying()
  },
  setVibe: (vibe) => {
    const preset = vibePresets.find((p) => p.id === vibe) ?? vibePresets[0]
    const next = applyVibe(preset)
    set({ globals: next.globals, layers: next.layers, error: null })
    void get().refreshIfPlaying()
  },
  toggleLayer: (id) => {
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)),
    }))
    void get().refreshIfPlaying()
  },
  removeLayer: (id) => {
    set((s) => ({ layers: s.layers.filter((l) => l.id !== id) }))
    void get().refreshIfPlaying()
  },
  addLayer: (type) => {
    set((s) => ({ layers: [...s.layers, createLayer(type)] }))
    void get().refreshIfPlaying()
  },
  duplicateLayer: (id) => {
    set((s) => {
      const src = s.layers.find((l) => l.id === id)
      if (!src) return s
      const copy: LayerInstance = {
        ...createLayer(src.type, `${src.name} copy`, { ...src.params } as LayerParams),
        enabled: src.enabled,
      }
      const idx = s.layers.findIndex((l) => l.id === id)
      const layers = [...s.layers]
      layers.splice(idx + 1, 0, copy)
      return { layers }
    })
    void get().refreshIfPlaying()
  },
  setLayerParam: (id, key, value) => {
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === id ? { ...l, params: { ...l.params, [key]: value } } : l,
      ),
    }))
    void get().refreshIfPlaying()
  },
  setLayerName: (id, name) => {
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, name } : l)),
    }))
  },
  play: async () => {
    set({ error: null })
    try {
      const code = compileBeat(get().globals, get().layers)
      await playCode(code)
      set({ playing: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set({ error: message, playing: false })
    }
  },
  stop: () => {
    stopCode()
    set({ playing: false })
  },
  refreshIfPlaying: async () => {
    if (!get().playing && !isPlaying()) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      try {
        await reevaluate(get)
        set({ playing: true, error: null })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        set({ error: message })
      }
    }, 100)
  },
}))
