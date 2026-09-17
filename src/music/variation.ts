/** Deterministic pick from a small set — stable until `variation` changes. */
export function pickBar<T>(variation: number, barIndex: number, options: readonly T[]): T {
  if (options.length === 0) throw new Error('pickBar: empty options')
  const i = Math.abs((variation * 17 + barIndex * 13) % options.length)
  return options[i]!
}

export function isPhraseEnd(barIndex: number, bars: number): boolean {
  return barIndex === bars - 1 || (barIndex + 1) % 8 === 0
}

export function isFillBar(barIndex: number): boolean {
  return (barIndex + 1) % 8 === 0
}
