import type { LayerDefinition, GlobalCtx } from './types'
import { num, str } from './types'

export const melodyLayer: LayerDefinition = {
  type: 'melody',
  label: 'Melody',
  description: 'Catchy lead line',
  defaultParams: {
    density: 'medium',
    delay: 0.3,
    gain: 0.24,
  },
  compile(params, ctx: GlobalCtx) {
    const density = str(params, 'density', 'medium')
    const delay = num(params, 'delay', 0.3)
    const gain = num(params, 'gain', 0.24)
    const beat = 60 / ctx.bpm
    const dotted8th = beat * 0.75
    const scaleName = `${ctx.key}4:${ctx.scale}`

    const phrase =
      density === 'busy'
        ? '<[0 2 ~ 4 3 ~ 5 4] [0 ~ 4 2 ~ 5 3 2]>'
        : density === 'sparse'
          ? '<[0 ~ ~ 4 ~ ~ 2 ~] [~ 2 ~ ~ 0 ~ ~ ~]>'
          : '<[0 ~ 2 4 ~ 2 0 ~] [4 ~ 2 0 ~ 1 2 ~]>'

    return `n("${phrase}")
  .scale("${scaleName}")
  .s("triangle")
  .lpf(3800)
  .attack(0.01)
  .decay(0.2)
  .sustain(0.05)
  .release(0.15)
  .delay(${delay.toFixed(2)})
  .delaytime(${dotted8th.toFixed(4)})
  .delayfeedback(0.3)
  .gain(${gain.toFixed(2)})
  .orbit(2)`
  },
}
