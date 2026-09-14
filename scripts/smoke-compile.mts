import { compileBeat } from '../src/audio/compileBeat.ts'
import { applyVibe, vibePresets } from '../src/ui/presets.ts'

for (const preset of vibePresets) {
  const { globals, layers } = applyVibe(preset)
  const code = compileBeat(globals, layers)
  console.log('\n===', preset.id, '===')
  console.log(code)
  if (!code.includes('setcpm')) throw new Error('missing setcpm')
  if (!code.includes('$:')) throw new Error('missing layers')
}
console.log('\nSmoke compile OK')
