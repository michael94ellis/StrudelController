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

/** Fixed loop-count chips (always distinct). */
export const EXPORT_LOOP_COUNTS = [1, 2, 4, 8] as const
export type ExportLoopCount = (typeof EXPORT_LOOP_COUNTS)[number]

/** Length selection: N musical cycles, or record until stop. */
export type ExportLength = ExportLoopCount | 'indefinite'

export type ExportPlan = {
  length: ExportLength
  /** null when indefinite — user stops recording manually. */
  seconds: number | null
  loops: number | null
  cycleSeconds: number
  cycleBars: number
}

export function planExport(beat: Beat, length: ExportLength): ExportPlan {
  const cycleBars = beatCycleBars(beat)
  const cycleSeconds = cycleBars * barSeconds(beat.bpm)

  if (length === 'indefinite') {
    return {
      length,
      seconds: null,
      loops: null,
      cycleSeconds,
      cycleBars,
    }
  }

  return {
    length,
    seconds: length * cycleSeconds,
    loops: length,
    cycleSeconds,
    cycleBars,
  }
}

export function formatExportPlan(plan: ExportPlan): string {
  if (plan.length === 'indefinite') {
    return `∞ until you stop (~${plan.cycleSeconds.toFixed(1)}s / loop)`
  }
  const sec = plan.seconds ?? 0
  const nice = Number.isInteger(sec) ? String(sec) : sec.toFixed(1)
  return `${plan.loops}× → ${nice}s`
}

/** Trim wall-clock elapsed down to the last full musical cycle (seamless ∞ takes). */
export function trimToFullCycles(elapsedSeconds: number, cycleSeconds: number): number {
  if (cycleSeconds <= 0) return Math.max(0, elapsedSeconds)
  const loops = Math.floor(elapsedSeconds / cycleSeconds + 1e-6)
  return Math.max(cycleSeconds, loops * cycleSeconds)
}
