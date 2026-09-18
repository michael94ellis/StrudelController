import type { GeneratorName, HarmonyCtx } from './types'
import { notePerBar, notePerBarStruct } from './pattern'

export type BassFlavorSection = 'riff' | 'rhythm' | 'height'

export type BassFlavor = {
  id: string
  section: BassFlavorSection
  label: string
}

export const BASS_FLAVOR_SECTIONS: Array<{
  id: BassFlavorSection
  label: string
  hint: string
}> = [
  {
    id: 'riff',
    label: 'Line',
    hint: 'Roots, walks, runs, fills, and octave moves — stack any mix.',
  },
  {
    id: 'rhythm',
    label: 'Rhythm',
    hint: 'Quarters, pump, half-time, trap, and syncopated grooves.',
  },
  {
    id: 'height',
    label: 'Range',
    hint: 'Low, mid, or high register.',
  },
]

/** Plain-language bass vibe pills — multi-select within and across sections. */
export const BASS_FLAVORS: BassFlavor[] = [
  // Line
  { id: 'bass:riff:hold', section: 'riff', label: 'Sustained root' },
  { id: 'bass:riff:pulse', section: 'riff', label: 'Repeated roots' },
  { id: 'bass:riff:walk', section: 'riff', label: 'Root & fifth walk' },
  { id: 'bass:riff:up', section: 'riff', label: 'Rising run' },
  { id: 'bass:riff:down', section: 'riff', label: 'Falling run' },
  { id: 'bass:riff:bounce', section: 'riff', label: 'Up & down' },
  { id: 'bass:riff:lick', section: 'riff', label: 'Fill phrase' },
  { id: 'bass:riff:fifth', section: 'riff', label: 'On the fifth' },
  { id: 'bass:riff:ping', section: 'riff', label: 'Root & fifth' },
  { id: 'bass:riff:octave', section: 'riff', label: 'Octave jump' },
  { id: 'bass:riff:hook', section: 'riff', label: 'Simple hook' },
  // Rhythm
  { id: 'bass:rhythm:whole', section: 'rhythm', label: 'Whole bar' },
  { id: 'bass:rhythm:steady', section: 'rhythm', label: 'Every beat' },
  { id: 'bass:rhythm:half', section: 'rhythm', label: 'Half-time' },
  { id: 'bass:rhythm:pump', section: 'rhythm', label: 'Offbeat pump' },
  { id: 'bass:rhythm:offbeat', section: 'rhythm', label: 'Offbeat 8ths' },
  { id: 'bass:rhythm:sync', section: 'rhythm', label: 'Syncopated' },
  { id: 'bass:rhythm:trap', section: 'rhythm', label: 'Trap skips' },
  // Height
  { id: 'bass:height:low', section: 'height', label: 'Low' },
  { id: 'bass:height:mid', section: 'height', label: 'Mid' },
  { id: 'bass:height:high', section: 'height', label: 'High' },
]

export const DEFAULT_BASS_FLAVOR_IDS = [
  'bass:riff:pulse',
  'bass:rhythm:steady',
  'bass:height:low',
] as const

const flavorById = new Map(BASS_FLAVORS.map((f) => [f.id, f]))

const LEGACY_TO_FLAVORS: Record<string, string[]> = {
  'bass:root': ['bass:riff:pulse', 'bass:rhythm:steady', 'bass:height:low'],
  'bass:walk': ['bass:riff:walk', 'bass:rhythm:steady', 'bass:height:mid'],
  'bass:house': ['bass:riff:pulse', 'bass:rhythm:pump', 'bass:height:mid'],
  'bass:trap': ['bass:riff:lick', 'bass:rhythm:trap', 'bass:height:low'],
}

export function isBassFlavorId(id: string): boolean {
  return flavorById.has(id)
}

export function bassFlavorsInSection(section: BassFlavorSection): BassFlavor[] {
  return BASS_FLAVORS.filter((f) => f.section === section)
}

/** Preserve order; keep multiples in the same section. */
export function normalizeBassFlavorIds(ids: string[]): string[] {
  const out: string[] = []
  for (const id of ids) {
    if (!flavorById.has(id)) continue
    if (!out.includes(id)) out.push(id)
  }
  return out
}

export function bassFlavorsForGenerator(generator: GeneratorName): string[] {
  switch (generator) {
    case 'houseBass':
      return normalizeBassFlavorIds(['bass:riff:pulse', 'bass:rhythm:pump', 'bass:height:mid'])
    case 'trapBass':
      return normalizeBassFlavorIds(['bass:riff:lick', 'bass:rhythm:trap', 'bass:height:low'])
    case 'walkingBass':
      return normalizeBassFlavorIds(['bass:riff:walk', 'bass:rhythm:steady', 'bass:height:mid'])
    case 'rootBass':
    case 'bassCompose':
    default:
      return [...DEFAULT_BASS_FLAVOR_IDS]
  }
}

export function migrateBassFlavorIds(ids: string[] | undefined): string[] {
  if (ids === undefined) return [...DEFAULT_BASS_FLAVOR_IDS]
  if (!ids.length) return []
  const expanded: string[] = []
  for (const id of ids) {
    if (isBassFlavorId(id)) {
      expanded.push(id)
      continue
    }
    const mapped = LEGACY_TO_FLAVORS[id]
    if (mapped) expanded.push(...mapped)
  }
  return normalizeBassFlavorIds(expanded)
}

function octOf(heightId: string): number {
  if (heightId === 'bass:height:mid') return 2
  if (heightId === 'bass:height:high') return 3
  return 1
}

function withOct(note: string, oct: number): string {
  return note.replace(/\d+$/, String(oct))
}

function rhythmStruct(rhythmId: string): string {
  switch (rhythmId) {
    case 'bass:rhythm:whole':
      return 'x'
    case 'bass:rhythm:pump':
    case 'bass:rhythm:offbeat':
      return '~ x ~ x ~ x ~ x'
    case 'bass:rhythm:half':
      return 'x ~ x ~'
    case 'bass:rhythm:sync':
      return 'x ~ ~ x ~ x ~ ~'
    case 'bass:rhythm:trap':
      return 'x ~ ~ x ~ x ~ ~'
    case 'bass:rhythm:steady':
    default:
      return 'x ~ x ~ x ~ x ~'
  }
}

function renderBassVoice(
  ctx: HarmonyCtx,
  riff: string,
  rhythm: string,
  oct: number,
): string {
  const struct = rhythmStruct(rhythm)
  const roots = ctx.roots.map((r) => withOct(r, oct))

  if (riff === 'bass:riff:hold') {
    const holdStruct =
      rhythm === 'bass:rhythm:whole' || rhythm === 'bass:rhythm:steady' ? 'x' : struct
    return notePerBarStruct(roots, holdStruct)
  }

  if (riff === 'bass:riff:pulse') {
    if (rhythm === 'bass:rhythm:trap') {
      const line = ctx.roots.map((r) => {
        const n = withOct(r, oct)
        const up = withOct(r, oct + 1)
        return `${n} ~ ~ ${n} ~ ${up} ${n} ~`
      })
      return notePerBar(line)
    }
    return notePerBarStruct(roots, struct)
  }

  if (riff === 'bass:riff:walk') {
    const walk = ctx.triads.map((t) => {
      const r = withOct(t[0], oct)
      const fifth = withOct(t[2], oct)
      return `${r} ${fifth} ${r} ${fifth}`
    })
    return notePerBar(walk)
  }

  if (riff === 'bass:riff:up') {
    const up = ctx.triads.map((t) => {
      const a = withOct(t[0], oct)
      const b = withOct(t[1], oct)
      const c = withOct(t[2], oct)
      return `${a} ${b} ${c} ${a}`
    })
    return notePerBarStruct(up, struct)
  }

  if (riff === 'bass:riff:down') {
    const down = ctx.triads.map((t) => {
      const a = withOct(t[0], oct)
      const b = withOct(t[1], oct)
      const c = withOct(t[2], oct)
      return `${c} ${b} ${a} ${c}`
    })
    return notePerBarStruct(down, struct)
  }

  if (riff === 'bass:riff:bounce') {
    const bounce = ctx.triads.map((t) => {
      const a = withOct(t[0], oct)
      const b = withOct(t[1], oct)
      const c = withOct(t[2], oct)
      return `${a} ${b} ${c} ${b}`
    })
    return notePerBarStruct(bounce, struct)
  }

  if (riff === 'bass:riff:fifth') {
    const fifths = ctx.triads.map((t) => withOct(t[2], oct))
    return notePerBarStruct(fifths, struct)
  }

  if (riff === 'bass:riff:ping') {
    const ping = ctx.triads.map((t) => {
      const r = withOct(t[0], oct)
      const f = withOct(t[2], oct)
      return `${r} ${f} ${r} ${f}`
    })
    return notePerBarStruct(ping, struct)
  }

  if (riff === 'bass:riff:octave') {
    const leap = ctx.triads.map((t) => {
      const lo = withOct(t[0], oct)
      const hi = withOct(t[0], oct + 1)
      return `${lo} ${hi} ${lo} ${hi}`
    })
    return notePerBarStruct(leap, struct)
  }

  if (riff === 'bass:riff:hook') {
    const hook = ctx.triads.map((t) => {
      const a = withOct(t[0], oct)
      const b = withOct(t[1], oct)
      const c = withOct(t[2], oct)
      return `${c} ${b} ${a} ${b}`
    })
    return notePerBarStruct(hook, struct)
  }

  if (riff !== 'bass:riff:lick') {
    return notePerBarStruct(roots, struct)
  }

  const lick = ctx.triads.map((t) => {
    const a = withOct(t[0], oct)
    const b = withOct(t[1], oct)
    const c = withOct(t[2], oct)
    const up = withOct(t[0], oct + 1)
    if (rhythm === 'bass:rhythm:trap') {
      return `${a} ~ ~ ${b} ~ ${up} ${a} ~`
    }
    return `${a} ${b} ~ ${c} ${a} ~ ${up} ${a}`
  })
  return notePerBar(lick)
}

function stackParts(parts: string[]): string {
  if (!parts.length) return 'silence'
  if (parts.length === 1) return parts[0]!
  return `stack(${parts.join(', ')})`
}

export function composeBassPattern(ctx: HarmonyCtx, flavorIds: string[] | undefined): string {
  const ids = migrateBassFlavorIds(flavorIds)
  if (!ids.length) return 'silence'

  const riffs = ids.filter((id) => flavorById.get(id)?.section === 'riff')
  const rhythms = ids.filter((id) => flavorById.get(id)?.section === 'rhythm')
  const heights = ids.filter((id) => flavorById.get(id)?.section === 'height')

  const riffList = riffs.length ? riffs : ['bass:riff:pulse']
  const rhythmList = rhythms.length ? rhythms : ['bass:rhythm:steady']
  const octs = heights.length ? heights.map(octOf) : [1]

  const parts: string[] = []
  for (const riff of riffList) {
    for (const rhythm of rhythmList) {
      for (const oct of octs) {
        parts.push(renderBassVoice(ctx, riff, rhythm, oct))
        if (parts.length >= 8) return stackParts(parts)
      }
    }
  }
  return stackParts(parts)
}

export function bassFlavorSummary(flavorIds: string[] | undefined): string {
  const ids = migrateBassFlavorIds(flavorIds)
  if (!ids.length) return 'Silent'
  const labels = ids.map((id) => flavorById.get(id)?.label).filter(Boolean)
  if (labels.length <= 3) return labels.join(' + ')
  return `${labels.slice(0, 2).join(' + ')} +${labels.length - 2}`
}
