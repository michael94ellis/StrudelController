import type { GenreModule } from './types'
import { notePerBar } from '../pattern'
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
      generate: (_ctx, params) => {
        const e = num(params, 'energy', 0.8)
        // 16th-feel in one cycle (8 slots ≈ 8th notes; use nested for rolls)
        const kick =
          e > 0.7
            ? 'bd ~ ~ bd ~ ~ bd ~'
            : e > 0.45
              ? 'bd ~ ~ ~ ~ ~ bd ~'
              : 'bd ~ ~ ~ ~ ~ ~ ~'
        // Snare/clap on beat 3 (half-time)
        const snare = '~ ~ ~ ~ sd ~ ~ ~'
        const hats =
          e > 0.75
            ? 'hh*16'
            : e > 0.5
              ? 'hh hh hh hh hh hh [hh hh] hh hh hh hh hh hh hh hh'
              : 'hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ hh ~'
        const hatPart = `s("${hats}").gain(1.12).hpf(280).clip(1)`
        return `stack(s("${kick}"), s("${snare}"), ${hatPart})`
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
