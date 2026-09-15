import type { StyleEntry } from './types'
import type { ChordSpec } from '../types'

/** The four primary beat styles */
export const BEAT_STYLES: StyleEntry[] = [
  {
    id: 'house',
    label: 'House',
    kind: 'genre',
    genreId: 'house',
    blurb: 'Four-on-floor kick, open hats, warm bass — dancefloor pulse.',
    bpm: 124,
    key: 'A',
    scale: 'minor',
  },
  {
    id: 'videogame',
    label: 'Video game',
    kind: 'genre',
    genreId: 'videogame',
    blurb: 'Bright chimes, plucked chords, soft kit — cozy adventure energy.',
    bpm: 96,
    key: 'F',
    scale: 'major',
  },
  {
    id: 'trap',
    label: 'Trap',
    kind: 'genre',
    genreId: 'trap',
    blurb: 'Rolling hats, sparse kick, heavy sub — modern 808 pocket.',
    bpm: 140,
    key: 'C',
    scale: 'minor',
  },
  {
    id: 'lofi',
    label: 'Lo-fi',
    kind: 'genre',
    genreId: 'lofi',
    blurb: 'Dusty drums, warm keys, vinyl air — study-beat calm.',
    bpm: 84,
    key: 'Bb',
    scale: 'major',
  },
]

export const ALL_STYLES = BEAT_STYLES

export function getStyle(id: string): StyleEntry | undefined {
  return ALL_STYLES.find((s) => s.id === id)
}

export const SOFT_CHORDS: ChordSpec[] = [
  { degree: 'I', quality: 'maj7' },
  { degree: 'IV', quality: 'maj7' },
  { degree: 'vi', quality: 'm7' },
  { degree: 'V', quality: '7' },
]
