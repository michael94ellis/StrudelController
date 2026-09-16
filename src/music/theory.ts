import type { Beat, ChordQuality, ChordSpec, HarmonyCtx, Progression } from './types'

const KEY_SEMITONES: Record<string, number> = {
  C: 0,
  Db: 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  Gb: 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
}

/** Selectable keys, in chromatic order. */
export const KEYS = Object.keys(KEY_SEMITONES)

const NAMES = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b'] as const

/** Prefer sharp spellings Strudel likes for major thirds etc. */
const SHARP_NAMES = ['c', 'cs', 'd', 'eb', 'e', 'f', 'fs', 'g', 'ab', 'a', 'bb', 'b'] as const

const DEGREE_STEPS: Record<string, number> = {
  I: 0,
  ii: 2,
  iii: 4,
  IV: 5,
  V: 7,
  vi: 9,
  vii: 11,
}

const DEFAULT_QUALITY: Record<string, ChordQuality> = {
  I: 'maj7',
  ii: 'm7',
  iii: 'm7',
  IV: 'maj7',
  V: '7',
  vi: 'm7',
  vii: 'dim',
}

export function transposePc(note: string, semitones: number, preferSharp = false): string {
  const m = note.match(/^([a-g])(s|#|b)?(\d+)$/i)
  if (!m) return note
  const letter = m[1].toLowerCase()
  let acc = (m[2] || '').toLowerCase()
  if (acc === 's' || acc === '#') acc = '#'
  const pc = `${letter}${acc === '#' ? '#' : acc === 'b' ? 'b' : ''}`
  const flatMap: Record<string, number> = {
    c: 0,
    'c#': 1,
    cs: 1,
    db: 1,
    d: 2,
    'd#': 3,
    ds: 3,
    eb: 3,
    e: 4,
    f: 5,
    'f#': 6,
    fs: 6,
    gb: 6,
    g: 7,
    'g#': 8,
    gs: 8,
    ab: 8,
    a: 9,
    'a#': 10,
    as: 10,
    bb: 10,
    b: 11,
  }
  let idx = flatMap[pc] ?? flatMap[letter] ?? 0
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
  const name = preferSharp ? SHARP_NAMES[next] : NAMES[next]
  return `${name}${octave}`
}

export function keySemitones(key: string): number {
  return KEY_SEMITONES[key] ?? 0
}

export function rootForDegree(key: string, degree: string, octave: number): string {
  const steps = DEGREE_STEPS[degree] ?? 0
  return transposePc(`c${octave}`, keySemitones(key) + steps, true)
}

export function chordName(key: string, spec: ChordSpec): string {
  const quality = spec.quality ?? DEFAULT_QUALITY[spec.degree] ?? 'maj'
  const root = rootForDegree(key, spec.degree, 4).replace(/\d+$/, '')
  // Capitalize first letter for Strudel chord() names: Fmaj7, Dm7, Bbmaj7, C
  const letter = root.charAt(0).toUpperCase() + root.slice(1)
  switch (quality) {
    case 'maj':
      return `${letter}maj`
    case 'min':
      return `${letter}m`
    case 'maj7':
      return `${letter}maj7`
    case 'm7':
      return `${letter}m7`
    case '7':
      return `${letter}7`
    case 'sus':
      return `${letter}sus`
    case 'dim':
      return `${letter}dim`
    default:
      return letter
  }
}

export function triadNotes(key: string, spec: ChordSpec, octave = 4): string[] {
  const root = rootForDegree(key, spec.degree, octave)
  const quality = spec.quality ?? DEFAULT_QUALITY[spec.degree] ?? 'maj'
  const third =
    quality === 'min' || quality === 'm7' || quality === 'dim'
      ? transposePc(root, 3)
      : transposePc(root, 4, true)
  const fifth =
    quality === 'dim' ? transposePc(root, 6) : transposePc(root, 7, true)
  return [root, third, fifth]
}

/** Explicit note stacks so we never rely on Strudel chord().voicing() dictionaries. */
export function seventhNotes(key: string, spec: ChordSpec, octave = 4): string[] {
  const triad = triadNotes(key, spec, octave)
  const quality = spec.quality ?? DEFAULT_QUALITY[spec.degree] ?? 'maj'
  const root = triad[0]
  let seventh: string
  if (quality === 'maj7') {
    seventh = transposePc(root, 11, true)
  } else if (quality === '7' || quality === 'm7' || quality === 'dim') {
    seventh = transposePc(root, 10)
  } else if (quality === 'min') {
    seventh = transposePc(root, 10)
  } else {
    // plain maj — add maj7 color lightly
    seventh = transposePc(root, 11, true)
  }
  return [...triad, seventh]
}

export function resolveHarmony(
  beat: Pick<Beat, 'key' | 'scale' | 'bpm'>,
  progression: Progression,
  swing: number,
): HarmonyCtx {
  const chordNames = progression.chords.map((c) => chordName(beat.key, c))
  const roots = progression.chords.map((c) => rootForDegree(beat.key, c.degree, 2))
  const triads = progression.chords.map((c) => triadNotes(beat.key, c, 4))
  const sevenths = progression.chords.map((c) => seventhNotes(beat.key, c, 4))
  return {
    key: beat.key,
    scale: beat.scale,
    bpm: beat.bpm,
    swing,
    chordNames,
    roots,
    triads,
    sevenths,
  }
}

export function delayTimes(bpm: number) {
  const beat = 60 / bpm
  return {
    beat,
    eighth: beat / 2,
    dotted8th: beat * 0.75,
    sixteenth: beat / 4,
  }
}

/** Default for new beats — long enough that the repeat is easy to miss. */
export const DEFAULT_PROGRESSION_ID = 'journey'

/**
 * Selectable chord progressions. One chord per cycle, so the list length is
 * also the loop length in bars.
 */
export const PROGRESSIONS: Progression[] = [
  {
    id: 'journey',
    label: '16-bar journey (varied)',
    chords: [
      { degree: 'vi', quality: 'min' },
      { degree: 'IV', quality: 'maj' },
      { degree: 'I', quality: 'maj' },
      { degree: 'V', quality: 'maj' },
      { degree: 'ii', quality: 'm7' },
      { degree: 'V', quality: '7' },
      { degree: 'I', quality: 'maj7' },
      { degree: 'vi', quality: 'm7' },
      { degree: 'IV', quality: 'maj7' },
      { degree: 'I', quality: 'maj' },
      { degree: 'vi', quality: 'min' },
      { degree: 'iii', quality: 'm7' },
      { degree: 'ii', quality: 'm7' },
      { degree: 'V', quality: '7' },
      { degree: 'vi', quality: 'min' },
      { degree: 'I', quality: 'maj' },
    ],
  },
  {
    id: 'anthem',
    label: 'I–V–vi–IV · anthem',
    chords: [
      { degree: 'I', quality: 'maj' },
      { degree: 'V', quality: 'maj' },
      { degree: 'vi', quality: 'min' },
      { degree: 'IV', quality: 'maj' },
    ],
  },
  {
    id: 'pop',
    label: 'I–vi–IV–V · pop',
    chords: [
      { degree: 'I', quality: 'maj7' },
      { degree: 'vi', quality: 'm7' },
      { degree: 'IV', quality: 'maj7' },
      { degree: 'V', quality: '7' },
    ],
  },
  {
    id: 'soft',
    label: 'I–IV–vi–V · soft',
    chords: [
      { degree: 'I', quality: 'maj7' },
      { degree: 'IV', quality: 'maj7' },
      { degree: 'vi', quality: 'm7' },
      { degree: 'V', quality: '7' },
    ],
  },
  {
    id: 'cafe',
    label: 'ii–V–I–vi · jazz cafe',
    chords: [
      { degree: 'ii', quality: 'm7' },
      { degree: 'V', quality: '7' },
      { degree: 'I', quality: 'maj7' },
      { degree: 'vi', quality: 'm7' },
    ],
  },
  {
    id: 'minorLoop',
    label: 'vi–IV–I–V · minor loop',
    chords: [
      { degree: 'vi', quality: 'min' },
      { degree: 'IV', quality: 'maj' },
      { degree: 'I', quality: 'maj' },
      { degree: 'V', quality: 'maj' },
    ],
  },
  {
    id: 'vamp',
    label: 'i–VII · two-chord vamp',
    chords: [
      { degree: 'vi', quality: 'min' },
      { degree: 'V', quality: 'maj' },
    ],
  },
  {
    id: 'drone',
    label: 'I · one-chord drone',
    chords: [{ degree: 'I', quality: 'min' }],
  },
  {
    id: 'eight',
    label: 'I–vi–IV–V ×2 · eight bars',
    chords: [
      { degree: 'I', quality: 'maj7' },
      { degree: 'vi', quality: 'm7' },
      { degree: 'IV', quality: 'maj7' },
      { degree: 'V', quality: '7' },
      { degree: 'I', quality: 'maj7' },
      { degree: 'vi', quality: 'm7' },
      { degree: 'IV', quality: 'maj7' },
      { degree: 'V', quality: '7' },
    ],
  },
  {
    id: 'twelve',
    label: 'I–V–vi–IV ×3 · twelve bars',
    chords: [
      { degree: 'I', quality: 'maj' },
      { degree: 'V', quality: 'maj' },
      { degree: 'vi', quality: 'min' },
      { degree: 'IV', quality: 'maj' },
      { degree: 'I', quality: 'maj' },
      { degree: 'V', quality: 'maj' },
      { degree: 'vi', quality: 'min' },
      { degree: 'IV', quality: 'maj' },
      { degree: 'I', quality: 'maj' },
      { degree: 'V', quality: 'maj' },
      { degree: 'vi', quality: 'min' },
      { degree: 'IV', quality: 'maj' },
    ],
  },
]

export function getProgression(id: string): Progression {
  return PROGRESSIONS.find((p) => p.id === id) ?? getProgression(DEFAULT_PROGRESSION_ID)
}
