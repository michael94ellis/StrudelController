import type { LayerDefinition, GlobalCtx } from './types'
import { num, str } from './types'

const KEY_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  Bb: 10,
}

const NAMES = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b']

function transposeNote(note: string, semitones: number): string {
  const m = note.match(/^([a-g])(s|#|b)?(\d+)$/i)
  if (!m) return note
  let letter = m[1].toLowerCase()
  let acc = (m[2] || '').toLowerCase()
  if (acc === 's') acc = '#'
  const pc = `${letter}${acc}`
  const flatMap: Record<string, string> = {
    c: 'c',
    'c#': 'db',
    db: 'db',
    d: 'd',
    'd#': 'eb',
    eb: 'eb',
    e: 'e',
    f: 'f',
    'f#': 'gb',
    gb: 'gb',
    g: 'g',
    'g#': 'ab',
    ab: 'ab',
    a: 'a',
    'a#': 'bb',
    bb: 'bb',
    b: 'b',
  }
  let idx = NAMES.indexOf(flatMap[pc] || letter)
  if (idx < 0) idx = 0
  let octave = Number(m[3])
  let next = idx + semitones
  while (next < 0) {
    next += 12
    octave -= 1
  }
  while (next >= 12) {
    next -= 12
    octave += 1
  }
  return `${NAMES[next]}${octave}`
}

/** I–vi–IV–V triads in C, transposed to key */
function chordNotes(key: string) {
  const s = KEY_SEMITONES[key] ?? 0
  const triads = [
    ['c4', 'e4', 'g4'],
    ['a3', 'c4', 'e4'],
    ['f3', 'a3', 'c4'],
    ['g3', 'b3', 'd4'],
  ]
  return triads.map((t) => t.map((n) => transposeNote(n, s)))
}

export const keysLayer: LayerDefinition = {
  type: 'keys',
  label: 'Keys',
  description: 'Soft chord bed',
  defaultParams: {
    sound: 'triangle',
    density: 'half',
    room: 0.3,
    gain: 0.28,
  },
  compile(params, ctx: GlobalCtx) {
    const chords = chordNotes(ctx.key)
    const sound = str(params, 'sound', 'triangle')
    const density = str(params, 'density', 'half')
    const room = num(params, 'room', 0.3)
    const gain = num(params, 'gain', 0.28)

    const chordPat = chords.map((c) => `[${c.join(',')}]`).join(' ')
    const struct = density === 'full' ? 'x x x x' : density === 'sparse' ? 'x ~ ~ ~' : 'x ~ x ~'

    if (sound === 'piano') {
      return `note("<${chordPat}>")
  .s("piano")
  .struct("${struct}")
  .attack(0.01)
  .decay(0.55)
  .sustain(0.3)
  .release(0.7)
  .room(${room.toFixed(2)})
  .roomsize(0.45)
  .gain(${gain.toFixed(2)})
  .orbit(2)`
    }

    return `note("<${chordPat}>")
  .s("triangle")
  .struct("${struct}")
  .lpf(3200)
  .attack(0.01)
  .decay(0.35)
  .sustain(0.2)
  .release(0.35)
  .room(${room.toFixed(2)})
  .roomsize(0.4)
  .gain(${gain.toFixed(2)})
  .orbit(2)`
  },
}
