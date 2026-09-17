import type { Beat } from './types'
import { resolveProgression } from './layerStyles'

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b
}

/** Seconds for one bar (4 beats) at this BPM. */
export function barSeconds(bpm: number): number {
  return (60 / Math.max(1, bpm)) * 4
}

/** Bars in one seamless cycle of the stacked beat (LCM of enabled layer lengths). */
export function beatCycleBars(beat: Beat): number {
  const lengths = beat.layers
    .filter((l) => l.enabled)
    .map((l) => Math.max(1, resolveProgression(l).chords.length))
  if (!lengths.length) return 4
  return lengths.reduce((acc, n) => lcm(acc, n), lengths[0]!)
}

export function beatCycleSeconds(beat: Beat): number {
  return beatCycleBars(beat) * barSeconds(beat.bpm)
}

export type ExportSnap = {
  /** Wall-clock length to record (exact multiple of the musical cycle). */
  seconds: number
  /** How many full cycles fit in the file. */
  loops: number
  /** One cycle length in seconds. */
  cycleSeconds: number
  /** Bars per cycle. */
  cycleBars: number
  /** User's target chip (5 / 10 / 15 / 30). */
  targetSeconds: number
}

/**
 * Pick a duration near `targetSeconds` that is an integer number of musical
 * cycles so the downloaded file loops without a seam.
 */
export function snapExportDuration(beat: Beat, targetSeconds: number): ExportSnap {
  const cycleBars = beatCycleBars(beat)
  const cycleSeconds = cycleBars * barSeconds(beat.bpm)
  const target = Math.max(1, targetSeconds)

  if (cycleSeconds <= 0) {
    return {
      seconds: target,
      loops: 1,
      cycleSeconds: target,
      cycleBars,
      targetSeconds: target,
    }
  }

  const rounded = Math.max(1, Math.round(target / cycleSeconds))
  const floored = Math.max(1, Math.floor(target / cycleSeconds))
  const ceiled = Math.max(1, Math.ceil(target / cycleSeconds))

  const candidates = [...new Set([rounded, floored, ceiled])]
  let best = candidates[0]!
  let bestDist = Math.abs(best * cycleSeconds - target)
  for (const n of candidates) {
    const dist = Math.abs(n * cycleSeconds - target)
    if (dist < bestDist || (dist === bestDist && n < best)) {
      best = n
      bestDist = dist
    }
  }

  return {
    seconds: best * cycleSeconds,
    loops: best,
    cycleSeconds,
    cycleBars,
    targetSeconds: target,
  }
}

export function formatExportLabel(snap: ExportSnap): string {
  const sec = snap.seconds
  const nice = Number.isInteger(sec) ? String(sec) : sec.toFixed(1)
  if (Math.abs(sec - snap.targetSeconds) < 0.05) return `${snap.targetSeconds}s`
  return `~${snap.targetSeconds}s → ${nice}s`
}
