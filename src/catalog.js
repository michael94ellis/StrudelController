import { generateTrack } from './generate.js';
import { formatTime, trackSeconds } from './theory.js';

/** Ten fixed ambient pieces — each with its own harmony and palette. */
const TRACKS = [
  ['night-ferry', 'Night Ferry', 'sleep', 90, { root: 'G', scale: 'pentatonic', progression: 'still', motif: 'sparse' }],
  ['still-water', 'Still Water', 'meditation', 90, { root: 'C', scale: 'major', progression: 'sway', motif: 'pedal' }],
  ['north-light', 'North Light', 'focus', 60, { root: 'F', scale: 'lydian', progression: 'fifths', motif: 'sparse', bpm: 52 }],
  ['late-afternoon', 'Late Afternoon', 'relax', 90, { root: 'A', scale: 'major', progression: 'sway', motif: 'steps' }],
  ['snow-room', 'Snow Room', 'sleep', 120, { root: 'Eb', scale: 'major', progression: 'fifths', motif: 'pedal' }],
  ['soft-bell', 'Soft Keys', 'meditation', 45, { root: 'D', scale: 'pentatonic', progression: 'still', motif: 'sparse' }],
  ['even-pace', 'Even Pace', 'focus', 60, { root: 'Bb', scale: 'pentatonic', progression: 'still', motif: 'pedal', bpm: 50 }],
  ['warm-glass', 'Warm Glass', 'relax', 60, { root: 'F', scale: 'dorian', progression: 'fifths', motif: 'sparse' }],
  ['slow-tide', 'Slow Tide', 'sleep', 90, { root: 'C', scale: 'lydian', progression: 'fifths', motif: 'sparse' }],
  ['candle-hour', 'Candle Hour', 'meditation', 120, { root: 'G', scale: 'major', progression: 'sway', motif: 'steps' }],
];

const MOOD_NAME = {
  sleep: 'Sleep',
  meditation: 'Meditation',
  focus: 'Focus',
  relax: 'Relax',
};

function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCatalog() {
  return TRACKS.map(([id, title, mood, seconds, profile], index) => {
    const piece = generateTrack(mood, seconds, mulberry32(800 + index * 97), { ...profile, title });
    piece.title = title;
    piece.mood = mood;
    const duration = trackSeconds(piece);
    return {
      id,
      title,
      mood,
      moodName: MOOD_NAME[mood],
      seconds: duration,
      time: formatTime(duration),
      piece,
    };
  });
}
