import type { GeneratorName } from './types'
import { drumMini } from './drums'

export type DrumFlavorSection = 'kick' | 'snare' | 'hats' | 'rim'

export type DrumFlavor = {
  id: string
  section: DrumFlavorSection
  label: string
  /** One voice in a stacked `s("…")` pattern — clearly audible when toggled. */
  lane: string
}

export const DRUM_FLAVOR_SECTIONS: Array<{ id: DrumFlavorSection; label: string }> = [
  { id: 'kick', label: 'Kick' },
  { id: 'snare', label: 'Snare' },
  { id: 'hats', label: 'Hats' },
  { id: 'rim', label: 'Rim' },
]

/** Stackable beat particles — any mix within and across sections. */
export const DRUM_FLAVORS: DrumFlavor[] = [
  // Kick
  { id: 'flavor:kick4', section: 'kick', label: 'Four', lane: 'bd*4' },
  { id: 'flavor:kick2', section: 'kick', label: 'Two', lane: 'bd ~ ~ ~ bd ~ ~ ~' },
  { id: 'flavor:kickSync', section: 'kick', label: 'Sync', lane: 'bd ~ ~ bd ~ bd ~ ~' },
  { id: 'flavor:kickTrap', section: 'kick', label: 'Trap', lane: 'bd ~ ~ ~ ~ ~ bd ~' },
  { id: 'flavor:kickFourAnd', section: 'kick', label: '1 & 3', lane: 'bd ~ bd ~ bd ~ bd ~' },
  // Snare
  { id: 'flavor:snareBack', section: 'snare', label: '2 / 4', lane: '~ sd ~ sd' },
  { id: 'flavor:snareHalf', section: 'snare', label: 'Half', lane: '~ ~ ~ ~ sd ~ ~ ~' },
  { id: 'flavor:clap', section: 'snare', label: 'Clap', lane: '~ cp ~ cp' },
  { id: 'flavor:snareGhost', section: 'snare', label: 'Ghost', lane: '~ sd ~ [sd ~] ~ sd ~ sd' },
  { id: 'flavor:snareBuild', section: 'snare', label: 'Build', lane: '~ ~ ~ ~ ~ sd sd sd' },
  // Hats
  { id: 'flavor:hat8', section: 'hats', label: '8ths', lane: 'hh ~ hh ~ hh ~ hh ~' },
  { id: 'flavor:hat16', section: 'hats', label: '16ths', lane: 'hh*16' },
  { id: 'flavor:hatOpen', section: 'hats', label: 'Open', lane: 'hh ~ oh ~ hh ~ oh ~' },
  { id: 'flavor:hatOff', section: 'hats', label: 'Offbeat', lane: '~ hh ~ hh ~ hh ~ hh' },
  { id: 'flavor:hatSparse', section: 'hats', label: 'Sparse', lane: 'hh ~ ~ ~ hh ~ ~ ~' },
  // Rim / spice
  { id: 'flavor:rim', section: 'rim', label: 'Click', lane: 'rim ~ ~ rim ~ ~ rim ~' },
  { id: 'flavor:rimDense', section: 'rim', label: 'Dense', lane: 'rim ~ rim rim ~ rim ~ rim' },
  { id: 'flavor:shaker', section: 'rim', label: 'Shaker', lane: 'sh*8' },
  { id: 'flavor:shakerOff', section: 'rim', label: 'Shake off', lane: '~ sh ~ sh ~ sh ~ sh' },
]

export const DEFAULT_DRUM_FLAVOR_IDS = [
  'flavor:kick4',
  'flavor:snareBack',
  'flavor:hat8',
] as const

const flavorById = new Map(DRUM_FLAVORS.map((f) => [f.id, f]))

/** Legacy exclusive groove pills → section picks. */
const GROOVE_TO_FLAVORS: Record<string, string[]> = {
  'groove:fourOnFloor': ['flavor:kick4', 'flavor:snareBack', 'flavor:hat8'],
  'groove:house': ['flavor:kick4', 'flavor:clap', 'flavor:hat8'],
  'groove:trap': ['flavor:kickTrap', 'flavor:snareHalf', 'flavor:hat16'],
  'groove:breakbeat': ['flavor:kickSync', 'flavor:snareGhost', 'flavor:hat8'],
  'groove:sparse': ['flavor:kick2', 'flavor:snareBack', 'flavor:hatOff'],
  'groove:shaker': ['flavor:kick2', 'flavor:shaker'],
  'groove:rim': ['flavor:kick2', 'flavor:snareBack', 'flavor:rim'],
}

export function isDrumFlavorId(id: string): boolean {
  return flavorById.has(id)
}

export function flavorsInSection(section: DrumFlavorSection): DrumFlavor[] {
  return DRUM_FLAVORS.filter((f) => f.section === section)
}

/** Preserve order; drop unknown ids; keep multiples in the same section. */
export function normalizeDrumFlavorIds(ids: string[]): string[] {
  const out: string[] = []
  for (const id of ids) {
    if (!flavorById.has(id)) continue
    if (!out.includes(id)) out.push(id)
  }
  return out
}

export function drumFlavorsForGenerator(generator: GeneratorName): string[] {
  switch (generator) {
    case 'trapKit':
      return normalizeDrumFlavorIds(['flavor:kickTrap', 'flavor:snareHalf', 'flavor:hat16'])
    case 'houseKit':
    case 'fourOnFloor':
      return normalizeDrumFlavorIds(['flavor:kick4', 'flavor:clap', 'flavor:hat8'])
    case 'breakbeat':
      return normalizeDrumFlavorIds(['flavor:kickSync', 'flavor:snareGhost', 'flavor:hat8'])
    case 'sparsePulse':
      return normalizeDrumFlavorIds(['flavor:kick2', 'flavor:snareBack', 'flavor:hatOff'])
    case 'lofiKit':
      return normalizeDrumFlavorIds(['flavor:kickSync', 'flavor:snareBack', 'flavor:hat8'])
    case 'chiptuneKit':
      return normalizeDrumFlavorIds(['flavor:kick2', 'flavor:snareBack', 'flavor:hat16'])
    case 'shaker':
      return normalizeDrumFlavorIds(['flavor:kick2', 'flavor:shaker'])
    case 'rimHits':
      return normalizeDrumFlavorIds(['flavor:kick2', 'flavor:snareBack', 'flavor:rim'])
    default:
      return [...DEFAULT_DRUM_FLAVOR_IDS]
  }
}

/** Normalize stored ids (legacy grooves → flavors). Empty array = silence. */
export function migrateDrumFlavorIds(ids: string[] | undefined): string[] {
  if (ids === undefined) return [...DEFAULT_DRUM_FLAVOR_IDS]
  if (!ids.length) return []
  const expanded: string[] = []
  for (const id of ids) {
    if (isDrumFlavorId(id)) {
      expanded.push(id)
      continue
    }
    const mapped = GROOVE_TO_FLAVORS[id]
    if (mapped) expanded.push(...mapped)
  }
  return normalizeDrumFlavorIds(expanded)
}

export function composeDrumPattern(flavorIds: string[] | undefined): string {
  const lanes = migrateDrumFlavorIds(flavorIds)
    .map((id) => flavorById.get(id)?.lane)
    .filter((lane): lane is string => Boolean(lane))
  if (!lanes.length) return 'silence'
  return drumMini(...lanes)
}

export function drumFlavorSummary(flavorIds: string[] | undefined): string {
  const active = migrateDrumFlavorIds(flavorIds)
  if (!active.length) return 'Silent'
  const labels = active.map((id) => flavorById.get(id)?.label).filter(Boolean)
  if (labels.length <= 3) return labels.join(' + ')
  return `${labels.slice(0, 2).join(' + ')} +${labels.length - 2}`
}
