import type { SwingModel } from './types'

/** Light pocket that the groove knob opens up. */
export const SWUNG: SwingModel = { base: 0.05, range: 0.2 }

/** Straight grid — swing makes fast kits feel like they're dropping hits. */
export const STRAIGHT: SwingModel = { base: 0, range: 0 }
