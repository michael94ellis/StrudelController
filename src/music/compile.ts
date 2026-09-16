import type { Beat, BeatKnobs, BeatLayer, ParamMap } from './types'
import { getProgression, resolveHarmony } from './theory'
import { renderInstrument } from './instruments/registry'
import { generatePart } from './generators/registry'
import { getGenre } from './genres'

const DEFAULT_SWING = { base: 0.05, range: 0.2 }

export function swingFor(beat: Beat): number {
  const model = getGenre(beat.genreId)?.swing ?? DEFAULT_SWING
  return model.base + beat.knobs.groove * model.range
}

/**
 * Knobs shape params at compile time rather than mutating the beat, so
 * dragging a slider back and forth always lands on the same sound.
 */
function scaleInstrumentParams(params: ParamMap, knobs: BeatKnobs): ParamMap {
  const out = { ...params }
  if (typeof out.gain === 'number') {
    out.gain = Math.min(1, Math.max(0.05, out.gain * (0.55 + knobs.energy * 0.9)))
  }
  if (typeof out.cutoff === 'number') {
    out.cutoff = Math.round(out.cutoff * (0.55 + knobs.brightness * 0.9))
  }
  return out
}

function scaleGeneratorParams(params: ParamMap, knobs: BeatKnobs): ParamMap {
  const out = { ...params }
  if (typeof out.density === 'number') {
    out.density = Math.min(1, Math.max(0.15, out.density * (0.5 + knobs.density * 0.9)))
  }
  if (typeof out.energy === 'number') {
    out.energy = Math.min(1, Math.max(0.2, out.energy * (0.45 + knobs.density * 0.9)))
  }
  return out
}

function compileLayer(layer: BeatLayer, beat: Beat, swing: number): string | null {
  if (!layer.enabled) return null
  const harmony = resolveHarmony(beat, getProgression(beat.progressionId), swing)
  const pattern = generatePart(
    layer.generator,
    harmony,
    scaleGeneratorParams(layer.params, beat.knobs),
  )
  return renderInstrument(
    layer.kind,
    pattern,
    scaleInstrumentParams(layer.instrumentParams, beat.knobs),
    beat.bpm,
  )
}

/** One beat = one looping Strudel pattern. */
export function compileBeat(beat: Beat): string {
  const cps = (beat.bpm / 60 / 4).toFixed(4)
  const swing = swingFor(beat)

  const voices: string[] = []
  for (const layer of beat.layers) {
    const compiled = compileLayer(layer, beat, swing)
    if (compiled) voices.push(compiled)
  }

  let body = voices.length
    ? voices.length === 1
      ? voices[0]
      : `stack(\n  ${voices.join(',\n  ')}\n)`
    : 'silence'

  if (voices.length && swing > 0.02) {
    body = `${body}.swing(${swing.toFixed(2)})`
  }

  return [`// ${beat.name}`, `setcps(${cps})`, body].join('\n')
}
