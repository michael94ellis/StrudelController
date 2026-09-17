/** Encode a pattern for https://strudel.cc/#… (same scheme as the REPL share URL). */
export function codeToStrudelHash(code: string): string {
  // btoa expects Latin-1; Strudel patterns are ASCII-safe in practice.
  const bytes = new TextEncoder().encode(code)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return encodeURIComponent(btoa(binary))
}

export function strudelCcUrl(code: string): string {
  return `https://strudel.cc/#${codeToStrudelHash(code)}`
}
