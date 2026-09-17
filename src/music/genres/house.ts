import type { GenreModule } from './types'
import { num } from '../types'
import { drumPerBar } from '../drums'
import { notePerBarStruct } from '../pattern'
import { isFillBar, pickBar } from '../variation'
import { SWUNG } from './helpers'

declare module '../types' {
  interface GeneratorNames {
    houseKit: true
    houseBass: true
    houseStabs: true
  }
}

/**
 * Festival / club house — four-on-floor, pump bass, gated stabs, bright lead.
 * Aimed at EDM dancefloor energy rather than soft disco house.
 */
export const house: GenreModule = {
  id: 'house',
  label: 'House',
  blurb: 'Four-on-floor, pump bass, gated stabs. Club EDM energy.',
  bpm: 128,
  key: 'A',
  scale: 'minor',
  swing: SWUNG,
  defaultProgressionId: 'anthem',

  generators: {
    /** Club kit: 4-on-floor kick, clap on 2/4, straight 8th hats (no ghost kicks / offbeat lanes). */
    houseKit: {
      name: 'houseKit',
      label: 'House kit',
      suits: ['drumkit'],
      defaultParams: { energy: 0.85 },
      schema: [{ key: 'energy', type: 'slider', label: 'Energy', min: 0.3, max: 1, step: 0.05 }],
      generate: (ctx, params) => {
        const e = num(params, 'energy', 0.85)
        const kick = 'bd*4'
        const clap = e > 0.4 ? '~ cp ~ cp' : '~ cp ~ ~'
        const hatLight = '~ ~ ~ ~ hh ~ ~ ~'
        const hat8ths = 'hh ~ hh ~ hh ~ hh ~'
        const hatDense = e > 0.75 ? 'hh*8' : hat8ths

        const bars = ctx.roots.map((_, i) => {
          if (isFillBar(i)) {
            const fillClap = pickBar(ctx.variation, i, [
              '~ cp ~ cp ~ cp cp cp',
              '~ ~ cp cp ~ ~ cp cp',
            ])
            const fillHat = pickBar(ctx.variation, i, [hat8ths, hatDense])
            return `${kick}, ${fillClap}, ${fillHat}`
          }
          const hats = pickBar(ctx.variation, i, [hat8ths, hatDense, hatLight])
          return `${kick}, ${clap}, ${hats}`
        })

        return ctx.bars > 1 ? drumPerBar(bars) : `s("${bars[0]}")`
      },
    },

    /** Sidechain-style pump: short roots on the offbeats */
    houseBass: {
      name: 'houseBass',
      label: 'House bass',
      suits: ['subBass'],
      defaultParams: { octave: 2 },
      schema: [{ key: 'octave', type: 'slider', label: 'Octave', min: 1, max: 3, step: 1 }],
      generate: (ctx, params) => {
        const oct = num(params, 'octave', 2)
        const roots = ctx.roots.map((r) => r.replace(/\d+$/, String(oct)))
        return notePerBarStruct(roots, '~ x ~ x ~ x ~ x')
      },
    },

    /** Gated EDM chord stabs — short punches, not pads */
    houseStabs: {
      name: 'houseStabs',
      label: 'House stabs',
      suits: ['pluck', 'lead', 'pad'],
      defaultParams: { octave: 4, density: 0.7 },
      schema: [
        { key: 'octave', type: 'slider', label: 'Octave', min: 3, max: 5, step: 1 },
        { key: 'density', type: 'slider', label: 'Density', min: 0.3, max: 1, step: 0.05 },
      ],
      generate: (ctx, params) => {
        const oct = num(params, 'octave', 4)
        const dens = num(params, 'density', 0.7)
        const stacks = ctx.triads
          .map((t) => {
            const notes = t.map((n) => n.replace(/\d+$/, String(oct)))
            return `[${notes.join(',')}]`
          })
          .join(' ')
        const struct =
          dens < 0.45
            ? '~ x ~ ~ ~ x ~ ~'
            : dens < 0.7
              ? '~ x ~ x ~ x ~ ~'
              : '~ x ~ x ~ x ~ x'
        return `note("<${stacks}>").struct("${struct}")`
      },
    },
  },

  layers: [
    {
      name: 'Drums',
      kind: 'drumkit',
      instrumentParams: { bank: 'RolandTR909', gain: 0.88, crunch: 0.04 },
      generator: 'houseKit',
      params: { energy: 0.85 },
    },
    {
      name: 'Bass',
      kind: 'subBass',
      instrumentParams: {
        strudelSound: 'gm_synth_bass_1',
        wave: 'sawtooth',
        cutoff: 620,
        gain: 0.55,
        attack: 0.002,
        release: 0.08,
      },
      generator: 'houseBass',
      params: { octave: 2 },
    },
    {
      name: 'Pad',
      kind: 'pad',
      instrumentParams: { strudelSound: 'gm_pad_warm', gain: 0.16, room: 0.65, cutoff: 1400 },
      generator: 'chordStabs',
      params: { voicing: 'triad', rhythm: 'whole' },
    },
    {
      name: 'Stabs',
      kind: 'pluck',
      instrumentParams: {
        strudelSound: 'gm_synth_brass_1',
        gain: 0.34,
        room: 0.18,
        cutoff: 4200,
        delay: 0.06,
        delayFeedback: 0.12,
      },
      generator: 'houseStabs',
      params: { octave: 4, density: 0.7 },
    },
    {
      name: 'Hook',
      kind: 'lead',
      instrumentParams: {
        strudelSound: 'gm_lead_2_sawtooth',
        wave: 'sawtooth',
        gain: 0.22,
        cutoff: 2800,
        delay: 0.28,
        room: 0.25,
      },
      generator: 'arpUp',
      params: { speed: 16, octave: 5 },
    },
  ],
}
