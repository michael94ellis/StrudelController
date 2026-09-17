import type { GeneratorName, HarmonyCtx } from './types'
import { notePerBar, notePerBarStruct } from './pattern'

export type BassFlavorSection = 'riff' | 'rhythm' | 'height'

export type BassFlavor = {
  id: string
  section: BassFlavorSection
  label: string
}

export const BASS_FLAVOR_SECTIONS: Array<{ id: BassFlavorSection; label: string }> = [
  { id: 'riff', label: 'Riff' },
  { id: 'rhythm', label: 'Rhythm' },
  { id: 'height', label: 'Height' },
]

/** Plain-language bass vibe pills — one pick per section. */
export const BASS_FLAVORS: BassFlavor[] = [
  // Riff
  { id: 'bass:riff:hold', section: 'riff', label: '1-note hold' },
  { id: 'bass:riff:pulse', section: 'riff', label: 'Pulse roots' },
  { id: 'bass:riff:walk', section: 'riff', label: 'Walk around' },
  { id: 'bass:riff:up', section: 'riff', label: 'Step up' },
  { id: 'bass:riff:down', section: 'riff', label: 'Step down' },
  { id: 'bass:riff:bounce', section: 'riff', label: 'Bounce both ways' },
  { id: 'bass:riff:lick', section: 'riff', label: 'Tasty lick' },
  // Rhythm
  { id: 'bass:rhythm:steady', section: 'rhythm', label: 'Steady' },
  { id: 'bass:rhythm:pump', section: 'rhythm', label: 'Pump' },
  { id: 'bass:rhythm:trap', section: 'rhythm', label: 'Trap bounce' },
  { id: 'bass:rhythm:half', section: 'rhythm', label: 'Half-time' },
  { id: 'bass:rhythm:sync', section: 'rhythm', label: 'Syncopated' },
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

/** At most one flavor per section (last wins). */
export function normalizeBassFlavorIds(ids: string[]): string[] {
  const bySection = new Map<BassFlavorSection, string>()
  for (const id of ids) {
    const f = flavorById.get(id)
    if (!f) continue
    bySection.set(f.section, id)
  }
  return BASS_FLAVOR_SECTIONS.map((s) => bySection.get(s.id)).filter(
    (id): id is string => Boolean(id),
  )
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
  const normalized = normalizeBassFlavorIds(expanded)
  return normalized.length ? normalized : [...DEFAULT_BASS_FLAVOR_IDS]
}

function octOf(heightId: string | undefined): number {
  if (heightId === 'bass:height:mid') return 2
  if (heightId === 'bass:height:high') return 3
  return 1
}

function withOct(note: string, oct: number): string {
  return note.replace(/\d+$/, String(oct))
}

function rhythmStruct(rhythmId: string | undefined): string {
  switch (rhythmId) {
    case 'bass:rhythm:pump':
      return '~ x ~ x ~ x ~ x'
    case 'bass:rhythm:half':
      return 'x ~ x ~'
    case 'bass:rhythm:sync':
      return 'x ~ x x ~ x ~ ~'
    case 'bass:rhythm:trap':
      return 'x ~ ~ x ~ x x ~'
    case 'bass:rhythm:steady':
    default:
      return 'x x x x'
  }
}

export function composeBassPattern(ctx: HarmonyCtx, flavorIds: string[] | undefined): string {
  const ids = migrateBassFlavorIds(flavorIds)
  if (!ids.length) return 'silence'

  const riff = ids.find((id) => flavorById.get(id)?.section === 'riff')
  const rhythm = ids.find((id) => flavorById.get(id)?.section === 'rhythm')
  const height = ids.find((id) => flavorById.get(id)?.section === 'height')
  const oct = octOf(height)
  const struct = rhythmStruct(rhythm)

  const roots = ctx.roots.map((r) => withOct(r, oct))

  if (riff === 'bass:riff:hold') {
    return notePerBarStruct(roots, rhythm === 'bass:rhythm:steady' ? 'x' : struct)
  }

  if (riff === 'bass:riff:pulse' || !riff) {
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

  // tasty lick — approach + octave flick
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

export function bassFlavorSummary(flavorIds: string[] | undefined): string {
  const ids = migrateBassFlavorIds(flavorIds)
  if (!ids.length) return 'Silent'
  const labels = ids.map((id) => flavorById.get(id)?.label).filter(Boolean)
  if (labels.length <= 3) return labels.join(' · ')
  return `${labels.slice(0, 2).join(' · ')} +${labels.length - 2}`
}
