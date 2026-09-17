/// <reference types="vite/client" />

declare module '@strudel/soundfonts' {
  export function registerSoundfonts(): void
}

declare module '@strudel/core' {
  export const logger: (...args: unknown[]) => void
}

declare module 'superdough' {
  export function setLogger(fn: (...args: unknown[]) => void): void
}

declare module '@strudel/web' {
  export function registerSynthSounds(): void
  export function registerZZFXSounds(): void

  export function initStrudel(options?: {
    prebake?: () => void | Promise<void>
    miniAllStrings?: boolean
  }): Promise<unknown>

  export function hush(): void

  export function evaluate(code: string, autoplay?: boolean): Promise<unknown>

  export function samples(
    sampleMap: string | Record<string, unknown>,
    baseUrl?: string | Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<unknown>

  export function getAudioContext(): AudioContext

  export function resetGlobalEffects(): void
}

declare module 'superdough' {
  export function getSuperdoughAudioController(): {
    output: {
      destinationGain: GainNode | null
    }
  }
}
