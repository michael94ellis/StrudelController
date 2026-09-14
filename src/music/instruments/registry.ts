import type { InstrumentKind, ParamMap, ParamSchema } from '../types'
import { bool, num, str } from '../types'
import { delayTimes } from '../theory'

export type InstrumentDef = {
  kind: InstrumentKind
  label: string
  defaultParams: ParamMap
  schema: ParamSchema[]
  /** Wrap a pitch/rhythm pattern string into a full Strudel expression. */
  render: (patternExpr: string, params: ParamMap, bpm: number) => string
}

function gainLine(params: ParamMap, key = 'gain', fallback = 0.5): string {
  return `.gain(${num(params, key, fallback).toFixed(2)})`
}

export const instrumentDefs: Record<InstrumentKind, InstrumentDef> = {
  drumkit: {
    kind: 'drumkit',
    label: 'Drum kit',
    defaultParams: { bank: 'RolandTR909', gain: 0.72, crunch: 0 },
    schema: [
      {
        key: 'bank',
        type: 'select',
        label: 'Bank',
        options: [
          { value: 'RolandTR909', label: 'TR-909' },
          { value: 'RolandTR808', label: 'TR-808' },
          { value: 'AkaiLinn', label: 'Linn' },
        ],
      },
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'crunch', type: 'slider', label: 'Crunch', min: 0, max: 0.6, step: 0.01 },
    ],
    render: (expr, params) => {
      const crunch = num(params, 'crunch', 0)
      const bank = str(params, 'bank', 'RolandTR909')
      return `${expr}.bank("${bank}")${gainLine(params, 'gain', 0.72)}${
        crunch > 0.01 ? `.distort(${crunch.toFixed(2)})` : ''
      }`
    },
  },

  subBass: {
    kind: 'subBass',
    label: 'Sub bass',
    defaultParams: { wave: 'sawtooth', cutoff: 480, gain: 0.42, attack: 0.01, release: 0.2 },
    schema: [
      {
        key: 'wave',
        type: 'select',
        label: 'Wave',
        options: [
          { value: 'sawtooth', label: 'Saw' },
          { value: 'square', label: 'Square' },
          { value: 'triangle', label: 'Triangle' },
        ],
      },
      { key: 'cutoff', type: 'slider', label: 'Cutoff', min: 120, max: 1200, step: 10 },
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'attack', type: 'slider', label: 'Attack', min: 0, max: 0.2, step: 0.005 },
      { key: 'release', type: 'slider', label: 'Release', min: 0.05, max: 0.8, step: 0.01 },
    ],
    render: (expr, params) =>
      `${expr}.s("${str(params, 'wave', 'sawtooth')}")` +
      `.attack(${num(params, 'attack', 0.01).toFixed(3)})` +
      `.release(${num(params, 'release', 0.2).toFixed(2)})` +
      `.lpf(${Math.round(num(params, 'cutoff', 480))})` +
      gainLine(params, 'gain', 0.42),
  },

  pluck: {
    kind: 'pluck',
    label: 'Pluck',
    defaultParams: {
      gain: 0.38,
      room: 0.35,
      delay: 0.22,
      delayFeedback: 0.28,
      cutoff: 2800,
    },
    schema: [
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'room', type: 'slider', label: 'Room', min: 0, max: 0.9, step: 0.01 },
      { key: 'delay', type: 'slider', label: 'Delay', min: 0, max: 0.5, step: 0.01 },
      { key: 'delayFeedback', type: 'slider', label: 'Feedback', min: 0, max: 0.7, step: 0.01 },
      { key: 'cutoff', type: 'slider', label: 'Cutoff', min: 800, max: 6000, step: 50 },
    ],
    render: (expr, params, bpm) => {
      const d = delayTimes(bpm)
      return (
        `${expr}.s("triangle")` +
        `.attack(0.004).decay(0.18).sustain(0.05).release(0.22)` +
        `.lpf(${Math.round(num(params, 'cutoff', 2800))})` +
        gainLine(params, 'gain', 0.38) +
        `.room(${num(params, 'room', 0.35).toFixed(2)})` +
        `.delay(${num(params, 'delay', 0.22).toFixed(2)})` +
        `.delaytime(${d.dotted8th.toFixed(4)})` +
        `.delayfeedback(${num(params, 'delayFeedback', 0.28).toFixed(2)})`
      )
    },
  },

  piano: {
    kind: 'piano',
    label: 'Piano',
    defaultParams: { gain: 0.36, room: 0.45, delay: 0.18 },
    schema: [
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'room', type: 'slider', label: 'Room', min: 0, max: 0.9, step: 0.01 },
      { key: 'delay', type: 'slider', label: 'Delay', min: 0, max: 0.5, step: 0.01 },
    ],
    render: (expr, params, bpm) => {
      const d = delayTimes(bpm)
      return (
        `${expr}.s("piano")` +
        `.attack(0.01).decay(0.35).sustain(0.25).release(0.8)` +
        gainLine(params, 'gain', 0.36) +
        `.room(${num(params, 'room', 0.45).toFixed(2)})` +
        `.delay(${num(params, 'delay', 0.18).toFixed(2)})` +
        `.delaytime(${d.dotted8th.toFixed(4)})` +
        `.delayfeedback(0.25)`
      )
    },
  },

  pad: {
    kind: 'pad',
    label: 'Pad',
    defaultParams: { gain: 0.28, room: 0.7, cutoff: 1600 },
    schema: [
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'room', type: 'slider', label: 'Room', min: 0, max: 0.95, step: 0.01 },
      { key: 'cutoff', type: 'slider', label: 'Cutoff', min: 400, max: 4000, step: 50 },
    ],
    render: (expr, params) =>
      `${expr}.s("sawtooth").attack(0.4).release(1.2)` +
      `.lpf(${Math.round(num(params, 'cutoff', 1600))})` +
      gainLine(params, 'gain', 0.28) +
      `.room(${num(params, 'room', 0.7).toFixed(2)})`,
  },

  lead: {
    kind: 'lead',
    label: 'Lead',
    defaultParams: { wave: 'triangle', gain: 0.32, room: 0.35, delay: 0.2, cutoff: 2200 },
    schema: [
      {
        key: 'wave',
        type: 'select',
        label: 'Wave',
        options: [
          { value: 'triangle', label: 'Triangle' },
          { value: 'square', label: 'Square' },
          { value: 'sawtooth', label: 'Saw' },
        ],
      },
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'room', type: 'slider', label: 'Room', min: 0, max: 0.9, step: 0.01 },
      { key: 'delay', type: 'slider', label: 'Delay', min: 0, max: 0.5, step: 0.01 },
      { key: 'cutoff', type: 'slider', label: 'Cutoff', min: 600, max: 5000, step: 50 },
    ],
    render: (expr, params, bpm) => {
      const d = delayTimes(bpm)
      return (
        `${expr}.s("${str(params, 'wave', 'triangle')}")` +
        `.attack(0.01).release(0.25)` +
        `.lpf(${Math.round(num(params, 'cutoff', 2200))})` +
        gainLine(params, 'gain', 0.32) +
        `.room(${num(params, 'room', 0.35).toFixed(2)})` +
        `.delay(${num(params, 'delay', 0.2).toFixed(2)})` +
        `.delaytime(${d.eighth.toFixed(4)})` +
        `.delayfeedback(0.25)`
      )
    },
  },

  bell: {
    kind: 'bell',
    label: 'Bell / chime',
    defaultParams: { gain: 0.22, room: 0.55, delay: 0.28, crunch: 0 },
    schema: [
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'room', type: 'slider', label: 'Room', min: 0, max: 0.95, step: 0.01 },
      { key: 'delay', type: 'slider', label: 'Delay', min: 0, max: 0.6, step: 0.01 },
      { key: 'crunch', type: 'slider', label: 'Crunch', min: 0, max: 0.4, step: 0.01 },
    ],
    render: (expr, params, bpm) => {
      const d = delayTimes(bpm)
      const crunch = num(params, 'crunch', 0)
      // Built-in triangle — short metallic envelope (no external fm/gm banks)
      return (
        `${expr}.s("triangle")` +
        `.attack(0.005).decay(0.25).sustain(0.02).release(0.55)` +
        `.lpf(5200)` +
        gainLine(params, 'gain', 0.22) +
        `.room(${num(params, 'room', 0.55).toFixed(2)})` +
        `.delay(${num(params, 'delay', 0.28).toFixed(2)})` +
        `.delaytime(${d.dotted8th.toFixed(4)})` +
        `.delayfeedback(0.3)` +
        (crunch > 0.01 ? `.distort(${crunch.toFixed(2)})` : '')
      )
    },
  },

  texture: {
    kind: 'texture',
    label: 'Texture',
    defaultParams: {
      mode: 'wind',
      gain: 0.18,
      room: 0.8,
      cutoff: 900,
      shimmer: false,
    },
    schema: [
      {
        key: 'mode',
        type: 'select',
        label: 'Mode',
        options: [
          { value: 'wind', label: 'Soft wind' },
          { value: 'noise', label: 'Filtered noise' },
          { value: 'drone', label: 'Low drone' },
        ],
      },
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 0.6, step: 0.01 },
      { key: 'room', type: 'slider', label: 'Room', min: 0, max: 0.95, step: 0.01 },
      { key: 'cutoff', type: 'slider', label: 'Cutoff', min: 200, max: 3000, step: 50 },
      { key: 'shimmer', type: 'toggle', label: 'Shimmer' },
    ],
    render: (_expr, params) => {
      const mode = str(params, 'mode', 'wind')
      const shimmer = bool(params, 'shimmer', false)
      const cut = Math.round(num(params, 'cutoff', 900))
      const g = gainLine(params, 'gain', 0.18)
      const room = `.room(${num(params, 'room', 0.8).toFixed(2)})`
      if (mode === 'drone') {
        return `note("c2").s("sawtooth").attack(1).release(2).lpf(${cut})${g}${room}`
      }
      if (mode === 'noise') {
        // Dirt-Samples crackle — already loaded
        return `s("crackle*2").density(0.04)${g}${room}${
          shimmer ? '.delay(0.3).delayfeedback(0.4)' : ''
        }`
      }
      // Soft filtered sine bed instead of pink noise (not always available)
      return `note("c3").s("sine").attack(1.2).release(2).lpf(${Math.min(cut, 600)})${g}${room}${
        shimmer ? '.delay(0.25).delayfeedback(0.35)' : ''
      }`
    },
  },
}

export function createInstrument(kind: InstrumentKind, name?: string, params?: ParamMap) {
  const def = instrumentDefs[kind]
  return {
    id: '',
    name: name ?? def.label,
    kind,
    params: { ...def.defaultParams, ...params },
  }
}

export function renderInstrument(
  kind: InstrumentKind,
  patternExpr: string,
  params: ParamMap,
  bpm: number,
): string {
  return instrumentDefs[kind].render(patternExpr, params, bpm)
}
