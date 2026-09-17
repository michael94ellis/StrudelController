import type { GenreModule } from './types'
import { drumPerBar } from '../drums'
import { notePerBar } from '../pattern'
import { isFillBar, pickBar } from '../variation'
import { num } from '../types'
import { SWUNG } from './helpers'

declare module '../types' {
  interface GeneratorNames {
    trapKit: true
    trapBass: true
  }
}

export const trap: GenreModule = {
  id: 'trap',
  label: 'Trap',
  blurb: 'Rolling hats, sparse kick, heavy sub — modern 808 pocket.',
  bpm: 140,
  key: 'C',
  scale: 'minor',
  swing: SWUNG,
  defaultProgressionId: 'journey',

  generators: {
    /** Trap: half-time snare, syncopated 808 kicks, rolling 16th hats */
    trapKit: {
      name: 'trapKit',
      label: 'Trap kit',
      suits: ['drumkit'],
      defaultParams: { energy: 0.8 },
      schema: [{ key: 'energy', type: 'slider', label: 'Energy', min: 0.3, max: 1, step: 0.05 }],
      generate: (ctx, params) => {
        const e = num(params, 'energy', 0.8)
        const kickBusy = e > 0.7 ? 'bd ~ ~ bd ~ ~ bd ~' : 'bd ~ ~ ~ ~ ~ bd ~'
        const kickSparse = 'bd ~ ~ ~ ~ ~ ~ ~'
        const snare = '~ ~ ~ ~ sd ~ ~ ~'
        const hatRoll = 'hh*16'
        const hatSync =
          'hh hh hh hh hh hh [hh hh] hh hh hh hh hh hh hh hh'
        const hatSparse = 'hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~'

        const bars = ctx.roots.map((_, i) => {
          const kick = pickBar(ctx.variation, i, [kickBusy, kickSparse, 'bd ~ ~ bd ~ ~ ~ ~'])
          let lane = `${kick}, ${snare}, `
          if (isFillBar(i)) {
            lane += pickBar(ctx.variation, i, [hatRoll, '~ sd ~ sd ~ sd sd sd', hatSync])
          } else {
            lane += pickBar(ctx.variation, i, [hatSparse, hatSync, hatRoll])
          }
          return lane
        })

        return ctx.bars > 1 ? drumPerBar(bars) : `s("${bars[0]}")`
      },
    },

    /** Trap 808: long roots with syncopated punches + octave jumps */
    trapBass: {
      name: 'trapBass',
      label: 'Trap 808',
      suits: ['subBass'],
      defaultParams: { octave: 1 },
      schema: [{ key: 'octave', type: 'slider', label: 'Octave', min: 1, max: 2, step: 1 }],
      generate: (ctx, params) => {
        const oct = num(params, 'octave', 1)
        const line = ctx.roots.map((r) => {
          const n = r.replace(/\d+$/, String(oct))
          const up = r.replace(/\d+$/, String(oct + 1))
          return `${n} ~ ~ ${n} ~ ${up} ${n} ~`
        })
        return notePerBar(line)
      },
    },
  },

  layers: [
    {
      name: 'Drums',
      kind: 'drumkit',
      instrumentParams: { bank: 'RolandTR808', gain: 0.74, crunch: 0.08 },
      generator: 'trapKit',
      params: { energy: 0.8 },
    },
    {
      name: '808',
      kind: 'subBass',
      instrumentParams: {
        strudelSound: 'sine',
        wave: 'sine',
        cutoff: 220,
        gain: 0.58,
        attack: 0.01,
        release: 0.55,
      },
      generator: 'trapBass',
      params: { octave: 1 },
    },
    {
      name: 'Pad',
      kind: 'pad',
      instrumentParams: { strudelSound: 'gm_pad_halo', gain: 0.18, room: 0.75, cutoff: 900 },
      generator: 'chordStabs',
      params: { voicing: 'triad', rhythm: 'whole' },
    },
    {
      name: 'Hook',
      kind: 'lead',
      instrumentParams: {
        strudelSound: 'gm_lead_1_square',
        wave: 'triangle',
        gain: 0.2,
        cutoff: 1800,
        delay: 0.3,
      },
      generator: 'melodyPhrase',
      params: { density: 0.3, octave: 5 },
    },
  ],
}
