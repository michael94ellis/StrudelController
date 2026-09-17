import type { Beat } from './types'
import { str } from './types'

/** Pretty label from a tidal bank id (RolandTR909 → TR-909, AkaiLinn → Linn). */
function prettyBankLabel(id: string): string {
  const known: Record<string, string> = {
    RolandTR909: 'TR-909',
    RolandTR808: 'TR-808',
    RolandTR707: 'TR-707',
    RolandTR626: 'TR-626',
    RolandTR606: 'TR-606',
    RolandTR505: 'TR-505',
    AkaiLinn: 'Linn',
    AkaiMPC60: 'MPC60',
    AkaiXR10: 'XR10',
    EmuSP12: 'SP-12',
    EmuDrumulator: 'Drumulator',
    LinnDrum: 'LinnDrum',
    LinnLM1: 'LM-1',
    LinnLM2: 'LM-2',
    Linn9000: 'Linn 9000',
    OberheimDMX: 'DMX',
    SimmonsSDS5: 'SDS-5',
    MPC1000: 'MPC1000',
  }
  if (known[id]) return known[id]
  return id
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/^Roland /, '')
    .replace(/^Boss /, 'Boss ')
    .replace(/^Yamaha /, 'Yamaha ')
    .replace(/^Korg /, 'Korg ')
}

/**
 * Machine kits from tidal-drum-machines that expose bd + hh (sd falls back to Dirt).
 * Order: classics first, then the rest alphabetically.
 */
const PRIORITY_BANKS = [
  'RolandTR909',
  'RolandTR808',
  'RolandTR707',
  'RolandTR606',
  'AkaiLinn',
  'AkaiMPC60',
  'EmuSP12',
  'LinnDrum',
  'OberheimDMX',
  'EmuDrumulator',
] as const

const ALL_MACHINE_BANKS = [
  ...PRIORITY_BANKS,
  'AkaiXR10',
  'AlesisHR16',
  'AlesisSR16',
  'BossDR110',
  'BossDR220',
  'BossDR55',
  'BossDR550',
  'CasioRZ1',
  'CasioSK1',
  'CasioVL1',
  'DoepferMS404',
  'KorgDDM110',
  'KorgKPR77',
  'KorgKR55',
  'KorgKRZ',
  'KorgM1',
  'KorgMinipops',
  'KorgT3',
  'Linn9000',
  'LinnLM1',
  'LinnLM2',
  'MFB512',
  'MPC1000',
  'RhythmAce',
  'RolandCompurhythm1000',
  'RolandCompurhythm78',
  'RolandCompurhythm8000',
  'RolandD110',
  'RolandD70',
  'RolandJD990',
  'RolandMC303',
  'RolandMT32',
  'RolandR8',
  'RolandSystem100',
  'RolandTR505',
  'RolandTR626',
  'SakataDPM48',
  'SequentialCircuitsDrumtracks',
  'SequentialCircuitsTom',
  'SimmonsSDS5',
  'SoundmastersR88',
  'UnivoxMicroRhythmer12',
  'ViscoSpaceDrum',
  'XdrumLM8953',
  'YamahaRM50',
  'YamahaRX21',
  'YamahaRX5',
  'YamahaRY30',
] as const

const seen = new Set<string>()
export const DRUM_BANK_OPTIONS: Array<{ value: string; label: string }> = []
for (const value of ALL_MACHINE_BANKS) {
  if (seen.has(value)) continue
  seen.add(value)
  DRUM_BANK_OPTIONS.push({ value, label: prettyBankLabel(value) })
}

export type DrumBankId = string

/** Bank from the first enabled drum layer, else TR-909. */
export function preferredDrumBank(beat: Beat): DrumBankId {
  const layer = beat.layers.find((l) => l.enabled && l.kind === 'drumkit')
  const bank = str(layer?.instrumentParams ?? {}, 'bank', 'RolandTR909')
  if (DRUM_BANK_OPTIONS.some((o) => o.value === bank)) return bank
  return 'RolandTR909'
}

/**
 * One `s("…")` mini pattern for all drum lanes — keeps kick/snare/hat on the
 * same clock (stacked `s()` layers can drift a hair at loop boundaries).
 */
export function drumMini(...lanes: string[]): string {
  return `s("${lanes.join(', ')}")`
}

/**
 * One drum bar per cycle — matches harmonic `note("< … >")` loop length.
 * Each entry is comma-separated lanes (same as `drumMini` without the `s()`).
 */
export function drumPerBar(barMinis: string[]): string {
  if (barMinis.length === 0) return 'silence'
  if (barMinis.length === 1) return `s("${barMinis[0]}")`
  const inner = barMinis.map((bar) => `[${bar}]`).join(' ')
  return `s("<${inner}>")`
}
