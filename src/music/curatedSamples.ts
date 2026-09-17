import { DRUM_BANK_OPTIONS, type DrumBankId } from './drums'

const DRUM_SAMPLE_PREFIX = 'drum:'
function curatedDrumSampleId(bank: DrumBankId): string {
  return `${DRUM_SAMPLE_PREFIX}${bank}`
}

/** Drum machines shown in the sample picker (subset of full bank list). */
export const CURATED_DRUM_BANKS: Array<{ bank: DrumBankId; label: string }> = [
  { bank: 'RolandTR909', label: 'TR-909' },
  { bank: 'RolandTR808', label: 'TR-808' },
  { bank: 'AkaiLinn', label: 'Linn' },
  { bank: 'AkaiMPC60', label: 'MPC60' },
  { bank: 'EmuSP12', label: 'SP-12' },
]

export type CuratedMelodicSample = { value: string; label: string; group: string }

/** ~25 melodic / noise picks — variety plus paired options (two synth basses, two leads, etc.). */
export const CURATED_MELODIC_SAMPLES: CuratedMelodicSample[] = [
  // Bass
  { value: 'sine', label: 'Sine', group: 'Bass' },
  { value: 'triangle', label: 'Triangle', group: 'Bass' },
  { value: 'gm_synth_bass_1', label: 'Synth bass 1', group: 'Bass' },
  { value: 'gm_synth_bass_2', label: 'Synth bass 2', group: 'Bass' },
  { value: 'gm_electric_bass_finger', label: 'Electric bass', group: 'Bass' },
  // Keys
  { value: 'piano', label: 'Piano (samples)', group: 'Keys' },
  { value: 'gm_piano', label: 'Grand piano', group: 'Keys' },
  { value: 'gm_epiano1', label: 'Rhodes / EP', group: 'Keys' },
  { value: 'gm_clavinet', label: 'Clavinet', group: 'Keys' },
  // Synth
  { value: 'sawtooth', label: 'Saw', group: 'Synth' },
  { value: 'square', label: 'Square', group: 'Synth' },
  { value: 'supersaw', label: 'Supersaw', group: 'Synth' },
  { value: 'gm_lead_1_square', label: 'Lead square', group: 'Synth' },
  { value: 'gm_lead_2_sawtooth', label: 'Lead saw', group: 'Synth' },
  // Pads & strings
  { value: 'gm_pad_warm', label: 'Warm pad', group: 'Pads' },
  { value: 'gm_pad_halo', label: 'Halo pad', group: 'Pads' },
  { value: 'gm_string_ensemble_1', label: 'Strings', group: 'Pads' },
  // Plucks & bells
  { value: 'gm_marimba', label: 'Marimba', group: 'Pluck & bell' },
  { value: 'gm_glockenspiel', label: 'Glockenspiel', group: 'Pluck & bell' },
  { value: 'gm_music_box', label: 'Music box', group: 'Pluck & bell' },
  { value: 'gm_vibraphone', label: 'Vibraphone', group: 'Pluck & bell' },
  // Horns & reeds
  { value: 'gm_alto_sax', label: 'Alto sax', group: 'Horns & reeds' },
  { value: 'gm_tenor_sax', label: 'Tenor sax', group: 'Horns & reeds' },
  { value: 'gm_trumpet', label: 'Trumpet', group: 'Horns & reeds' },
  { value: 'gm_muted_trumpet', label: 'Muted trumpet', group: 'Horns & reeds' },
  { value: 'gm_flute', label: 'Flute', group: 'Horns & reeds' },
  { value: 'gm_clarinet', label: 'Clarinet', group: 'Horns & reeds' },
  { value: 'gm_harmonica', label: 'Harmonica', group: 'Horns & reeds' },
  { value: 'gm_brass_section', label: 'Brass section', group: 'Horns & reeds' },
  // Color
  { value: 'gm_synth_brass_1', label: 'Synth brass', group: 'Stabs & guitar' },
  { value: 'gm_electric_guitar_clean', label: 'Clean guitar', group: 'Stabs & guitar' },
  { value: 'gm_overdriven_guitar', label: 'Distorted guitar', group: 'Stabs & guitar' },
  { value: 'gm_rock_organ', label: 'Rock organ', group: 'Stabs & guitar' },
  { value: 'gm_orchestra_hit', label: 'Orchestra hit', group: 'Stabs & guitar' },
  { value: 'gm_kalimba', label: 'Kalimba', group: 'World & percussion' },
  { value: 'gm_steel_drums', label: 'Steel drums', group: 'World & percussion' },
  { value: 'gm_taiko_drum', label: 'Taiko', group: 'World & percussion' },
  // Texture
  { value: 'pink', label: 'Pink noise', group: 'Texture' },
  { value: 'white', label: 'White noise', group: 'Texture' },
  { value: 'crackle', label: 'Crackle', group: 'Texture' },
]

export const CURATED_MELODIC_VALUES: string[] = CURATED_MELODIC_SAMPLES.map((s) => s.value)

const melodicLabelByValue = new Map(CURATED_MELODIC_SAMPLES.map((s) => [s.value, s.label]))

export function curatedMelodicLabel(value: string): string | undefined {
  return melodicLabelByValue.get(value)
}

export function curatedDrumLabel(bank: DrumBankId): string {
  const row = CURATED_DRUM_BANKS.find((d) => d.bank === bank)
  if (row) return `Drums · ${row.label}`
  const fallback = DRUM_BANK_OPTIONS.find((o) => o.value === bank)
  return fallback ? `Drums · ${fallback.label}` : 'Drums'
}

export function buildCuratedSampleOptionGroups(): Array<{
  label: string
  options: Array<{ value: string; label: string }>
}> {
  const drumGroup = {
    label: 'Drum machines',
    options: CURATED_DRUM_BANKS.map((d) => ({
      value: curatedDrumSampleId(d.bank),
      label: curatedDrumLabel(d.bank),
    })),
  }

  const groupOrder = [
    'Bass',
    'Keys',
    'Synth',
    'Pads',
    'Pluck & bell',
    'Horns & reeds',
    'Stabs & guitar',
    'World & percussion',
    'Texture',
  ]
  const byGroup = new Map<string, Array<{ value: string; label: string }>>()
  for (const s of CURATED_MELODIC_SAMPLES) {
    const list = byGroup.get(s.group) ?? []
    list.push({ value: s.value, label: s.label })
    byGroup.set(s.group, list)
  }

  const melodicGroups = groupOrder
    .filter((name) => byGroup.has(name))
    .map((name) => ({ label: name, options: byGroup.get(name)! }))

  return [drumGroup, ...melodicGroups]
}
