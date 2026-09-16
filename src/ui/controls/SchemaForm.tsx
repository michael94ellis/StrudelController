import type { ParamMap, ParamSchema, ParamValue } from '../../music/types'
import { Slider } from '../controls/Slider'
import { Select } from '../controls/Select'
import { Toggle } from '../controls/Toggle'

type Props = {
  schema: ParamSchema[]
  params: ParamMap
  onChange: (key: string, value: ParamValue) => void
}

export function SchemaForm({ schema, params, onChange }: Props) {
  if (!schema.length) {
    return <p className="text-xs text-muted">No parameters</p>
  }

  return (
    <div className="space-y-3">
      {schema.map((field) => {
        const value = params[field.key]
        if (field.type === 'slider') {
          return (
            <Slider
              key={field.key}
              label={field.label}
              value={typeof value === 'number' ? value : field.min}
              min={field.min}
              max={field.max}
              step={field.step ?? 0.01}
              onChange={(v) => onChange(field.key, v)}
            />
          )
        }
        if (field.type === 'select') {
          return (
            <Select
              key={field.key}
              label={field.label}
              value={typeof value === 'string' ? value : field.options[0]?.value}
              options={field.options}
              onChange={(v) => onChange(field.key, v)}
            />
          )
        }
        if (field.type === 'text') {
          return (
            <label key={field.key} className="block space-y-1">
              <span className="text-xs font-medium text-ink-soft">{field.label}</span>
              <input
                type="text"
                value={typeof value === 'string' ? value : ''}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full rounded-lg border border-wood/20 bg-cream/80 px-3 py-2 text-sm text-ink"
              />
            </label>
          )
        }
        return (
          <Toggle
            key={field.key}
            label={field.label}
            checked={typeof value === 'boolean' ? value : false}
            onChange={(v) => onChange(field.key, v)}
          />
        )
      })}
    </div>
  )
}
