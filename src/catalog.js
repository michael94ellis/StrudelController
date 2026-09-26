import { generateTrack } from './generate.js';
import { formatTime, trackSeconds } from './theory.js';

/** Ten fixed ambient pieces — one row each, distinct seeds. */
const TRACKS = [
  ['night-ferry', 'Night Ferry', 'sleep', 90],
  ['still-water', 'Still Water', 'meditation', 90],
  ['north-light', 'North Light', 'focus', 60],
  ['late-afternoon', 'Late Afternoon', 'relax', 90],
  ['snow-room', 'Snow Room', 'sleep', 120],
  ['soft-bell', 'Soft Bell', 'meditation', 45],
  ['even-pace', 'Even Pace', 'focus', 60],
  ['warm-glass', 'Warm Glass', 'relax', 60],
  ['slow-tide', 'Slow Tide', 'sleep', 90],
  ['candle-hour', 'Candle Hour', 'meditation', 120],
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
  return TRACKS.map(([id, title, mood, seconds], index) => {
    const piece = generateTrack(mood, seconds, mulberry32(800 + index * 97));
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
