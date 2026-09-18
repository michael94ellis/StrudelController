import type { GenreModule } from './types'
import { SWUNG } from './helpers'

export const funk: GenreModule = {
  id: 'funk',
  label: 'Funky horns',
  blurb: 'Brass section hits, trumpet shots, and a pushing backbeat. Horn-forward energy.',
  bpm: 116,
  key: 'E',
  scale: 'minor',
  swing: SWUNG,
  defaultProgressionId: 'vamp',
  defaultChordPresetId: 'preset:vamp',
  generators: {},
  legacy: { ids: ['jazz'] },
  layers: [
    {
      name: 'Drums',
      kind: 'drumkit',
      instrumentParams: { bank: 'RolandTR909', gain: 0.8, crunch: 0.05 },
      generator: 'drumCompose',
      patternStyleIds: [
        'flavor:kick4',
        'flavor:snareBack',
        'flavor:clap',
        'flavor:hat8',
        'flavor:shaker',
      ],
    },
    {
      name: 'Bass',
      kind: 'subBass',
      instrumentParams: {
        strudelSound: 'gm_electric_bass_finger',
        wave: 'triangle',
        cutoff: 420,
        gain: 0.3,
        release: 0.2,
      },
      generator: 'bassCompose',
      patternStyleIds: ['bass:riff:pulse', 'bass:rhythm:steady', 'bass:height:low'],
    },
    {
      name: 'Section',
      kind: 'pluck',
      instrumentParams: {
        strudelSound: 'gm_brass_section',
        gain: 0.48,
        cutoff: 4200,
        room: 0.28,
        attack: 0.008,
        release: 0.12,
      },
      generator: 'melodyCompose',
      patternStyleIds: ['mel:riff:strum', 'mel:rhythm:offbeat', 'mel:height:mid'],
    },
    {
      name: 'Stabs',
      kind: 'lead',
      instrumentParams: {
        strudelSound: 'gm_synth_brass_1',
        wave: 'sawtooth',
        gain: 0.42,
        cutoff: 4800,
        room: 0.2,
      },
      generator: 'melodyCompose',
      patternStyleIds: ['mel:riff:dyad', 'mel:rhythm:busy', 'mel:height:mid'],
    },
    {
      name: 'Shots',
      kind: 'bell',
      instrumentParams: {
        strudelSound: 'gm_trumpet',
        gain: 0.4,
        cutoff: 5200,
        room: 0.32,
        delay: 0.08,
      },
      generator: 'melodyCompose',
      patternStyleIds: ['mel:riff:hook', 'mel:rhythm:sync', 'mel:height:high'],
    },
  ],
}
