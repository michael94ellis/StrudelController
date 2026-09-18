import type { GenreModule } from './types'
import { SWUNG } from './helpers'

export const breakbeat: GenreModule = {
  id: 'breakbeat',
  label: 'Breakbeat',
  blurb: 'Syncopated kick, ghost snares, fast hats. Breaks and DnB energy.',
  bpm: 174,
  key: 'F',
  scale: 'minor',
  swing: SWUNG,
  defaultProgressionId: 'minorLoop',
  defaultChordPresetId: 'preset:minor',
  generators: {},
  layers: [
    {
      name: 'Drums',
      kind: 'drumkit',
      instrumentParams: { bank: 'RolandTR909', gain: 0.82, crunch: 0.06 },
      generator: 'drumCompose',
      patternStyleIds: [
        'flavor:kickSync',
        'flavor:snareGhost',
        'flavor:hat16',
        'flavor:rim',
      ],
    },
    {
      name: 'Bass',
      kind: 'subBass',
      instrumentParams: {
        strudelSound: 'gm_synth_bass_1',
        wave: 'sawtooth',
        cutoff: 540,
        gain: 0.52,
        release: 0.1,
      },
      generator: 'bassCompose',
      patternStyleIds: ['bass:riff:ping', 'bass:rhythm:sync', 'bass:height:low'],
    },
    {
      name: 'Stab',
      kind: 'pluck',
      instrumentParams: { strudelSound: 'gm_synth_brass_1', gain: 0.3, cutoff: 3800, room: 0.2 },
      generator: 'melodyCompose',
      patternStyleIds: ['mel:riff:dyad', 'mel:rhythm:offbeat', 'mel:height:mid'],
    },
    {
      name: 'Lead',
      kind: 'lead',
      instrumentParams: {
        strudelSound: 'gm_lead_2_sawtooth',
        gain: 0.26,
        cutoff: 2600,
        delay: 0.22,
        room: 0.22,
      },
      generator: 'melodyCompose',
      patternStyleIds: ['mel:riff:arp', 'mel:rhythm:busy', 'mel:height:high'],
    },
  ],
}
