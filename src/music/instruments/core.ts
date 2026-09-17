import type { InstrumentKind, ParamMap, ParamSchema } from '../types'
import { bool, num, str } from '../types'
import {
  DEFAULT_STRUDEL_SOUND,
  pickStrudelSound,
  STRUDEL_SOUND_CUSTOM_SCHEMA,
  STRUDEL_SOUND_SCHEMA,
} from '../strudelSounds'
import { delayTimes } from '../theory'
import { getDrumPlayback } from '../../audio/strudelEngine'

export type InstrumentDef = {
  kind: InstrumentKind
  label: string
  defaultParams: ParamMap
  schema: ParamSchema[]
  /** Wrap a pitch/rhythm pattern string into a full Strudel expression. */
  render: (patternExpr: string, params: ParamMap, bpm: number) => string
}

/** Partial registry — what a module (core or genre) contributes. */
export type InstrumentTable = Partial<Record<InstrumentKind, InstrumentDef>>

export function gainLine(params: ParamMap, key = 'gain', fallback = 0.5): string {
  return `.gain(${num(params, key, fallback).toFixed(2)})`
}

/**
 * Genre-agnostic instrument kinds. Kinds that only one genre needs
 * (e.g. hardcore's distorted guitar) live in that genre's module.
 */
export const coreInstruments = {
  drumkit: {
    kind: 'drumkit',
    label: 'Drum kit',
    defaultParams: { bank: 'RolandTR909', gain: 0.72, crunch: 0 },
    schema: [
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.05 },
      { key: 'crunch', type: 'slider', label: 'Crunch', min: 0, max: 0.6, step: 0.1 },
    ],
    render: (expr, params) => {
      const crunch = num(params, 'crunch', 0)
      const source = str(params, 'source', '')
      const drums = getDrumPlayback()
      // Prefer aliased bd/sd/hh (what prebake registers). `.bank()` is only used when
      // explicitly requested and we know machine-map playback is active.
      const useBank = source === 'bank' && drums?.mode === 'bank'
      if (!useBank) {
        return `${expr}${gainLine(params, 'gain', 0.85)}.room(0.08)${
          crunch > 0.01 ? `.distort(${crunch.toFixed(2)})` : ''
        }`
      }
      const bank = drums?.bank ?? str(params, 'bank', 'RolandTR909')
      return `${expr}.bank("${bank}")${gainLine(params, 'gain', 0.72)}.room(0.12)${
        crunch > 0.01 ? `.distort(${crunch.toFixed(2)})` : ''
      }`
    },
  },

  subBass: {
    kind: 'subBass',
    label: 'Sub bass',
    defaultParams: {
      strudelSound: DEFAULT_STRUDEL_SOUND.subBass,
      wave: 'sawtooth',
      cutoff: 480,
      gain: 0.42,
      attack: 0.015,
      release: 0.35,
    },
    schema: [
      STRUDEL_SOUND_SCHEMA,
      STRUDEL_SOUND_CUSTOM_SCHEMA,
      {
        key: 'wave',
        type: 'select',
        label: 'Wave',
        options: [
          { value: 'sawtooth', label: 'Saw' },
          { value: 'square', label: 'Square' },
          { value: 'triangle', label: 'Triangle' },
          { value: 'sine', label: 'Sine' },
        ],
      },
      { key: 'cutoff', type: 'slider', label: 'Cutoff', min: 120, max: 1200, step: 10 },
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'attack', type: 'slider', label: 'Attack', min: 0, max: 0.2, step: 0.005 },
      { key: 'release', type: 'slider', label: 'Release', min: 0.05, max: 0.8, step: 0.01 },
    ],
    render: (expr, params) => {
      const crunch = num(params, 'crunch', 0)
      const sound = pickStrudelSound(params, str(params, 'wave', DEFAULT_STRUDEL_SOUND.subBass))
      return (
        `${expr}.s("${sound}")` +
        `.attack(${num(params, 'attack', 0.015).toFixed(3)})` +
        `.decay(0.08).sustain(0.35)` +
        `.release(${num(params, 'release', 0.35).toFixed(2)})` +
        `.lpf(${Math.round(num(params, 'cutoff', 480))})` +
        `.hpf(35)` +
        (crunch > 0.01 ? `.distort(${crunch.toFixed(2)})` : '') +
        gainLine(params, 'gain', 0.42)
      )
    },
  },

  pluck: {
    kind: 'pluck',
    label: 'Pluck',
    defaultParams: {
      strudelSound: DEFAULT_STRUDEL_SOUND.pluck,
      gain: 0.38,
      room: 0.35,
      delay: 0.22,
      delayFeedback: 0.28,
      cutoff: 2800,
    },
    schema: [
      STRUDEL_SOUND_SCHEMA,
      STRUDEL_SOUND_CUSTOM_SCHEMA,
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'room', type: 'slider', label: 'Room', min: 0, max: 0.9, step: 0.01 },
      { key: 'delay', type: 'slider', label: 'Delay', min: 0, max: 0.5, step: 0.01 },
      { key: 'delayFeedback', type: 'slider', label: 'Feedback', min: 0, max: 0.7, step: 0.01 },
      { key: 'cutoff', type: 'slider', label: 'Cutoff', min: 800, max: 6000, step: 50 },
    ],
    render: (expr, params, bpm) => {
      const d = delayTimes(bpm)
      const sound = pickStrudelSound(params, DEFAULT_STRUDEL_SOUND.pluck)
      return (
        `${expr}.s("${sound}")` +
        `.attack(0.001).decay(0.1).sustain(0.02).release(0.08)` +
        `.lpf(${Math.round(num(params, 'cutoff', 3200))})` +
        `.hpf(200)` +
        gainLine(params, 'gain', 0.4) +
        `.room(${Math.min(0.35, num(params, 'room', 0.2)).toFixed(2)})` +
        `.delay(${num(params, 'delay', 0.12).toFixed(2)})` +
        `.delaytime(${d.dotted8th.toFixed(4)})` +
        `.delayfeedback(${num(params, 'delayFeedback', 0.2).toFixed(2)})`
      )
    },
  },

  piano: {
    kind: 'piano',
    label: 'Piano',
    defaultParams: {
      strudelSound: DEFAULT_STRUDEL_SOUND.piano,
      gain: 0.36,
      room: 0.45,
      delay: 0.18,
    },
    schema: [
      STRUDEL_SOUND_SCHEMA,
      STRUDEL_SOUND_CUSTOM_SCHEMA,
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'room', type: 'slider', label: 'Room', min: 0, max: 0.9, step: 0.01 },
      { key: 'delay', type: 'slider', label: 'Delay', min: 0, max: 0.5, step: 0.01 },
    ],
    render: (expr, params, bpm) => {
      const d = delayTimes(bpm)
      const sound = pickStrudelSound(params, DEFAULT_STRUDEL_SOUND.piano)
      return (
        `${expr}.s("${sound}")` +
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
    defaultParams: {
      strudelSound: DEFAULT_STRUDEL_SOUND.pad,
      gain: 0.28,
      room: 0.7,
      cutoff: 1600,
    },
    schema: [
      STRUDEL_SOUND_SCHEMA,
      STRUDEL_SOUND_CUSTOM_SCHEMA,
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'room', type: 'slider', label: 'Room', min: 0, max: 0.95, step: 0.01 },
      { key: 'cutoff', type: 'slider', label: 'Cutoff', min: 400, max: 4000, step: 50 },
    ],
    render: (expr, params) => {
      const sound = pickStrudelSound(params, DEFAULT_STRUDEL_SOUND.pad)
      return (
        `${expr}.s("${sound}").attack(0.5).release(1.6)` +
      `.lpf(${Math.round(num(params, 'cutoff', 1600))})` +
      gainLine(params, 'gain', 0.28) +
      `.room(${num(params, 'room', 0.7).toFixed(2)})`
      )
    },
  },

  lead: {
    kind: 'lead',
    label: 'Lead',
    defaultParams: {
      strudelSound: DEFAULT_STRUDEL_SOUND.lead,
      wave: 'square',
      gain: 0.38,
      room: 0.2,
      delay: 0.12,
      cutoff: 2800,
    },
    schema: [
      STRUDEL_SOUND_SCHEMA,
      STRUDEL_SOUND_CUSTOM_SCHEMA,
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
      const sound = pickStrudelSound(params, str(params, 'wave', DEFAULT_STRUDEL_SOUND.lead))
      return (
        `${expr}.s("${sound}")` +
        `.attack(0.005).decay(0.1).sustain(0.3).release(0.15)` +
        `.lpf(${Math.round(num(params, 'cutoff', 2800))})` +
        `.hpf(150)` +
        gainLine(params, 'gain', 0.38) +
        `.room(${Math.min(0.4, num(params, 'room', 0.2)).toFixed(2)})` +
        `.delay(${num(params, 'delay', 0.12).toFixed(2)})` +
        `.delaytime(${d.eighth.toFixed(4)})` +
        `.delayfeedback(0.2)`
      )
    },
  },

  bell: {
    kind: 'bell',
    label: 'Bell / chime',
    defaultParams: {
      strudelSound: DEFAULT_STRUDEL_SOUND.bell,
      gain: 0.22,
      room: 0.55,
      delay: 0.28,
      crunch: 0,
    },
    schema: [
      STRUDEL_SOUND_SCHEMA,
      STRUDEL_SOUND_CUSTOM_SCHEMA,
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'room', type: 'slider', label: 'Room', min: 0, max: 0.95, step: 0.01 },
      { key: 'delay', type: 'slider', label: 'Delay', min: 0, max: 0.6, step: 0.01 },
      { key: 'crunch', type: 'slider', label: 'Crunch', min: 0, max: 0.4, step: 0.01 },
    ],
    render: (expr, params, bpm) => {
      const d = delayTimes(bpm)
      const crunch = num(params, 'crunch', 0)
      const sound = pickStrudelSound(params, DEFAULT_STRUDEL_SOUND.bell)
      return (
        `${expr}.s("${sound}")` +
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

  guitar: {
    kind: 'guitar',
    label: 'Guitar / strings',
    defaultParams: {
      strudelSound: DEFAULT_STRUDEL_SOUND.guitar,
      tone: 'strumstick',
      gain: 0.42,
      cutoff: 3200,
      crunch: 0.35,
      attack: 0.003,
      release: 0.12,
    },
    schema: [
      STRUDEL_SOUND_SCHEMA,
      STRUDEL_SOUND_CUSTOM_SCHEMA,
      {
        key: 'tone',
        type: 'select',
        label: 'Sound',
        options: [
          { value: 'strumstick', label: 'Acoustic (VCSL strumstick)' },
          { value: 'harp', label: 'Harp (VCSL)' },
          { value: 'sax', label: 'Sax (VCSL)' },
          { value: 'harmonica', label: 'Harmonica (VCSL)' },
          { value: 'synth', label: 'Synth clean' },
          { value: 'drive', label: 'Synth drive' },
        ],
      },
      { key: 'gain', type: 'slider', label: 'Gain', min: 0, max: 1, step: 0.01 },
      { key: 'cutoff', type: 'slider', label: 'Cutoff', min: 400, max: 6000, step: 50 },
      { key: 'crunch', type: 'slider', label: 'Drive', min: 0, max: 0.9, step: 0.01 },
      { key: 'attack', type: 'slider', label: 'Attack', min: 0, max: 0.05, step: 0.001 },
      { key: 'release', type: 'slider', label: 'Release', min: 0.02, max: 0.5, step: 0.01 },
    ],
    render: (expr, params) => {
      const tone = str(params, 'tone', 'strumstick')
      const crunch = num(params, 'crunch', 0.35)
      const cut = Math.round(num(params, 'cutoff', 3200))
      const att = num(params, 'attack', 0.003)
      const rel = num(params, 'release', 0.12)
      const g = gainLine(params, 'gain', 0.42)
      const strudelOverride =
        String(params.strudelSoundCustom ?? '').trim() || String(params.strudelSound ?? '').trim()
      if (strudelOverride) {
        return (
          `${expr}.s("${strudelOverride}")` +
          `.attack(${att.toFixed(3)})` +
          `.decay(0.12).sustain(0.15)` +
          `.release(${rel.toFixed(2)})` +
          `.lpf(${cut})` +
          g +
          `.room(0.2)`
        )
      }

      if (tone === 'drive' || tone === 'synth') {
        const wave = tone === 'drive' ? 'square' : 'triangle'
        const drive = tone === 'drive' ? Math.max(0.35, crunch) : crunch * 0.4
        return (
          `${expr}.s("${wave}")` +
          `.attack(${att.toFixed(3)})` +
          `.decay(0.08).sustain(0.1)` +
          `.release(${rel.toFixed(2)})` +
          `.lpf(${cut})` +
          `.hpf(120)` +
          (drive > 0.05 ? `.distort(${drive.toFixed(2)}).shape(0.5)` : '') +
          g
        )
      }

      return (
        `${expr}.s("${tone}")` +
        `.attack(${att.toFixed(3)})` +
        `.decay(0.15).sustain(0.2)` +
        `.release(${rel.toFixed(2)})` +
        `.lpf(${cut})` +
        g +
        `.room(0.2)`
      )
    },
  },

  texture: {
    kind: 'texture',
    label: 'Texture',
    defaultParams: {
      strudelSound: DEFAULT_STRUDEL_SOUND.texture,
      mode: 'wind',
      gain: 0.18,
      room: 0.8,
      cutoff: 900,
      shimmer: false,
    },
    schema: [
      STRUDEL_SOUND_SCHEMA,
      STRUDEL_SOUND_CUSTOM_SCHEMA,
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
      const modeDefault =
        mode === 'drone' ? 'brown' : mode === 'noise' ? 'crackle' : DEFAULT_STRUDEL_SOUND.texture
      const sound = pickStrudelSound(params, modeDefault)
      const pitch = mode === 'drone' ? 'c2' : 'c3'
      const att = mode === 'drone' ? 1 : mode === 'noise' ? 0.4 : 1.2
      const rel = mode === 'drone' ? 2 : mode === 'noise' ? 0.8 : 2
      return `note("${pitch}").s("${sound}").attack(${att}).release(${rel}).lpf(${Math.min(cut, mode === 'noise' ? 1200 : 900)})${g}${room}${
        shimmer ? '.delay(0.28).delayfeedback(0.38)' : ''
      }`
    },
  },
} satisfies InstrumentTable
