/**
 * Strudel advances one `< … >` segment per cycle; our cycle = one bar and the
 * progression length sets total loop length in bars.
 */
/** One bar of mini notation — multi-note bars use `[ … ]`, not `( … )` (invalid in mini). */
function barSegment(segment: string): string {
  const s = segment.trim()
  if (!s.includes(' ')) return s
  if (s.startsWith('[') && s.endsWith(']')) return s
  return `[${s}]`
}

export function notePerBar(segments: string[]): string {
  if (segments.length === 0) return 'silence'
  if (segments.length === 1) return `note("${segments[0]}")`
  const inner = segments.map(barSegment).join(' ')
  return `note("<${inner}>")`
}

export function notePerBarStruct(segments: string[], struct: string): string {
  return `${notePerBar(segments)}.struct("${struct}")`
}
