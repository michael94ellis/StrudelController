import type { GenreModule } from './types'
import { notePerBar } from '../pattern'
import { num } from '../types'
import { STRAIGHT } from './helpers'

declare module '../types' {
  interface GeneratorNames {
    metalKit: true
    metalChug: true
  }
}

/** Kept as `metal` id for saved beats; UI label is Hardcore. */
export const hardcore: GenreModule = {
  id: 'metal',
  label: 'Hardcore',
  blurb: 'D-beat drive, two-step kicks, breakdown stomps — original hardcore energy.',
  bpm: 180,
  key: 'E',
  scale: 'minor',
  swing: STRAIGHT,
  defaultProgressionId: 'journey',
  generators: {
    /**
     * Hardcore kit — D-beat / two-step / breakdown using Dirt bd/sd/hh
     * (no bank dependency — audible even if 909 map fails).
     */
    metalKit: {
      name: 'metalKit',
      label: 'Hardcore kit',
      suits: ['drumkit'],
      defaultParams: { energy: 0.8 },
      schema: [{ key: 'energy', type: 'slider', label: 'Energy', min: 0.3, max: 1, step: 0.05 }],
      generate: (_ctx, params) => {
        const e = num(params, 'energy', 0.8)
        if (e < 0.45) {
          return `stack(s("bd ~ ~ ~ bd ~ ~ ~"), s("~ ~ sd ~ ~ ~ sd ~"), s("hh ~ ~ hh ~ ~ hh ~"))`
        }
        if (e < 0.7) {
          return `stack(s("bd ~ ~ bd ~ ~ bd ~"), s("~ sd ~ ~ ~ sd ~ ~"), s("hh*8"))`
        }
        const hats = e > 0.9 ? 'hh*16' : 'hh*8'
        return `stack(s("bd ~ bd bd ~ bd ~ bd"), s("~ sd ~ sd"), s("${hats}"))`
      },
    },

    /** Hardcore guitar/bass chugs — mid register so it cuts on small speakers. */
    metalChug: {
      name: 'metalChug',
      label: 'Hardcore chug',
      suits: ['subBass', 'lead', 'guitar'],
      defaultParams: { octave: 2 },
      schema: [{ key: 'octave', type: 'slider', label: 'Octave', min: 1, max: 3, step: 1 }],
      generate: (ctx, params) => {
        const oct = num(params, 'octave', 2)
        const line = ctx.roots.map((r, i) => {
          const n = r.replace(/\d+$/, String(oct))
          if (i % 2 === 0) {
            return `${n} ${n} ${n} ${n} ${n} ${n} ${n} ${n}`
          }
          return `${n} ${n} ${n} ~ ${n} ~ ${n} ${n}`
        })
        return notePerBar(line)
      },
    },
  },

  layers: [
    {
      name: 'Drums',
      kind: 'drumkit',
      instrumentParams: { source: 'dirt', gain: 0.95, crunch: 0.2 },
      generator: 'metalKit',
      params: { energy: 0.85 },
    },
    {
      name: 'Bass',
      kind: 'subBass',
      instrumentParams: {
        strudelSound: 'gm_synth_bass_2',
        wave: 'square',
        cutoff: 1100,
        gain: 0.75,
        attack: 0.001,
        release: 0.08,
        crunch: 0.35,
      },
      generator: 'metalChug',
      params: { octave: 2 },
    },
    {
      name: 'Rhythm guitar',
      kind: 'guitar',
      instrumentParams: {
        strudelSound: 'gm_distortion_guitar',
        gain: 0.75,
        cutoff: 3200,
        crunch: 0.72,
        attack: 0.001,
        release: 0.05,
      },
      generator: 'metalChug',
      params: { octave: 3 },
    },
    {
      name: 'Lead guitar',
      kind: 'guitar',
      instrumentParams: {
        strudelSound: 'gm_overdriven_guitar',
        gain: 0.55,
        cutoff: 3800,
        crunch: 0.75,
        attack: 0.001,
        release: 0.08,
      },
      generator: 'melodyPhrase',
      params: { density: 0.35, octave: 4 },
    },
  ],

  legacy: { ids: ['metal', 'hardcore'] },
}
