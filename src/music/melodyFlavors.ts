import type { GeneratorName, HarmonyCtx } from './types'
import { notePerBar, notePerBarStruct } from './pattern'
import { pickBar } from './variation'

export type MelodyFlavorSection = 'riff' | 'rhythm' | 'height'

export type MelodyFlavor = {
  id: string
  section: MelodyFlavorSection
  label: string
}

export const MELODY_FLAVOR_SECTIONS: Array<{ id: MelodyFlavorSection; label: string }> = [
  { id: 'riff', label: 'Riff' },
  { id: 'rhythm', label: 'Rhythm' },
  { id: 'height', label: 'Height' },
]

/** Shared vibe pills — multi-select within and across sections. */
export const MELODY_FLAVORS: MelodyFlavor[] = [
  // Riff
  { id: 'mel:riff:strum', section: 'riff', label: 'Chord strum' },
  { id: 'mel:riff:arp', section: 'riff', label: 'Plucky arp' },
  { id: 'mel:riff:up', section: 'riff', label: 'Step up' },
  { id: 'mel:riff:down', section: 'riff', label: 'Step down' },
  { id: 'mel:riff:bounce', section: 'riff', label: 'Bounce' },
  { id: 'mel:riff:lick', section: 'riff', label: 'Tasty lick' },
  { id: 'mel:riff:wash', section: 'riff', label: 'Soft wash' },
  { id: 'mel:riff:chime', section: 'riff', label: 'Chime hits' },
  // Rhythm
  { id: 'mel:rhythm:slow', section: 'rhythm', label: 'Slow' },
  { id: 'mel:rhythm:medium', section: 'rhythm', label: 'Medium' },
  { id: 'mel:rhythm:busy', section: 'rhythm', label: 'Busy' },
  { id: 'mel:rhythm:offbeat', section: 'rhythm', label: 'Offbeat' },
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

function rhythmStruct(rhythmId: string): string {
  switch (rhythmId) {
    case 'mel:rhythm:slow':
      return 'x ~ ~ ~'
    case 'mel:rhythm:busy':
      // Dense but never adjacent — offbeat 8ths, not gated chops.
      return '~ x ~ x ~ x ~ x'
    case 'mel:rhythm:offbeat':
      return '~ x ~ x ~ x ~ x'
    case 'mel:rhythm:medium':
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
    return `note("<${stacks}>").struct("${rhythm === 'mel:rhythm:busy' ? '~ x ~ x ~ x ~ x' : 'x'}")`
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
    const notesPerBar = rhythm === 'mel:rhythm:busy' ? 8 : rhythm === 'mel:rhythm:slow' ? 3 : 4
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
      return rhythm === 'mel:rhythm:busy' ? `${n} ~ ${n} ~` : `~ ${n} ~ ~`
    })
    return notePerBar(hits)
  }

  const lick = ctx.triads.map((t, i) => {
    const a = withOct(t[0], oct)
    const b = withOct(t[1], oct)
    const c = withOct(t[2], oct)
    const up = withOct(t[0], oct + 1)
    if (rhythm === 'mel:rhythm:slow') {
      return pickBar(ctx.variation, i, [`${a} ~ ~ ${b}`, `${a} ~ ${c} ~`, `~ ${b} ~ ${a}`])
    }
    if (rhythm === 'mel:rhythm:busy') {
      return pickBar(ctx.variation, i, [
        `${a} ~ ${b} ~ ${c} ~ ${a} ~`,
        `${a} ~ ${c} ~ ${up} ~ ${b} ~`,
        `~ ${b} ~ ${a} ~ ${c} ~ ${a}`,
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
