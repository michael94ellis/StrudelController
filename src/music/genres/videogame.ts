import type { GenreModule } from './types'
import { drumMini } from '../drums'
import { notePerBar } from '../pattern'
import { num } from '../types'
import { SWUNG } from './helpers'

declare module '../types' {
  interface GeneratorNames {
    chiptuneKit: true
    chiptuneArp: true
  }
}

export const videogame: GenreModule = {
  id: 'videogame',
  label: 'Video game',
  blurb: 'Bright chimes, plucked chords, soft kit — cozy adventure energy.',
  bpm: 96,
  key: 'F',
  scale: 'major',
  swing: SWUNG,
  defaultProgressionId: 'journey',

  generators: {
    /** Bright adventure / RPG town drums */
    chiptuneKit: {
      name: 'chiptuneKit',
      label: 'Chiptune kit',
      suits: ['drumkit'],
      defaultParams: { energy: 0.55 },
      schema: [{ key: 'energy', type: 'slider', label: 'Energy', min: 0.2, max: 1, step: 0.05 }],
      generate: (_ctx, params) => {
        const e = num(params, 'energy', 0.55)
        const kick = e > 0.65 ? 'bd ~ bd ~ bd ~ bd ~' : 'bd ~ ~ ~ bd ~ ~ ~'
        const snare = '~ ~ sd ~ ~ ~ sd ~'
        const hats = e > 0.6 ? 'hh*8' : 'hh ~ hh ~ hh ~ hh ~'
        return drumMini(kick, snare, hats)
      },
    },

    /** Video-game style arp: 1–5–8–5 loop (idiomatic, not a specific tune) */
    chiptuneArp: {
      name: 'chiptuneArp',
      label: 'Chiptune arp',
      suits: ['pluck', 'lead', 'bell', 'piano'],
      defaultParams: { octave: 4 },
      schema: [{ key: 'octave', type: 'slider', label: 'Octave', min: 3, max: 6, step: 1 }],
      generate: (ctx, params) => {
        const oct = num(params, 'octave', 4)
        const seq = ctx.triads.map((t) => {
          const r = t[0].replace(/\d+$/, String(oct))
          const fifth = t[2].replace(/\d+$/, String(oct))
          const top = t[0].replace(/\d+$/, String(oct + 1))
          return `${r} ${fifth} ${top} ${fifth} ${r} ${fifth} ${top} ${fifth}`
        })
        return notePerBar(seq)
      },
    },
  },

  layers: [
    {
      name: 'Drums',
      kind: 'drumkit',
      instrumentParams: { bank: 'RolandTR909', gain: 0.48, crunch: 0 },
      generator: 'chiptuneKit',
      params: { energy: 0.55 },
    },
    {
      name: 'Bass',
      kind: 'subBass',
      instrumentParams: {
        strudelSound: 'square',
        wave: 'square',
        cutoff: 520,
        gain: 0.32,
        attack: 0.01,
        release: 0.15,
      },
      generator: 'rootBass',
      params: { rhythm: 'quarters', octave: 2 },
    },
    {
      name: 'Arp',
      kind: 'pluck',
      instrumentParams: {
        strudelSound: 'gm_lead_1_square',
        gain: 0.3,
        room: 0.35,
        delay: 0.2,
        cutoff: 3000,
      },
      generator: 'chiptuneArp',
      params: { octave: 4 },
    },
    {
      name: 'Melody',
      kind: 'lead',
      instrumentParams: {
        strudelSound: 'gm_music_box',
        wave: 'square',
        gain: 0.26,
        cutoff: 3200,
        room: 0.3,
        delay: 0.18,
      },
      generator: 'melodyPhrase',
      params: { density: 0.55, octave: 5 },
    },
    {
      name: 'Air',
      kind: 'texture',
      instrumentParams: { strudelSound: 'pink', mode: 'wind', gain: 0.08, room: 0.8, cutoff: 450 },
      generator: 'ambientGrain',
    },
  ],
}
