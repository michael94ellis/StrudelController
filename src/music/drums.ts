import type { Beat } from './types'
import { str } from './types'

export const DRUM_BANK_OPTIONS = [
  { value: 'RolandTR909', label: 'TR-909' },
  { value: 'RolandTR808', label: 'TR-808' },
  { value: 'AkaiLinn', label: 'Linn' },
  { value: 'AkaiMPC60', label: 'MPC60' },
  { value: 'EmuSP12', label: 'Emu SP-12' },
] as const

export type DrumBankId = (typeof DRUM_BANK_OPTIONS)[number]['value']

/** Bank from the first enabled drum layer, else TR-909. */
export function preferredDrumBank(beat: Beat): DrumBankId {
  const layer = beat.layers.find((l) => l.enabled && l.kind === 'drumkit')
  const bank = str(layer?.instrumentParams ?? {}, 'bank', 'RolandTR909')
  if (DRUM_BANK_OPTIONS.some((o) => o.value === bank)) return bank as DrumBankId
  return 'RolandTR909'
}
