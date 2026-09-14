import type { LayerDefinition, GlobalCtx } from './types'
import { bool, num, str } from './types'

export const drumsLayer: LayerDefinition = {
  type: 'drums',
  label: 'Drums',
  description: 'Kick, hats, and backbeat',
  defaultParams: {
    pattern: 'four',
    bank: 'RolandTR909',
    kickDensity: 'full',
    hatStyle: 'offbeat',
    clap: true,
    gain: 0.7,
  },
  compile(params, ctx: GlobalCtx) {
    const bank = str(params, 'bank', 'RolandTR909')
    const gain = num(params, 'gain', 0.7)
    const clap = bool(params, 'clap', true)
    const kickDensity = str(params, 'kickDensity', 'full')
    const hatStyle = str(params, 'hatStyle', 'offbeat')
    const swing = Math.max(0.05, Math.min(0.25, ctx.swing || 0.125))

    const kick =
      kickDensity === 'sparse'
        ? 'bd ~ ~ ~'
        : kickDensity === 'syncopated'
          ? 'bd ~ [~ bd] ~'
          : 'bd*4'

    const hats =
      hatStyle === 'busy'
        ? 'hh*8'
        : hatStyle === 'sparse'
          ? '~ hh ~ hh'
          : // closed hats only — avoid `oh` (first TR909 open-hat sample has a space in filename)
            '[hh ~ hh hh]*2'

    const clapPat = clap ? ', ~ cp ~ cp' : ''

    return `stack(
  s("${kick}${clapPat}").bank("${bank}").gain(${(gain * 0.85).toFixed(2)}),
  s("${hats}").bank("${bank}").cut(1).gain(${(gain * 0.35).toFixed(2)}).hpf(4500).swingBy(${swing.toFixed(3)}, 4)
)`
  },
}
