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

/** Bars of overlap / fade between arranged sections */
const SECTION_OVERLAP = 3

function applyMods(
  expr: string,
  mods: SectionMod[] | undefined,
  bars = 4,
): string {
  if (!mods?.length) return expr
  let out = expr
  const fadeSpan = Math.max(2, bars)
  for (const mod of mods) {
    switch (mod.type) {
      case 'fadeIn':
        out = `${out}.gain(saw.range(0.02, 1).slow(${fadeSpan}))`
        break
      case 'fadeOut':
        out = `${out}.gain(saw.range(1, 0.01).slow(${fadeSpan}))`
        break
      case 'gain':
        out = `${out}.gain(${mod.value.toFixed(2)})`
        break
      case 'halfTime':
        out = `${out}.slow(2)`
        break
      case 'filterSweep':
        out = `${out}.lpf(sine.range(${mod.from}, ${mod.to}).slow(${fadeSpan}))`
        break
    }
  }
  return out
}

function hasMod(
  mods: SectionMod[] | undefined,
  type: SectionMod['type'],
): boolean {
  return !!mods?.some((m) => m.type === type)
}

/**
 * Crossfade envelope spanning `duration` cycles.
 * fadeIn/fadeOut each last `overlap` cycles when enabled.
 */
function withCrossfadeGain(
  body: string,
  duration: number,
  overlap: number,
  fadeIn: boolean,
  fadeOut: boolean,
): string {
  if (!fadeIn && !fadeOut) return body

  const ov = Math.max(1, Math.min(overlap, Math.floor(duration / 2)))
  const inBars = fadeIn ? ov : 0
  const outBars = fadeOut ? ov : 0
  const mid = duration - inBars - outBars

  const parts: string[] = []
  if (inBars > 0) parts.push(`saw.range(0.02, 1).slow(${inBars})`)
  if (mid > 0) parts.push(`pure(1).slow(${mid})`)
  if (outBars > 0) parts.push(`saw.range(1, 0.02).slow(${outBars})`)

  if (!parts.length) return body
  if (parts.length === 1) return `${body}.gain(${parts[0]})`
  return `${body}.gain(cat(${parts.join(', ')}))`
}

function compilePart(
  part: Part,
  instrument: Instrument,
  harmony: HarmonyCtx,
  extraMods?: SectionMod[],
): string | null {
  if (!part.enabled) return null
  const pattern = generatePart(part.generator, harmony, part.params)
  const rendered =
    instrument.kind === 'texture'
      ? renderInstrument(instrument.kind, pattern, instrument.params, harmony.bpm)
      : renderInstrument(instrument.kind, pattern, instrument.params, harmony.bpm)
  return applyMods(rendered, extraMods)
}

function compileSectionBody(song: Song, section: Section): string {
  const progression =
    song.progressions.find((p) => p.id === section.progressionId) ??
    song.progressions[0]
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
  body = applyMods(body, section.mods, section.bars)
  return body
}

/** Loop a single section forever (jam mode). */
export function compileLoop(song: Song, sectionId?: string): string {
  const section =
    song.sections.find((s) => s.id === sectionId) ?? song.sections[0]
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
 * Full song with overlapping section crossfades (seqPLoop).
 * Neighboring sections share ~2 bars so cuts don't click.
 */
export function compileSong(song: Song, arrangement?: ArrangementSlot[]): string {
  const slots = arrangement ?? song.arrangement
  const cps = (song.globals.bpm / 60 / 4).toFixed(4)
  const swing = song.globals.swing

  if (!slots.length) {
    return compileLoop(song)
  }

  type Prepared = {
    bars: number
    body: string
    fadeInMod: boolean
    fadeOutMod: boolean
  }

  const prepared: Prepared[] = []
  for (const slot of slots) {
    const section = song.sections.find((s) => s.id === slot.sectionId)
    if (!section) continue
    const repeat = slot.repeat ?? 1
    const bars = section.bars * repeat
    let body = compileSectionBody(song, section)
    if (swing > 0.02) {
      body = `${body}.swing(${swing.toFixed(2)})`
    }
    prepared.push({
      bars,
      body,
      fadeInMod: hasMod(section.mods, 'fadeIn'),
      fadeOutMod: hasMod(section.mods, 'fadeOut'),
    })
  }

  if (!prepared.length) return compileLoop(song)

  const entries: string[] = []
  let t = 0
  for (let i = 0; i < prepared.length; i++) {
    const seg = prepared[i]
    const isFirst = i === 0
    const isLast = i === prepared.length - 1
    const overlap = Math.min(
      SECTION_OVERLAP,
      Math.max(1, Math.floor(seg.bars / 2)),
    )

    // Extend into the next section so the two stacks crossfade
    const start = t
    const stop = isLast ? t + seg.bars : t + seg.bars + overlap
    const duration = stop - start

    // Crossfade neighbors; skip an edge if the section already owns that fade mod
    const fadeIn = isFirst ? !seg.fadeInMod : true
    const fadeOut = isLast ? !seg.fadeOutMod : true

    const body = withCrossfadeGain(seg.body, duration, overlap, fadeIn, fadeOut)
    entries.push(`[${start}, ${stop}, ${body}]`)
    t += seg.bars
  }

  return [
    `// ${song.title} — full arrangement (crossfade)`,
    `setcps(${cps})`,
    `seqPLoop(\n  ${entries.join(',\n  ')}\n)`,
  ].join('\n')
}

export function getSectionOptions(song: Song) {
  return song.sections.map((s) => ({ id: s.id, name: s.name, bars: s.bars }))
}
