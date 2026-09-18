import type { GenreModule } from './types'
import { SWUNG } from './helpers'

export const pop: GenreModule = {
  id: 'pop',
  label: 'Pop',
  blurb: 'Straight backbeat, steady bass, singable chords. Radio-ready loop.',
  bpm: 118,
  key: 'C',
  scale: 'major',
  swing: SWUNG,
  defaultProgressionId: 'pop',
  defaultChordPresetId: 'preset:pop',
  generators: {},
  layers: [
    {
      name: 'Drums',
      kind: 'drumkit',
      instrumentParams: { bank: 'RolandTR909', gain: 0.78, crunch: 0.02 },
      generator: 'drumCompose',
      patternStyleIds: ['flavor:kick4', 'flavor:snareBack', 'flavor:hat8'],
    },
    {
      name: 'Bass',
      kind: 'subBass',
      instrumentParams: {
        strudelSound: 'gm_synth_bass_2',
        wave: 'sawtooth',
        cutoff: 480,
        gain: 0.48,
        release: 0.12,
      },
      generator: 'bassCompose',
      patternStyleIds: ['bass:riff:pulse', 'bass:rhythm:steady', 'bass:height:mid'],
    },
    {
      name: 'Keys',
      kind: 'piano',
      instrumentParams: { strudelSound: 'gm_epiano1', gain: 0.36, room: 0.45, cutoff: 2200 },
      generator: 'melodyCompose',
      patternStyleIds: ['mel:riff:strum', 'mel:rhythm:medium', 'mel:height:mid'],
    },
    {
      name: 'Hook',
      kind: 'lead',
      instrumentParams: {
        strudelSound: 'gm_lead_6_voice',
        gain: 0.24,
        room: 0.28,
        delay: 0.18,
        cutoff: 3400,
      },
      generator: 'melodyCompose',
      patternStyleIds: ['mel:riff:hook', 'mel:rhythm:medium', 'mel:height:high'],
    },
  ],
}
