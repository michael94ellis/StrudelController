import type { GeneratorName, HarmonyCtx, ParamMap, ParamSchema } from '../types'
import { num, str } from '../types'

export type GeneratorDef = {
  name: GeneratorName
  label: string
  /** Which instrument kinds this generator works well with (hint only). */
  suits: string[]
  defaultParams: ParamMap
  schema: ParamSchema[]
  /** Returns a pattern expression (notes / s() / chord) WITHOUT instrument timbre. */
  generate: (ctx: HarmonyCtx, params: ParamMap) => string
}

function densify(pattern: string, density: number): string {
  // density 0–1: occasionally insert rests by replacing some hits
  if (density >= 0.95) return pattern
  // Keep as-is for now; density used by specific generators
  return pattern
}

export const generatorDefs: Record<GeneratorName, GeneratorDef> = {
  fourOnFloor: {
    name: 'fourOnFloor',
    label: 'Four-on-floor',
    suits: ['drumkit'],
    defaultParams: { density: 0.85, openHats: false },
    schema: [
      { key: 'density', type: 'slider', label: 'Density', min: 0.3, max: 1, step: 0.05 },
      { key: 'openHats', type: 'toggle', label: 'Open hats' },
    ],
    generate: (_ctx, params) => {
      const dens = num(params, 'density', 0.85)
      const open = params.openHats === true
      const kick = dens > 0.5 ? 'bd*4' : 'bd ~ bd ~'
      const snare = dens > 0.7 ? '~ sd ~ sd' : '~ sd ~ ~'
      // Prefer closed hats — `oh` sample paths are flaky across drum banks
      const hats = open
        ? densify('hh hh hh*2 hh hh hh*2 hh', dens)
        : densify('hh*8', dens)
      return `stack(s("${kick}"), s("${snare}"), s("${hats}"))`
    },
  },

  breakbeat: {
    name: 'breakbeat',
    label: 'Breakbeat',
    suits: ['drumkit'],
    defaultParams: { density: 0.75 },
    schema: [{ key: 'density', type: 'slider', label: 'Density', min: 0.4, max: 1, step: 0.05 }],
    generate: (_ctx, params) => {
      const dens = num(params, 'density', 0.75)
      const kick = dens > 0.8 ? 'bd ~ bd bd ~ bd ~ bd' : 'bd ~ ~ bd ~ bd ~ ~'
      return `stack(s("${kick}"), s("~ sd ~ [sd ~] ~ sd ~ sd"), s("hh*8"))`
    },
  },

  sparsePulse: {
    name: 'sparsePulse',
    label: 'Sparse pulse',
    suits: ['drumkit'],
    defaultParams: { density: 0.45 },
    schema: [{ key: 'density', type: 'slider', label: 'Density', min: 0.2, max: 0.8, step: 0.05 }],
    generate: (_ctx, params) => {
      const dens = num(params, 'density', 0.45)
      const kick = dens > 0.5 ? 'bd ~ ~ ~ bd ~ ~ ~' : 'bd ~ ~ ~ ~ ~ ~ ~'
      const snare = '~ ~ sd ~ ~ ~ sd ~'
      const hats = dens > 0.4 ? 'hh ~ hh ~ hh ~ hh ~' : 'hh ~ ~ ~ hh ~ ~ ~'
      return `stack(s("${kick}"), s("${snare}"), s("${hats}"))`
    },
  },

  rimHits: {
    name: 'rimHits',
    label: 'Rim hits',
    suits: ['drumkit'],
    defaultParams: { density: 0.5 },
    schema: [{ key: 'density', type: 'slider', label: 'Density', min: 0.2, max: 1, step: 0.05 }],
    generate: (_ctx, params) => {
      const dens = num(params, 'density', 0.5)
      const pat = dens > 0.7 ? 'rim ~ rim rim ~ rim ~ rim' : 'rim ~ ~ rim ~ ~ rim ~'
      return `s("${pat}")`
    },
  },

  shaker: {
    name: 'shaker',
    label: 'Shaker / hush',
    suits: ['drumkit'],
    defaultParams: { density: 0.7 },
    schema: [{ key: 'density', type: 'slider', label: 'Density', min: 0.3, max: 1, step: 0.05 }],
    generate: (_ctx, params) => {
      const dens = num(params, 'density', 0.7)
      return dens > 0.6 ? `s("sh*8")` : `s("sh ~ sh ~ sh ~ sh ~")`
    },
  },

  rootBass: {
    name: 'rootBass',
    label: 'Root bass',
    suits: ['subBass'],
    defaultParams: { octave: 2, rhythm: 'quarters' },
    schema: [
      { key: 'octave', type: 'slider', label: 'Octave', min: 1, max: 3, step: 1 },
      {
        key: 'rhythm',
        type: 'select',
        label: 'Rhythm',
        options: [
          { value: 'quarters', label: 'Quarters' },
          { value: 'half', label: 'Half notes' },
          { value: 'syncopated', label: 'Syncopated' },
        ],
      },
    ],
    generate: (ctx, params) => {
      const oct = num(params, 'octave', 2)
      const roots = ctx.roots.map((r) => r.replace(/\d+$/, String(oct))).join(' ')
      const rhythm = str(params, 'rhythm', 'quarters')
      if (rhythm === 'half') return `note("<${roots}>").struct("x ~ x ~")`
      if (rhythm === 'syncopated') return `note("<${roots}>").struct("x ~ x x ~ x ~ ~")`
      return `note("<${roots}>")`
    },
  },

  walkingBass: {
    name: 'walkingBass',
    label: 'Walking bass',
    suits: ['subBass'],
    defaultParams: { octave: 2 },
    schema: [{ key: 'octave', type: 'slider', label: 'Octave', min: 1, max: 3, step: 1 }],
    generate: (ctx, params) => {
      const oct = num(params, 'octave', 2)
      // Approach notes: root + fifth-ish walk within each bar
      const walk = ctx.triads
        .map((t) => {
          const r = t[0].replace(/\d+$/, String(oct))
          const fifth = t[2].replace(/\d+$/, String(oct))
          return `${r} ${fifth} ${r} ${fifth}`
        })
        .join(' ')
      return `note("${walk}")`
    },
  },

  chordStabs: {
    name: 'chordStabs',
    label: 'Chord stabs',
    suits: ['pluck', 'piano', 'pad'],
    defaultParams: { voicing: 'triad', rhythm: 'half' },
    schema: [
      {
        key: 'voicing',
        type: 'select',
        label: 'Voicing',
        options: [
          { value: 'triad', label: 'Triad' },
          { value: 'seventh', label: 'Seventh' },
        ],
      },
      {
        key: 'rhythm',
        type: 'select',
        label: 'Rhythm',
        options: [
          { value: 'whole', label: 'Whole' },
          { value: 'half', label: 'Half' },
          { value: 'syncopated', label: 'Syncopated' },
        ],
      },
    ],
    generate: (ctx, params) => {
      const voicing = str(params, 'voicing', 'triad')
      const rhythm = str(params, 'rhythm', 'half')
      const stacks = (voicing === 'seventh' ? ctx.sevenths : ctx.triads)
        .map((t) => `[${t.join(',')}]`)
        .join(' ')
      const struct =
        rhythm === 'whole' ? 'x' : rhythm === 'syncopated' ? 'x ~ x ~ ~ x ~ ~' : 'x ~ x ~'
      return `note("<${stacks}>").struct("${struct}")`
    },
  },

  arpUp: {
    name: 'arpUp',
    label: 'Arp up',
    suits: ['pluck', 'piano', 'bell', 'lead'],
    defaultParams: { speed: 8, octave: 4 },
    schema: [
      { key: 'speed', type: 'slider', label: 'Notes/bar', min: 4, max: 16, step: 4 },
      { key: 'octave', type: 'slider', label: 'Octave', min: 3, max: 6, step: 1 },
    ],
    generate: (ctx, params) => {
      const oct = num(params, 'octave', 4)
      const speed = num(params, 'speed', 8)
      const seq = ctx.triads
        .map((t) => {
          const notes = t.map((n) => n.replace(/\d+$/, String(oct)))
          // Repeat to fill speed
          const cycle = [...notes, notes[0]]
          while (cycle.length < speed / ctx.triads.length) cycle.push(...notes)
          return cycle.slice(0, Math.max(3, Math.floor(speed / ctx.triads.length))).join(' ')
        })
        .join(' ')
      return `note("${seq}")`
    },
  },

  melodyPhrase: {
    name: 'melodyPhrase',
    label: 'Melody phrase',
    suits: ['lead', 'bell', 'piano'],
    defaultParams: { density: 0.6, octave: 5 },
    schema: [
      { key: 'density', type: 'slider', label: 'Density', min: 0.3, max: 1, step: 0.05 },
      { key: 'octave', type: 'slider', label: 'Octave', min: 4, max: 6, step: 1 },
    ],
    generate: (ctx, params) => {
      const oct = num(params, 'octave', 5)
      const dens = num(params, 'density', 0.6)
      // Scale degrees relative to key via chord tones
      const phrase = ctx.triads
        .map((t, i) => {
          const a = t[0].replace(/\d+$/, String(oct))
          const b = t[1].replace(/\d+$/, String(oct))
          const c = t[2].replace(/\d+$/, String(oct))
          if (dens < 0.45) return i % 2 === 0 ? `${a} ~ ~ ~` : `~ ${b} ~ ~`
          if (dens < 0.7) return `${a} ~ ${b} ~ ${c} ~ ${a} ~`
          return `${a} ${b} ${c} ${a} ${b} ~ ${c} ${a}`
        })
        .join(' ')
      return `note("${phrase}")`
    },
  },

  improv: {
    name: 'improv',
    label: 'Improv (scale)',
    suits: ['lead', 'bell', 'piano'],
    defaultParams: { density: 0.55, octave: 5 },
    schema: [
      { key: 'density', type: 'slider', label: 'Density', min: 0.2, max: 1, step: 0.05 },
      { key: 'octave', type: 'slider', label: 'Octave', min: 4, max: 6, step: 1 },
    ],
    generate: (ctx, params) => {
      const oct = num(params, 'octave', 5)
      const dens = num(params, 'density', 0.55)
      const scale = `${ctx.key}:${ctx.scale}`
      const n = dens > 0.7 ? 16 : dens > 0.4 ? 8 : 4
      return `n(run(${n})).scale("${scale}").transpose(${(oct - 4) * 12})`
    },
  },

  ambientGrain: {
    name: 'ambientGrain',
    label: 'Ambient grain',
    suits: ['texture', 'pad'],
    defaultParams: {},
    schema: [],
    generate: () => `s("pink")`, // instrument render overrides for texture
  },

  chimeHits: {
    name: 'chimeHits',
    label: 'Chime hits',
    suits: ['bell'],
    defaultParams: { density: 0.4, octave: 5 },
    schema: [
      { key: 'density', type: 'slider', label: 'Density', min: 0.2, max: 0.9, step: 0.05 },
      { key: 'octave', type: 'slider', label: 'Octave', min: 4, max: 7, step: 1 },
    ],
    generate: (ctx, params) => {
      const oct = num(params, 'octave', 5)
      const dens = num(params, 'density', 0.4)
      const hits = ctx.triads
        .map((t, i) => {
          const n = t[i % t.length].replace(/\d+$/, String(oct))
          return dens > 0.6 ? `${n} ~ ~ ${n}` : `~ ${n} ~ ~`
        })
        .join(' ')
      return `note("${hits}")`
    },
  },
}

export function generatePart(name: GeneratorName, ctx: HarmonyCtx, params: ParamMap): string {
  return generatorDefs[name].generate(ctx, params)
}
