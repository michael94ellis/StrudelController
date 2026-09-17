import { logger as coreLogger } from '@strudel/core'
import { setLogger } from 'superdough'

const SUPERDOUGH_FALSE_ONENDED_WARNING = "node.onended = callback"

/**
 * Strudel 1.3's prebuilt superdough warns when `releaseAudioNode` runs after
 * `onceEnded` — even though soundfonts/webaudio use `onceEnded` correctly.
 * Filter that known false positive so the console stays usable in dev.
 */
export function installStrudelLoggerFilter(): void {
  setLogger((...args: unknown[]) => {
    const text = args.map(String).join(' ')
    if (text.includes(SUPERDOUGH_FALSE_ONENDED_WARNING)) return
    coreLogger(...args)
  })
}
