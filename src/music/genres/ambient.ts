import type { GenreModule } from './types'
import { STRAIGHT } from './helpers'

export const ambient: GenreModule = {
  id: 'ambient',
  label: 'Ambient',
  blurb: 'Minimal pulse, long pads, sparse bells. Slow harmonic drift.',
  bpm: 72,
  key: 'D',
  scale: 'major',
  swing: STRAIGHT,
  defaultProgressionId: 'drone',
  defaultChordPresetId: 'preset:drone',
  generators: {},
  layers: [
    {
      name: 'Pulse',
      kind: 'drumkit',
      instrumentParams: { bank: 'RolandTR808', gain: 0.32, crunch: 0 },
      generator: 'drumCompose',
      patternStyleIds: ['flavor:kickOne', 'flavor:hatSparse'],
    },
    {
      name: 'Sub',
      kind: 'subBass',
      instrumentParams: {
        strudelSound: 'sine',
        wave: 'sine',
        cutoff: 180,
        gain: 0.38,
        release: 0.6,
      },
      generator: 'bassCompose',
      patternStyleIds: ['bass:riff:hold', 'bass:rhythm:whole', 'bass:height:low'],
    },
    {
      name: 'Pad',
      kind: 'pad',
      instrumentParams: { strudelSound: 'gm_pad_warm', gain: 0.2, room: 0.85, cutoff: 1100 },
      generator: 'melodyCompose',
      patternStyleIds: ['mel:riff:wash', 'mel:rhythm:whole', 'mel:height:low'],
    },
    {
      name: 'Bell',
      kind: 'bell',
      instrumentParams: {
        strudelSound: 'gm_tinkle_bell',
        gain: 0.14,
        room: 0.7,
        delay: 0.35,
        cutoff: 5000,
      },
      generator: 'melodyCompose',
      patternStyleIds: ['mel:riff:chime', 'mel:rhythm:slow', 'mel:height:high'],
    },
  ],
}
