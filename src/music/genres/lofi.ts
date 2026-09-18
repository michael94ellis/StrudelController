import type { GenreModule } from './types'
import { drumMini } from '../drums'
import { num } from '../types'
import { SWUNG } from './helpers'

declare module '../types' {
  interface GeneratorNames {
    lofiKit: true
    lofiKeys: true
  }
}

export const lofi: GenreModule = {
  id: 'lofi',
  label: 'Lo-fi',
  blurb: 'Dusty drums, warm keys, vinyl air. Study-beat calm.',
  bpm: 84,
  key: 'Bb',
  scale: 'major',
  swing: SWUNG,
  defaultProgressionId: 'soft',
  defaultChordPresetId: 'preset:soft',

  generators: {
    /** Lo-fi / dusty boom-bap pocket */
    lofiKit: {
      name: 'lofiKit',
      label: 'Lo-fi kit',
      suits: ['drumkit'],
      defaultParams: { energy: 0.55 },
      schema: [{ key: 'energy', type: 'slider', label: 'Energy', min: 0.2, max: 1, step: 0.05 }],
      generate: (_ctx, params) => {
        const e = num(params, 'energy', 0.55)
        // Kick on 1 + "and of 2"; snare on 2 and 4
        const kick = e > 0.6 ? 'bd ~ ~ bd ~ ~ bd ~' : 'bd ~ ~ ~ bd ~ ~ ~'
        const snare = '~ sd ~ ~ ~ sd ~ ~'
        const hats =
          e > 0.65
            ? 'hh ~ hh hh ~ hh ~ hh'
            : e > 0.4
              ? 'hh ~ hh ~ hh ~ hh ~'
              : 'hh ~ ~ ~ hh ~ ~ ~'
        return drumMini(kick, snare, hats)
      },
    },

    /** Soft lo-fi piano: sustained sevenths + sparse top */
    lofiKeys: {
      name: 'lofiKeys',
      label: 'Lo-fi keys',
      suits: ['piano', 'pad', 'pluck'],
      defaultParams: { octave: 3 },
      schema: [{ key: 'octave', type: 'slider', label: 'Octave', min: 2, max: 5, step: 1 }],
      generate: (ctx, params) => {
        const oct = num(params, 'octave', 3)
        const stacks = ctx.sevenths
          .map((t) => {
            const notes = t.map((n) => n.replace(/\d+$/, (m) => String(Number(m) - 4 + oct)))
            return `[${notes.join(',')}]`
          })
          .join(' ')
        // Long holds with a late ghost stab
        return `note("<${stacks}>").struct("x ~ ~ ~ ~ x ~ ~")`
      },
    },
  },

  layers: [
    {
      name: 'Drums',
      kind: 'drumkit',
      instrumentParams: { bank: 'AkaiLinn', gain: 0.42, crunch: 0.18 },
      generator: 'drumCompose',
      patternStyleIds: [
        'flavor:kick2',
        'flavor:snareBack',
        'flavor:hatSparse',
        'flavor:shakerOff',
      ],
    },
    {
      name: 'Bass',
      kind: 'subBass',
      instrumentParams: {
        strudelSound: 'gm_electric_bass_finger',
        wave: 'triangle',
        cutoff: 320,
        gain: 0.32,
        release: 0.35,
      },
      generator: 'bassCompose',
      patternStyleIds: ['bass:riff:walk', 'bass:rhythm:half', 'bass:height:low'],
    },
    {
      name: 'Keys',
      kind: 'piano',
      instrumentParams: { strudelSound: 'gm_epiano1', gain: 0.38, room: 0.6, delay: 0.22 },
      generator: 'melodyCompose',
      patternStyleIds: ['mel:riff:wash', 'mel:rhythm:slow', 'mel:height:mid'],
    },
    {
      name: 'Dust',
      kind: 'texture',
      instrumentParams: {
        strudelSound: 'crackle',
        mode: 'noise',
        gain: 0.06,
        room: 0.85,
        cutoff: 600,
        shimmer: true,
      },
      generator: 'melodyCompose',
      patternStyleIds: ['mel:riff:chime', 'mel:rhythm:slow', 'mel:height:high'],
    },
  ],
}
