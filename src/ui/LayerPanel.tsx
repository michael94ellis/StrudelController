import type { LayerInstance, ParamValue } from '../layers/types'
import { getLayerDef } from '../layers/registry'
import { Select } from './controls/Select'
import { Slider } from './controls/Slider'
import { Toggle } from './controls/Toggle'

type Props = {
  layer: LayerInstance
  onParam: (key: string, value: ParamValue) => void
}

export function LayerPanel({ layer, onParam }: Props) {
  const def = getLayerDef(layer.type)
  const p = layer.params

  if (layer.type === 'drums') {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Bank"
          value={String(p.bank)}
          options={[
            { value: 'RolandTR909', label: 'TR-909' },
            { value: 'RolandTR808', label: 'TR-808' },
          ]}
          onChange={(v) => onParam('bank', v)}
        />
        <Select
          label="Kick"
          value={String(p.kickDensity)}
          options={[
            { value: 'full', label: 'Four on the floor' },
            { value: 'syncopated', label: 'Syncopated' },
            { value: 'sparse', label: 'Sparse' },
          ]}
          onChange={(v) => onParam('kickDensity', v)}
        />
        <Select
          label="Hats"
          value={String(p.hatStyle)}
          options={[
            { value: 'offbeat', label: 'Offbeat groove' },
            { value: 'busy', label: 'Busy 8ths' },
            { value: 'sparse', label: 'Sparse' },
          ]}
          onChange={(v) => onParam('hatStyle', v)}
        />
        <Toggle label="Clap" checked={Boolean(p.clap)} onChange={(v) => onParam('clap', v)} />
        <Slider
          label="Gain"
          value={Number(p.gain)}
          min={0.05}
          max={1}
          display={Number(p.gain).toFixed(2)}
          onChange={(v) => onParam('gain', v)}
        />
      </div>
    )
  }

  if (layer.type === 'bass') {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Pattern"
          value={String(p.pattern)}
          options={[
            { value: 'roots', label: 'Roots' },
            { value: 'walking', label: 'Walking' },
            { value: 'pulse', label: 'Pulse' },
          ]}
          onChange={(v) => onParam('pattern', v)}
        />
        <Select
          label="Wave"
          value={String(p.wave)}
          options={[
            { value: 'sine', label: 'Sine' },
            { value: 'triangle', label: 'Triangle' },
          ]}
          onChange={(v) => onParam('wave', v)}
        />
        <Slider
          label="Filter"
          value={Number(p.lpf)}
          min={120}
          max={1200}
          step={10}
          display={`${p.lpf} Hz`}
          onChange={(v) => onParam('lpf', v)}
        />
        <Slider
          label="Gain"
          value={Number(p.gain)}
          min={0.05}
          max={1}
          display={Number(p.gain).toFixed(2)}
          onChange={(v) => onParam('gain', v)}
        />
      </div>
    )
  }

  if (layer.type === 'keys') {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Sound"
          value={String(p.sound)}
          options={[
            { value: 'triangle', label: 'Soft triangle' },
            { value: 'piano', label: 'Piano' },
          ]}
          onChange={(v) => onParam('sound', v)}
        />
        <Select
          label="Density"
          value={String(p.density)}
          options={[
            { value: 'full', label: 'Every beat' },
            { value: 'half', label: 'Half notes' },
            { value: 'sparse', label: 'Sparse' },
          ]}
          onChange={(v) => onParam('density', v)}
        />
        <Slider
          label="Room"
          value={Number(p.room)}
          min={0}
          max={0.8}
          display={Number(p.room).toFixed(2)}
          onChange={(v) => onParam('room', v)}
        />
        <Slider
          label="Gain"
          value={Number(p.gain)}
          min={0.05}
          max={1}
          display={Number(p.gain).toFixed(2)}
          onChange={(v) => onParam('gain', v)}
        />
      </div>
    )
  }

  if (layer.type === 'melody') {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Density"
          value={String(p.density)}
          options={[
            { value: 'sparse', label: 'Sparse' },
            { value: 'medium', label: 'Medium' },
            { value: 'busy', label: 'Busy' },
          ]}
          onChange={(v) => onParam('density', v)}
        />
        <Slider
          label="Delay"
          value={Number(p.delay)}
          min={0}
          max={0.7}
          display={Number(p.delay).toFixed(2)}
          onChange={(v) => onParam('delay', v)}
        />
        <Slider
          label="Gain"
          value={Number(p.gain)}
          min={0.05}
          max={1}
          display={Number(p.gain).toFixed(2)}
          onChange={(v) => onParam('gain', v)}
        />
      </div>
    )
  }

  if (layer.type === 'texture') {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Toggle
          label="Grain"
          checked={Boolean(p.enabledGrain)}
          onChange={(v) => onParam('enabledGrain', v)}
        />
        <Slider
          label="Density"
          value={Number(p.density)}
          min={0.005}
          max={0.08}
          step={0.005}
          display={Number(p.density).toFixed(3)}
          onChange={(v) => onParam('density', v)}
        />
        <Slider
          label="Gain"
          value={Number(p.gain)}
          min={0.01}
          max={0.2}
          step={0.01}
          display={Number(p.gain).toFixed(2)}
          onChange={(v) => onParam('gain', v)}
        />
      </div>
    )
  }

  return <p className="text-sm text-muted">{def.description}</p>
}
