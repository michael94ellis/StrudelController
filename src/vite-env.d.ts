/// <reference types="vite/client" />

declare module '@strudel/web' {
  export function initStrudel(options?: {
    prebake?: () => void | Promise<void>
    miniAllStrings?: boolean
  }): Promise<unknown>

  export function hush(): void

  export function evaluate(code: string, autoplay?: boolean): Promise<unknown>

  export function samples(
    sampleMap: string | Record<string, unknown>,
    baseUrl?: string,
    options?: Record<string, unknown>,
  ): Promise<unknown>

  export function getAudioContext(): AudioContext

  export function resetGlobalEffects(): void
}
