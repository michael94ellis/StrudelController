import type { Beat, BeatLayer } from './types'
import { resolveProgression, resolvePattern } from './layerStyles'
import { resolveHarmony } from './theory'
import { renderInstrument } from './instruments/registry'
import { generatePart } from './generators/registry'
import { getGenre } from './genres'

const DEFAULT_SWING = { base: 0.05, range: 0.2 }

/** Fixed pocket from genre (no global groove control). */
export function swingFor(beat: Beat): number {
  const model = getGenre(beat.genreId)?.swing ?? DEFAULT_SWING
  return model.base + model.range * 0.35
}

function applySwing(part: string, swing: number): string {
  if (swing <= 0.02) return part
  return `${part}.swing(${swing.toFixed(2)})`
}

function compileLayer(layer: BeatLayer, beat: Beat, swing: number): string | null {
  if (!layer.enabled) return null
  const harmony = resolveHarmony(beat, resolveProgression(layer), swing)
  const { generator, params } = resolvePattern(layer)
  const pattern = generatePart(generator, harmony, params)
  let compiled = renderInstrument(layer.kind, pattern, layer.instrumentParams, beat.bpm)
  // Keep stab grids straight — swing on offbeat chops reads as a stutter.
  const straightGrid =
    layer.kind === 'drumkit' || generator === 'houseStabs' || generator === 'chordStabs'
  if (!straightGrid) {
    compiled = applySwing(compiled, swing)
  }
  return compiled
}

/** One beat = one looping Strudel pattern. */
export function compileBeat(beat: Beat): string {
  const cps = (beat.bpm / 60 / 4).toFixed(4)
  const swing = swingFor(beat)

  const parts: string[] = []
  for (const layer of beat.layers) {
    const compiled = compileLayer(layer, beat, swing)
    if (compiled) parts.push(compiled)
  }

  const body =
    parts.length === 0
      ? 'silence'
      : parts.length === 1
        ? parts[0]
        : `stack(\n  ${parts.join(',\n  ')}\n)`

  return [`// ${beat.name}`, `setcps(${cps})`, body].join('\n')
}
