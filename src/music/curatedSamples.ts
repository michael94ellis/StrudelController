import { DRUM_BANK_OPTIONS, type DrumBankId } from './drums'

const DRUM_SAMPLE_PREFIX = 'drum:'
function curatedDrumSampleId(bank: DrumBankId): string {
  return `${DRUM_SAMPLE_PREFIX}${bank}`
}

export type CuratedMelodicSample = { value: string; label: string; group: string }

/**
 * Melodic / noise picks, grouped for the sample browser.
 * Group labels are the top-level “list of lists” categories.
 */
export const CURATED_MELODIC_SAMPLES: CuratedMelodicSample[] = [
  // Bass
  { value: 'sine', label: 'Sine', group: 'Bass' },
  { value: 'triangle', label: 'Triangle', group: 'Bass' },
  { value: 'gm_synth_bass_1', label: 'Synth bass 1', group: 'Bass' },
  { value: 'gm_synth_bass_2', label: 'Synth bass 2', group: 'Bass' },
  { value: 'gm_electric_bass_finger', label: 'Electric bass', group: 'Bass' },
  { value: 'gm_acoustic_bass', label: 'Acoustic bass', group: 'Bass' },
  // Keys
  { value: 'piano', label: 'Piano (samples)', group: 'Keys' },
  { value: 'gm_piano', label: 'Grand piano', group: 'Keys' },
  { value: 'gm_epiano1', label: 'Rhodes / EP', group: 'Keys' },
  { value: 'gm_clavinet', label: 'Clavinet', group: 'Keys' },
  { value: 'gm_rock_organ', label: 'Rock organ', group: 'Keys' },
  // Synths
  { value: 'sawtooth', label: 'Saw', group: 'Synths' },
  { value: 'square', label: 'Square', group: 'Synths' },
  { value: 'supersaw', label: 'Supersaw', group: 'Synths' },
  { value: 'gm_lead_1_square', label: 'Lead square', group: 'Synths' },
  { value: 'gm_lead_2_sawtooth', label: 'Lead saw', group: 'Synths' },
  { value: 'gm_synth_brass_1', label: 'Synth brass', group: 'Synths' },
  // Pads
  { value: 'gm_pad_warm', label: 'Warm pad', group: 'Pads' },
  { value: 'gm_pad_halo', label: 'Halo pad', group: 'Pads' },
  { value: 'gm_choir_aahs', label: 'Choir', group: 'Pads' },
  // Strings
  { value: 'gm_string_ensemble_1', label: 'String ensemble', group: 'Strings' },
  { value: 'gm_cello', label: 'Cello', group: 'Strings' },
  { value: 'gm_violin', label: 'Violin', group: 'Strings' },
  { value: 'gm_pizzicato_strings', label: 'Pizzicato', group: 'Strings' },
  // Horns
  { value: 'gm_alto_sax', label: 'Alto sax', group: 'Horns' },
  { value: 'gm_tenor_sax', label: 'Tenor sax', group: 'Horns' },
  { value: 'gm_trumpet', label: 'Trumpet', group: 'Horns' },
  { value: 'gm_muted_trumpet', label: 'Muted trumpet', group: 'Horns' },
  { value: 'gm_french_horn', label: 'French horn', group: 'Horns' },
  { value: 'gm_brass_section', label: 'Brass section', group: 'Horns' },
  { value: 'gm_flute', label: 'Flute', group: 'Horns' },
  { value: 'gm_clarinet', label: 'Clarinet', group: 'Horns' },
  { value: 'gm_harmonica', label: 'Harmonica', group: 'Horns' },
  // Pluck & bells
  { value: 'gm_marimba', label: 'Marimba', group: 'Pluck & bells' },
  { value: 'gm_glockenspiel', label: 'Glockenspiel', group: 'Pluck & bells' },
  { value: 'gm_music_box', label: 'Music box', group: 'Pluck & bells' },
  { value: 'gm_vibraphone', label: 'Vibraphone', group: 'Pluck & bells' },
  { value: 'gm_kalimba', label: 'Kalimba', group: 'Pluck & bells' },
  // Guitar
  { value: 'gm_electric_guitar_clean', label: 'Clean guitar', group: 'Guitar' },
  { value: 'gm_overdriven_guitar', label: 'Distorted guitar', group: 'Guitar' },
  { value: 'gm_acoustic_guitar_nylon', label: 'Nylon guitar', group: 'Guitar' },
  { value: 'gm_orchestra_hit', label: 'Orchestra hit', group: 'Guitar' },
  // World
  { value: 'gm_steel_drums', label: 'Steel drums', group: 'World' },
  { value: 'gm_taiko_drum', label: 'Taiko', group: 'World' },
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
  const row = DRUM_BANK_OPTIONS.find((d) => d.value === bank)
  return row ? row.label : 'Drums'
}

/** Top-level order for the sample browser (list of lists). */
export const SAMPLE_CATEGORY_ORDER = [
  'Drums',
  'Bass',
  'Keys',
  'Synths',
  'Pads',
  'Strings',
  'Horns',
  'Pluck & bells',
  'Guitar',
  'World',
  'Texture',
] as const

export function buildCuratedSampleOptionGroups(): Array<{
  label: string
  options: Array<{ value: string; label: string }>
}> {
  const drumGroup = {
    label: 'Drums',
    options: DRUM_BANK_OPTIONS.map((d) => ({
      value: curatedDrumSampleId(d.value),
      label: curatedDrumLabel(d.value),
    })),
  }

  const byGroup = new Map<string, Array<{ value: string; label: string }>>()
  for (const s of CURATED_MELODIC_SAMPLES) {
    const list = byGroup.get(s.group) ?? []
    list.push({ value: s.value, label: s.label })
    byGroup.set(s.group, list)
  }

  const melodicGroups = SAMPLE_CATEGORY_ORDER.filter(
    (name) => name !== 'Drums' && byGroup.has(name),
  ).map((name) => ({ label: name, options: byGroup.get(name)! }))

  return [drumGroup, ...melodicGroups]
}
