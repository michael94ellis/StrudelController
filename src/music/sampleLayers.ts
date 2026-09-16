import type { BeatLayer, InstrumentKind } from './types'
import { DRUM_BANK_OPTIONS, type DrumBankId } from './drums'
import { defaultLayer, generatorsFor, withKind } from './beats/build'
import { instrumentDefs } from './instruments/registry'
import { GM_SOUNDS, SYNTH_SOUNDS, SAMPLE_MAP_SOUNDS, DEFAULT_STRUDEL_SOUND } from './strudelSounds'

export type SampleOptionGroup = {
  label: string
  options: Array<{ value: string; label: string }>
}

const DRUM_PREFIX = 'drum:'

export function drumSampleId(bank: DrumBankId): string {
  return `${DRUM_PREFIX}${bank}`
}

export function isDrumSampleId(id: string): boolean {
  return id.startsWith(DRUM_PREFIX)
}

export function drumBankFromSampleId(id: string): DrumBankId | null {
  if (!isDrumSampleId(id)) return null
  const bank = id.slice(DRUM_PREFIX.length)
  return DRUM_BANK_OPTIONS.some((o) => o.value === bank) ? (bank as DrumBankId) : null
}

/** Pick an instrument kind that fits this Strudel `s()` name. */
export function kindForSample(sample: string): InstrumentKind {
  const s = sample.toLowerCase()
  if (s.startsWith('gm_synth_bass') || (s.includes('bass') && !s.includes('lead'))) {
    if (s.includes('guitar')) return 'guitar'
    return 'subBass'
  }
  if (s.startsWith('gm_pad') || s.includes('choir') && s.startsWith('gm_')) return 'pad'
  if (
    s.startsWith('gm_piano') ||
    s.startsWith('gm_epiano') ||
    s.startsWith('gm_harpsichord') ||
    s.startsWith('gm_clavinet') ||
    s.startsWith('gm_drawbar_organ') ||
    s.startsWith('gm_percussive_organ') ||
    s.startsWith('gm_rock_organ') ||
    s.startsWith('gm_church_organ')
  ) {
    return 'piano'
  }
  if (
    s.includes('guitar') ||
    s.startsWith('gm_banjo') ||
    s.startsWith('gm_sitar') ||
    s.startsWith('gm_shamisen') ||
    s.startsWith('gm_koto')
  ) {
    return 'guitar'
  }
  if (
    s.startsWith('gm_marimba') ||
    s.startsWith('gm_vibraphone') ||
    s.startsWith('gm_xylophone') ||
    s.startsWith('gm_glockenspiel') ||
    s.startsWith('gm_music_box') ||
    s.startsWith('gm_tinkle_bell') ||
    s.startsWith('gm_steel_drums')
  ) {
    return 'bell'
  }
  if (
    s === 'brown' ||
    s === 'pink' ||
    s === 'white' ||
    s === 'crackle' ||
    s.startsWith('gm_fx_') ||
    s.startsWith('gm_seashore') ||
    s.startsWith('gm_breath_noise')
  ) {
    return 'texture'
  }
  if (s === 'piano') return 'piano'
  if (s === 'sine' || s === 'triangle') return 'subBass'
  return 'lead'
}

export function sampleLabel(sampleId: string): string {
  if (isDrumSampleId(sampleId)) {
    const bank = drumBankFromSampleId(sampleId)
    const match = DRUM_BANK_OPTIONS.find((o) => o.value === bank)
    return match ? `Drums · ${match.label}` : 'Drums'
  }
  return sampleId
}

/** Current sample id for UI (drum bank or strudelSound). */
export function getLayerSampleId(layer: BeatLayer): string {
  if (layer.kind === 'drumkit') {
    const bank = String(layer.instrumentParams.bank ?? 'RolandTR909')
    return drumSampleId(bank as DrumBankId)
  }
  const custom = String(layer.instrumentParams.strudelSoundCustom ?? '').trim()
  if (custom) return custom
  const sound = String(layer.instrumentParams.strudelSound ?? '').trim()
  if (sound) return sound
  return DEFAULT_STRUDEL_SOUND[layer.kind] || 'sine'
}

export function layerInstrumentSchema(kind: InstrumentKind) {
  return instrumentDefs[kind].schema.filter(
    (f) => f.key !== 'strudelSound' && f.key !== 'strudelSoundCustom',
  )
}

export function applySampleToLayer(layer: BeatLayer, sampleId: string): BeatLayer {
  if (isDrumSampleId(sampleId)) {
    const bank = drumBankFromSampleId(sampleId) ?? 'RolandTR909'
    const base = withKind(layer, 'drumkit')
    const generators = generatorsFor('drumkit')
    const generator = generators.includes(base.generator) ? base.generator : generators[0]
    return {
      ...base,
      generator,
      instrumentParams: {
        ...instrumentDefs.drumkit.defaultParams,
        ...base.instrumentParams,
        bank,
        strudelSound: '',
        strudelSoundCustom: '',
      },
    }
  }

  const kind = kindForSample(sampleId)
  const base = withKind(layer, kind)
  const generators = generatorsFor(kind)
  const generator = generators.includes(base.generator) ? base.generator : generators[0]
  return {
    ...base,
    generator,
    instrumentParams: {
      ...instrumentDefs[kind].defaultParams,
      ...base.instrumentParams,
      strudelSound: sampleId,
      strudelSoundCustom: '',
    },
  }
}

export function createLayerFromSample(sampleId: string, name?: string): BeatLayer {
  const layer = defaultLayer(
    isDrumSampleId(sampleId) ? 'drumkit' : kindForSample(sampleId),
  )
  const withSample = applySampleToLayer(layer, sampleId)
  return {
    ...withSample,
    name: name ?? sampleLabel(sampleId),
  }
}

export const SAMPLE_OPTION_GROUPS: SampleOptionGroup[] = [
  {
    label: 'Drum machines',
    options: DRUM_BANK_OPTIONS.map((o) => ({
      value: drumSampleId(o.value),
      label: `Drums · ${o.label}`,
    })),
  },
  {
    label: 'Synth & noise',
    options: SYNTH_SOUNDS.map((s) => ({ value: s, label: s })),
  },
  {
    label: 'Sample maps',
    options: SAMPLE_MAP_SOUNDS.map((s) => ({ value: s, label: s })),
  },
  {
    label: 'General MIDI (GM)',
    options: GM_SOUNDS.map((s) => ({ value: s, label: s })),
  },
]

export const ALL_SAMPLE_IDS: string[] = SAMPLE_OPTION_GROUPS.flatMap((g) =>
  g.options.map((o) => o.value),
)
