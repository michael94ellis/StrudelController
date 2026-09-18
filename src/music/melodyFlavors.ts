import type { GeneratorName, HarmonyCtx } from './types'
import { notePerBar, notePerBarStruct } from './pattern'
import { pickBar } from './variation'

export type MelodyFlavorSection = 'riff' | 'rhythm' | 'height'

export type MelodyFlavor = {
  id: string
  section: MelodyFlavorSection
  label: string
}

export const MELODY_FLAVOR_SECTIONS: Array<{
  id: MelodyFlavorSection
  label: string
  hint: string
}> = [
  {
    id: 'riff',
    label: 'Melody',
    hint: 'Block chords, arpeggios, runs, pads, bells, and single-note hooks.',
  },
  {
    id: 'rhythm',
    label: 'Rhythm',
    hint: 'From one hit per bar up to syncopated and double-time.',
  },
  {
    id: 'height',
    label: 'Range',
    hint: 'Low, mid, or high register.',
  },
]

/** Shared vibe pills — multi-select within and across sections. */
export const MELODY_FLAVORS: MelodyFlavor[] = [
  // Melody shape (riff)
  { id: 'mel:riff:strum', section: 'riff', label: 'Block chords' },
  { id: 'mel:riff:arp', section: 'riff', label: 'Arpeggio' },
  { id: 'mel:riff:up', section: 'riff', label: 'Rising run' },
  { id: 'mel:riff:down', section: 'riff', label: 'Falling run' },
  { id: 'mel:riff:bounce', section: 'riff', label: 'Up & down' },
  { id: 'mel:riff:lick', section: 'riff', label: 'Lead phrase' },
  { id: 'mel:riff:wash', section: 'riff', label: 'Sustained pad' },
  { id: 'mel:riff:chime', section: 'riff', label: 'Bell accents' },
  { id: 'mel:riff:pedal', section: 'riff', label: 'Root pedal' },
  { id: 'mel:riff:top', section: 'riff', label: 'Top note' },
  { id: 'mel:riff:third', section: 'riff', label: 'On the 3rd' },
  { id: 'mel:riff:dyad', section: 'riff', label: 'Two-note stab' },
  { id: 'mel:riff:ping', section: 'riff', label: 'Root & fifth' },
  { id: 'mel:riff:octave', section: 'riff', label: 'Octave jump' },
  { id: 'mel:riff:cascade', section: 'riff', label: 'High cascade' },
  { id: 'mel:riff:sway', section: 'riff', label: 'Sway' },
  { id: 'mel:riff:hook', section: 'riff', label: 'Catchy hook' },
  // Rhythm (8-step structs unless noted)
  { id: 'mel:rhythm:whole', section: 'rhythm', label: 'Whole bar' },
  { id: 'mel:rhythm:slow', section: 'rhythm', label: 'Slow' },
  { id: 'mel:rhythm:halftime', section: 'rhythm', label: 'Half-time' },
  { id: 'mel:rhythm:medium', section: 'rhythm', label: 'Medium' },
  { id: 'mel:rhythm:steady', section: 'rhythm', label: 'Steady 4ths' },
  { id: 'mel:rhythm:offbeat', section: 'rhythm', label: 'Offbeat 8ths' },
  { id: 'mel:rhythm:sync', section: 'rhythm', label: 'Syncopated' },
  { id: 'mel:rhythm:busy', section: 'rhythm', label: 'Busy 8ths' },
  { id: 'mel:rhythm:double', section: 'rhythm', label: 'Double-time' },
  // Height
  { id: 'mel:height:low', section: 'height', label: 'Low' },
  { id: 'mel:height:mid', section: 'height', label: 'Mid' },
  { id: 'mel:height:high', section: 'height', label: 'High' },
]

export const DEFAULT_MELODY_FLAVOR_IDS = [
  'mel:riff:strum',
  'mel:rhythm:medium',
  'mel:height:mid',
] as const

const flavorById = new Map(MELODY_FLAVORS.map((f) => [f.id, f]))

const LEGACY_TO_FLAVORS: Record<string, string[]> = {
  'melody:stabs': ['mel:riff:strum', 'mel:rhythm:medium', 'mel:height:mid'],
  'melody:houseStabs': ['mel:riff:strum', 'mel:rhythm:offbeat', 'mel:height:mid'],
  'melody:arp': ['mel:riff:arp', 'mel:rhythm:busy', 'mel:height:mid'],
  'melody:phrase': ['mel:riff:lick', 'mel:rhythm:medium', 'mel:height:high'],
  'melody:improv': ['mel:riff:bounce', 'mel:rhythm:busy', 'mel:height:high'],
  'melody:ambient': ['mel:riff:wash', 'mel:rhythm:slow', 'mel:height:mid'],
  'melody:chime': ['mel:riff:chime', 'mel:rhythm:slow', 'mel:height:high'],
}

export function isMelodyFlavorId(id: string): boolean {
  return flavorById.has(id)
}

export function melodyFlavorsInSection(section: MelodyFlavorSection): MelodyFlavor[] {
  return MELODY_FLAVORS.filter((f) => f.section === section)
}

/** Preserve order; keep multiples in the same section. */
export function normalizeMelodyFlavorIds(ids: string[]): string[] {
  const out: string[] = []
  for (const id of ids) {
    if (!flavorById.has(id)) continue
    if (!out.includes(id)) out.push(id)
  }
  return out
}

export function melodyFlavorsForGenerator(generator: GeneratorName): string[] {
  switch (generator) {
    case 'houseStabs':
      return normalizeMelodyFlavorIds(['mel:riff:strum', 'mel:rhythm:offbeat', 'mel:height:mid'])
    case 'arpUp':
    case 'chiptuneArp':
      return normalizeMelodyFlavorIds(['mel:riff:arp', 'mel:rhythm:busy', 'mel:height:mid'])
    case 'melodyPhrase':
    case 'lofiKeys':
      return normalizeMelodyFlavorIds(['mel:riff:lick', 'mel:rhythm:medium', 'mel:height:mid'])
    case 'improv':
      return normalizeMelodyFlavorIds(['mel:riff:bounce', 'mel:rhythm:busy', 'mel:height:high'])
    case 'ambientGrain':
      return normalizeMelodyFlavorIds(['mel:riff:wash', 'mel:rhythm:slow', 'mel:height:mid'])
    case 'chimeHits':
      return normalizeMelodyFlavorIds(['mel:riff:chime', 'mel:rhythm:slow', 'mel:height:high'])
    case 'chordStabs':
    case 'melodyCompose':
    default:
      return [...DEFAULT_MELODY_FLAVOR_IDS]
  }
}

export function migrateMelodyFlavorIds(ids: string[] | undefined): string[] {
  if (ids === undefined) return [...DEFAULT_MELODY_FLAVOR_IDS]
  if (!ids.length) return []
  const expanded: string[] = []
  for (const id of ids) {
    if (isMelodyFlavorId(id)) {
      expanded.push(id)
      continue
    }
    const mapped = LEGACY_TO_FLAVORS[id]
    if (mapped) expanded.push(...mapped)
  }
  return normalizeMelodyFlavorIds(expanded)
}

function octOf(heightId: string): number {
  if (heightId === 'mel:height:low') return 3
  if (heightId === 'mel:height:high') return 5
  return 4
}

function withOct(note: string, oct: number): string {
  return note.replace(/\d+$/, String(oct))
}

function rhythmDensity(rhythmId: string): 'sparse' | 'medium' | 'dense' {
  switch (rhythmId) {
    case 'mel:rhythm:whole':
    case 'mel:rhythm:slow':
    case 'mel:rhythm:halftime':
      return 'sparse'
    case 'mel:rhythm:busy':
    case 'mel:rhythm:steady':
    case 'mel:rhythm:double':
      return 'dense'
    default:
      return 'medium'
  }
}

function arpNotesPerBar(rhythmId: string): number {
  switch (rhythmDensity(rhythmId)) {
    case 'sparse':
      return 3
    case 'dense':
      return rhythmId === 'mel:rhythm:double' ? 6 : 8
    default:
      return 4
  }
}

function rhythmStruct(rhythmId: string): string {
  switch (rhythmId) {
    case 'mel:rhythm:whole':
      return 'x'
    case 'mel:rhythm:slow':
      return 'x ~ ~ ~'
    case 'mel:rhythm:halftime':
      return 'x ~ ~ ~ ~ ~ x ~'
    case 'mel:rhythm:medium':
      return 'x ~ x ~'
    case 'mel:rhythm:steady':
      return 'x ~ x ~ x ~ x ~'
    case 'mel:rhythm:offbeat':
      return '~ x ~ x ~ x ~ x'
    case 'mel:rhythm:sync':
      return 'x ~ ~ x ~ ~ x ~'
    case 'mel:rhythm:busy':
      return 'x ~ x ~ ~ x ~ x ~'
    case 'mel:rhythm:double':
      return 'x x ~ x x x ~ x'
    default:
      return 'x ~ x ~'
  }
}

function renderMelodyVoice(
  ctx: HarmonyCtx,
  riff: string,
  rhythm: string,
  oct: number,
): string {
  const struct = rhythmStruct(rhythm)

  if (riff === 'mel:riff:wash') {
    const stacks = ctx.sevenths
      .map((t) => {
        const notes = t.map((n) => withOct(n, oct))
        return `[${notes.join(',')}]`
      })
      .join(' ')
    const washStruct =
      rhythm === 'mel:rhythm:whole' || rhythmDensity(rhythm) === 'sparse' ? 'x' : struct
    return `note("<${stacks}>").struct("${washStruct}")`
  }

  if (riff === 'mel:riff:strum') {
    const stacks = ctx.triads
      .map((t) => {
        const notes = t.map((n) => withOct(n, oct))
        return `[${notes.join(',')}]`
      })
      .join(' ')
    return `note("<${stacks}>").struct("${struct}")`
  }

  if (riff === 'mel:riff:arp') {
    const notesPerBar = arpNotesPerBar(rhythm)
    const seq = ctx.triads.map((t) => {
      const notes = t.map((n) => withOct(n, oct))
      const cycle = [...notes, notes[0]]
      while (cycle.length < notesPerBar) cycle.push(...notes)
      return cycle.slice(0, notesPerBar).join(' ')
    })
    return notePerBar(seq)
  }

  if (riff === 'mel:riff:up') {
    const up = ctx.triads.map((t) => {
      const a = withOct(t[0], oct)
      const b = withOct(t[1], oct)
      const c = withOct(t[2], oct)
      return `${a} ${b} ${c} ${a}`
    })
    return notePerBarStruct(up, struct)
  }

  if (riff === 'mel:riff:down') {
    const down = ctx.triads.map((t) => {
      const a = withOct(t[0], oct)
      const b = withOct(t[1], oct)
      const c = withOct(t[2], oct)
      return `${c} ${b} ${a} ${c}`
    })
    return notePerBarStruct(down, struct)
  }

  if (riff === 'mel:riff:bounce') {
    const bounce = ctx.triads.map((t) => {
      const a = withOct(t[0], oct)
      const b = withOct(t[1], oct)
      const c = withOct(t[2], oct)
      return `${a} ${b} ${c} ${b}`
    })
    return notePerBarStruct(bounce, struct)
  }

  if (riff === 'mel:riff:chime') {
    const hits = ctx.triads.map((t, i) => {
      const n = withOct(t[i % t.length], oct)
      const density = rhythmDensity(rhythm)
      if (density === 'dense') return `${n} ~ ${n} ~ ${n} ~ ${n} ~`
      if (density === 'sparse') return `~ ~ ${n} ~ ~ ~ ~ ~`
      if (rhythm === 'mel:rhythm:offbeat') return `~ ${n} ~ ${n} ~ ${n} ~ ${n}`
      if (rhythm === 'mel:rhythm:sync') return `~ ~ ${n} ~ ${n} ~ ~ ${n}`
      return `~ ${n} ~ ~ ~ ${n} ~ ~`
    })
    return notePerBar(hits)
  }

  if (riff === 'mel:riff:pedal') {
    const roots = ctx.triads.map((t) => withOct(t[0], oct))
    return notePerBarStruct(roots, struct)
  }

  if (riff === 'mel:riff:top') {
    const tops = ctx.triads.map((t) => withOct(t[2], oct))
    return notePerBarStruct(tops, struct)
  }

  if (riff === 'mel:riff:third') {
    const thirds = ctx.triads.map((t) => withOct(t[1], oct))
    return notePerBarStruct(thirds, struct)
  }

  if (riff === 'mel:riff:dyad') {
    const stacks = ctx.triads
      .map((t) => {
        const a = withOct(t[0], oct)
        const b = withOct(t[1], oct)
        return `[${a},${b}]`
      })
      .join(' ')
    return `note("<${stacks}>").struct("${struct}")`
  }

  if (riff === 'mel:riff:ping') {
    const ping = ctx.triads.map((t) => {
      const r = withOct(t[0], oct)
      const f = withOct(t[2], oct)
      return `${r} ${f} ${r} ${f}`
    })
    return notePerBarStruct(ping, struct)
  }

  if (riff === 'mel:riff:octave') {
    const leap = ctx.triads.map((t) => {
      const lo = withOct(t[0], oct)
      const hi = withOct(t[0], oct + 1)
      return `${lo} ${hi} ${lo} ${hi}`
    })
    return notePerBarStruct(leap, struct)
  }

  if (riff === 'mel:riff:cascade') {
    const cascade = ctx.triads.map((t) => {
      const a = withOct(t[0], oct)
      const b = withOct(t[1], oct)
      const c = withOct(t[2], oct)
      const hi = withOct(t[2], oct + 1)
      return `${hi} ${c} ${b} ${a}`
    })
    return notePerBarStruct(cascade, struct)
  }

  if (riff === 'mel:riff:sway') {
    const sway = ctx.triads.map((t) => {
      const a = withOct(t[0], oct)
      const b = withOct(t[1], oct)
      return `${b} ${a} ${b} ${a}`
    })
    return notePerBarStruct(sway, struct)
  }

  if (riff === 'mel:riff:hook') {
    const hook = ctx.triads.map((t, i) => {
      const a = withOct(t[0], oct)
      const b = withOct(t[1], oct)
      const c = withOct(t[2], oct)
      return pickBar(ctx.variation, i, [
        `${c} ${b} ${a} ${b}`,
        `${b} ${c} ${b} ${a}`,
        `${a} ${b} ${c} ${a}`,
      ])
    })
    return notePerBarStruct(hook, struct)
  }

  if (riff !== 'mel:riff:lick') {
    const roots = ctx.triads.map((t) => withOct(t[0], oct))
    return notePerBarStruct(roots, struct)
  }

  const lick = ctx.triads.map((t, i) => {
    const a = withOct(t[0], oct)
    const b = withOct(t[1], oct)
    const c = withOct(t[2], oct)
    const up = withOct(t[0], oct + 1)
    const density = rhythmDensity(rhythm)
    if (density === 'sparse') {
      return pickBar(ctx.variation, i, [`${a} ~ ~ ${b}`, `${a} ~ ${c} ~`, `~ ${b} ~ ${a}`])
    }
    if (density === 'dense') {
      return pickBar(ctx.variation, i, [
        `${a} ~ ${b} ~ ${c} ~ ${a} ~`,
        `${a} ~ ${c} ~ ${up} ~ ${b} ~`,
        `~ ${b} ~ ${a} ~ ${c} ~ ${a}`,
      ])
    }
    if (rhythm === 'mel:rhythm:sync') {
      return pickBar(ctx.variation, i, [
        `${a} ~ ~ ${c} ~ ${b} ~ ${a}`,
        `~ ${b} ~ ~ ${a} ~ ${c}`,
        `${a} ~ ${b} ~ ~ ${a} ~ ${c}`,
      ])
    }
    if (rhythm === 'mel:rhythm:offbeat') {
      return pickBar(ctx.variation, i, [
        `~ ${a} ~ ${b} ~ ${c} ~ ${a}`,
        `~ ${b} ~ ${a} ~ ${c} ~ ${b}`,
        `~ ${a} ~ ${c} ~ ${b} ~ ${a}`,
      ])
    }
    return pickBar(ctx.variation, i, [
      `${a} ~ ${b} ~ ${c} ~ ${a} ~`,
      `${a} ~ ${c} ~ ${up} ~ ~`,
      `${b} ~ ${a} ~ ${c} ~`,
    ])
  })
  return notePerBar(lick)
}

function stackParts(parts: string[]): string {
  if (!parts.length) return 'silence'
  if (parts.length === 1) return parts[0]!
  return `stack(${parts.join(', ')})`
}

export function composeMelodyPattern(ctx: HarmonyCtx, flavorIds: string[] | undefined): string {
  const ids = migrateMelodyFlavorIds(flavorIds)
  if (!ids.length) return 'silence'

  const riffs = ids.filter((id) => flavorById.get(id)?.section === 'riff')
  const rhythms = ids.filter((id) => flavorById.get(id)?.section === 'rhythm')
  const heights = ids.filter((id) => flavorById.get(id)?.section === 'height')

  const riffList = riffs.length ? riffs : ['mel:riff:strum']
  const rhythmList = rhythms.length ? rhythms : ['mel:rhythm:medium']
  const octs = heights.length ? heights.map(octOf) : [4]

  const parts: string[] = []
  for (const riff of riffList) {
    for (const rhythm of rhythmList) {
      for (const oct of octs) {
        parts.push(renderMelodyVoice(ctx, riff, rhythm, oct))
        if (parts.length >= 8) return stackParts(parts)
      }
    }
  }
  return stackParts(parts)
}

export function melodyFlavorSummary(flavorIds: string[] | undefined): string {
  const ids = migrateMelodyFlavorIds(flavorIds)
  if (!ids.length) return 'Silent'
  const labels = ids.map((id) => flavorById.get(id)?.label).filter(Boolean)
  if (labels.length <= 3) return labels.join(' + ')
  return `${labels.slice(0, 2).join(' + ')} +${labels.length - 2}`
}
