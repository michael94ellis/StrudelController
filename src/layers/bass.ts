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
  const m = note.match(/^([a-g])(b|#)?(\d+)$/i)
  if (!m) return note
  const letter = m[1].toLowerCase()
  const acc = m[2]?.toLowerCase() || ''
  const pc = `${letter}${acc === '#' ? '#' : acc === 'b' ? 'b' : ''}`
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

function rootsForKey(key: string) {
  const semi = KEY_SEMITONES[key] ?? 0
  return (['c2', 'a1', 'f1', 'g1'] as const).map((n) => transposeNote(n, semi))
}

export const bassLayer: LayerDefinition = {
  type: 'bass',
  label: 'Bass',
  description: 'Warm low end',
  defaultParams: {
    pattern: 'roots',
    wave: 'sine',
    lpf: 420,
    gain: 0.42,
  },
  compile(params, ctx: GlobalCtx) {
    const [r1, r2, r3, r4] = rootsForKey(ctx.key)
    const pattern = str(params, 'pattern', 'roots')
    const wave = str(params, 'wave', 'sine')
    const lpf = num(params, 'lpf', 420)
    const gain = num(params, 'gain', 0.42)
    const root = transposeNote('c2', KEY_SEMITONES[ctx.key] ?? 0)

    let notePat: string
    if (pattern === 'walking') {
      notePat = `<[${r1} ~ ${transposeNote(r1, 4)} ${r1}] [${r2} ~ ${transposeNote(r2, 3)} ${r2}] [${r3} ~ ${transposeNote(r3, 4)} ${r3}] [${r4} ~ ${transposeNote(r4, 4)} ${r4}]>`
    } else if (pattern === 'pulse') {
      notePat = `${root}!4`
    } else {
      notePat = `<${r1} ${r2} ${r3} ${r4}>`
    }

    return `note("${notePat}")
  .s("${wave}")
  .lpf(${lpf})
  .attack(0.01)
  .decay(0.3)
  .sustain(0.35)
  .release(0.12)
  .gain(${gain.toFixed(2)})`
  },
}
