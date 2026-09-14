import type {
  ArrangementSlot,
  HarmonyCtx,
  Instrument,
  Part,
  Section,
  SectionMod,
  Song,
} from './types'
import { resolveHarmony } from './theory'
import { renderInstrument } from './instruments/registry'
import { generatePart } from './generators/registry'

function applyMods(expr: string, mods: SectionMod[] | undefined): string {
  if (!mods?.length) return expr
  let out = expr
  for (const mod of mods) {
    switch (mod.type) {
      case 'fadeIn':
        out = `${out}.gain(sine.range(0.15, 1).slow(4))`
        break
      case 'fadeOut':
        out = `${out}.gain(sine.range(1, 0.1).slow(4))`
        break
      case 'gain':
        out = `${out}.gain(${mod.value.toFixed(2)})`
        break
      case 'halfTime':
        out = `${out}.slow(2)`
        break
      case 'filterSweep':
        out = `${out}.lpf(sine.range(${mod.from}, ${mod.to}).slow(8))`
        break
    }
  }
  return out
}

function compilePart(
  part: Part,
  instrument: Instrument,
  harmony: HarmonyCtx,
  extraMods?: SectionMod[],
): string | null {
  if (!part.enabled) return null
  const pattern = generatePart(part.generator, harmony, part.params)
  // Texture instrument ignores pattern and uses its own sound
  const rendered =
    instrument.kind === 'texture'
      ? renderInstrument(instrument.kind, pattern, instrument.params, harmony.bpm)
      : renderInstrument(instrument.kind, pattern, instrument.params, harmony.bpm)
  return applyMods(rendered, extraMods)
}

function compileSectionBody(song: Song, section: Section): string {
  const progression =
    song.progressions.find((p) => p.id === section.progressionId) ?? song.progressions[0]
  const harmony = resolveHarmony(song.globals, progression)

  const parts: string[] = []
  for (const ref of section.parts) {
    const part = song.parts.find((p) => p.id === ref.partId)
    if (!part) continue
    const instrument = song.instruments.find((i) => i.id === part.instrumentId)
    if (!instrument) continue
    const compiled = compilePart(part, instrument, harmony, ref.mods)
    if (compiled) parts.push(compiled)
  }

  if (!parts.length) return `silence`

  let body = parts.length === 1 ? parts[0] : `stack(\n  ${parts.join(',\n  ')}\n)`
  body = applyMods(body, section.mods)
  return body
}

/** Loop a single section forever (jam mode). */
export function compileLoop(song: Song, sectionId?: string): string {
  const section =
    song.sections.find((s) => s.id === sectionId) ??
    song.sections[0]
  if (!section) {
    return `setcps(${(song.globals.bpm / 60 / 4).toFixed(4)})\nsilence`
  }

  const cps = (song.globals.bpm / 60 / 4).toFixed(4)
  const swing = song.globals.swing
  let body = compileSectionBody(song, section)
  if (swing > 0.02) {
    body = `${body}.swing(${swing.toFixed(2)})`
  }

  return [
    `// ${song.title} — loop: ${section.name}`,
    `setcps(${cps})`,
    body,
  ].join('\n')
}

/**
 * Full song via arrange([[bars, pattern], ...]).
 * Each section's pattern is one cycle = one bar of harmonic rhythm
 * (progression chords span one cycle), so we treat `bars` as cycles.
 */
export function compileSong(song: Song, arrangement?: ArrangementSlot[]): string {
  const slots = arrangement ?? song.arrangement
  const cps = (song.globals.bpm / 60 / 4).toFixed(4)
  const swing = song.globals.swing

  if (!slots.length) {
    return compileLoop(song)
  }

  const entries: string[] = []
  for (const slot of slots) {
    const section = song.sections.find((s) => s.id === slot.sectionId)
    if (!section) continue
    const repeat = slot.repeat ?? 1
    const totalBars = section.bars * repeat
    let body = compileSectionBody(song, section)
    if (swing > 0.02) {
      body = `${body}.swing(${swing.toFixed(2)})`
    }
    // arrange expects [cycles, pattern]; one harmonic cycle ≈ bars of progression length
    // Use section.bars as cycles so a 4-bar section plays 4 cycles of the 4-chord progression
    // (1 chord per cycle). When repeating, multiply.
    entries.push(`[${totalBars}, ${body}]`)
  }

  if (!entries.length) return compileLoop(song)

  return [
    `// ${song.title} — full arrangement`,
    `setcps(${cps})`,
    `arrange(\n  ${entries.join(',\n  ')}\n)`,
  ].join('\n')
}

export function getSectionOptions(song: Song) {
  return song.sections.map((s) => ({ id: s.id, name: s.name, bars: s.bars }))
}
