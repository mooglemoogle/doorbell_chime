import { FC } from 'react'
import { NumericInput, Switch, InputGroup } from '@blueprintjs/core'
import type { OptionsSchema, PropertySchema } from '@services/algorithms'

export type { OptionsSchema, PropertySchema }

export interface SettingsEditorProps {
    schema: OptionsSchema;
    values: Record<string, unknown>;
    onChange: (values: Record<string, unknown>) => void;
}

const NUMERIC_TYPES = new Set(['number', 'float', 'integer'])

// HSV (0–1 each) ↔ hex RGB helpers for the color picker
function hsvToHex(h: number, s: number, v: number): string {
    const i = Math.floor(h * 6)
    const f = h * 6 - i
    const p = v * (1 - s)
    const q = v * (1 - f * s)
    const t = v * (1 - (1 - f) * s)
    const [r, g, b] = ((): [number, number, number] => {
        switch (i % 6) {
            case 0: return [v, t, p]
            case 1: return [q, v, p]
            case 2: return [p, v, t]
            case 3: return [p, q, v]
            case 4: return [t, p, v]
            default: return [v, p, q]
        }
    })()
    const hex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0')
    return `#${hex(r)}${hex(g)}${hex(b)}`
}

function hexToHsv(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const d = max - min
    const s = max === 0 ? 0 : d / max
    const v = max
    let h = 0
    if (d !== 0) {
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
            case g: h = ((b - r) / d + 2) / 6; break
            case b: h = ((r - g) / d + 4) / 6; break
        }
    }
    return [h, s, v]
}

const ColorControl: FC<{
    value: unknown
    onChange: (v: number[]) => void
}> = ({ value, onChange }) => {
    const arr = Array.isArray(value) ? value as number[] : [0, 0, 1]
    const [h, s, v] = arr
    const hex = hsvToHex(h ?? 0, s ?? 0, v ?? 1)
    return (
        <input
            type="color"
            value={hex}
            onChange={e => {
                const [nh, ns, nv] = hexToHsv(e.target.value)
                // Preserve white channel if present
                onChange(arr.length === 4 ? [nh, ns, nv, arr[3]] : [nh, ns, nv])
            }}
            css={{ width: '48px', height: '28px', padding: '2px', cursor: 'pointer', border: 'none', background: 'none' }}
        />
    )
}

const ColorArrayControl: FC<{
    schema: PropertySchema
    value: unknown
    onChange: (v: unknown) => void
}> = ({ schema, value, onChange }) => {
    const arr = Array.isArray(value) ? value as number[][] : []
    const count = arr.length || schema.minItems || 2
    const canAdd = schema.maxItems == null || count < schema.maxItems
    return (
        <div css={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
            {Array.from({ length: count }, (_, i) => (
                <ColorControl
                    key={i}
                    value={arr[i] ?? [0, 0, 1]}
                    onChange={v => {
                        const next = [...arr]
                        next[i] = v
                        onChange(next)
                    }}
                />
            ))}
            {canAdd && (
                <button
                    onClick={() => onChange([...arr, arr[arr.length - 1] ?? [0, 0, 1]])}
                    css={{
                        width: '28px', height: '28px', padding: 0,
                        background: 'none', border: '1px solid #555',
                        borderRadius: '3px', cursor: 'pointer', color: '#aaa',
                        fontSize: '16px', lineHeight: 1,
                        ':hover': { borderColor: '#aaa', color: '#fff' },
                    }}
                >+</button>
            )}
        </div>
    )
}

const ObjectArrayControl: FC<{
    schema: PropertySchema
    value: unknown
    onChange: (v: unknown) => void
}> = ({ schema, value, onChange }) => {
    const itemSchema = schema.items!
    const properties = itemSchema.properties!
    const arr = Array.isArray(value) ? value as Record<string, unknown>[] : []
    const count = arr.length || schema.minItems || 1

    const updateItem = (i: number, key: string, v: unknown) => {
        const next = [...arr]
        next[i] = { ...next[i], [key]: v }
        onChange(next)
    }

    return (
        <div css={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from({ length: count }, (_, i) => {
                const item = arr[i] ?? {}
                return (
                    <div key={i} css={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {Object.entries(properties).map(([key, propSchema]) => (
                            <div key={key} css={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span css={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>
                                    {propSchema.title ?? key}
                                </span>
                                <PropertyControl
                                    propKey={key}
                                    schema={propSchema}
                                    value={item[key]}
                                    onChange={v => updateItem(i, key, v)}
                                />
                            </div>
                        ))}
                    </div>
                )
            })}
        </div>
    )
}

function getMin(s: PropertySchema): number | undefined {
    return s.minimum ?? s.inclusiveMinimum
}
function getMax(s: PropertySchema): number | undefined {
    return s.maximum ?? s.inclusiveMaximum
}

const ArrayControl: FC<{
    schema: PropertySchema
    value: unknown
    onChange: (v: unknown[]) => void
}> = ({ schema, value, onChange }) => {
    const items = schema.items!
    const count = schema.maxItems ?? schema.minItems ?? (Array.isArray(value) ? value.length : 3)
    const arr = Array.isArray(value) ? value as number[] : Array<number>(count).fill(0)
    const min = getMin(items)
    const max = getMax(items)
    const step = items.type === 'integer' ? 1 : 0.01

    return (
        <div css={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} css={{ flex: 1, minWidth: 0 }}>
                    <NumericInput
                        value={arr[i] ?? 0}
                        min={min}
                        max={max}
                        stepSize={step}
                        minorStepSize={items.type === 'integer' ? undefined : 0.001}
                        buttonPosition="none"
                        fill
                        onValueChange={v => {
                            const next = [...arr]
                            next[i] = v
                            onChange(next)
                        }}
                    />
                </div>
            ))}
        </div>
    )
}

const PropertyControl: FC<{
    propKey: string
    schema: PropertySchema
    value: unknown
    onChange: (v: unknown) => void
}> = ({ propKey, schema, value, onChange }) => {
    const current = value ?? schema.default

    if (schema.type === 'color') {
        return <ColorControl value={current} onChange={v => onChange(v)} />
    }

    if (schema.type === 'array' && schema.items?.type === 'color') {
        return <ColorArrayControl schema={schema} value={current} onChange={onChange} />
    }

    if (schema.type === 'array' && schema.items?.type === 'object' && schema.items.properties) {
        return <ObjectArrayControl schema={schema} value={current} onChange={onChange} />
    }

    if (schema.type === 'array' && schema.items && NUMERIC_TYPES.has(schema.items.type)) {
        return <ArrayControl schema={schema} value={current} onChange={onChange} />
    }

    if (NUMERIC_TYPES.has(schema.type)) {
        const min = getMin(schema)
        const max = getMax(schema)
        const step = schema.type === 'integer' ? 1 : 0.01
        return (
            <NumericInput
                value={(current as number) ?? 0}
                min={min}
                max={max}
                stepSize={step}
                minorStepSize={schema.type === 'integer' ? undefined : 0.001}
                onValueChange={onChange}
                css={{ width: '120px' }}
            />
        )
    }

    if (schema.type === 'boolean') {
        return (
            <Switch
                checked={Boolean(current)}
                label=""
                onChange={e => onChange((e.target as HTMLInputElement).checked)}
                css={{ margin: 0 }}
            />
        )
    }

    return (
        <InputGroup
            value={String(current ?? '')}
            onChange={e => onChange(e.target.value)}
            fill
        />
    )
}

export const SettingsEditor: FC<SettingsEditorProps> = ({ schema, values, onChange }) => {
    const properties = schema.properties
    if (!properties || Object.keys(properties).length === 0) return null

    const set = (key: string, v: unknown) => onChange({ ...values, [key]: v })

    return (
        <div css={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(properties).map(([key, prop]) => (
                <div key={key}>
                    <div
                        css={{
                            fontSize: '11px',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: '#888',
                            marginBottom: '4px',
                            cursor: prop.description ? 'help' : 'default',
                        }}
                        title={prop.description}
                    >
                        {prop.title ?? key}
                    </div>
                    <PropertyControl
                        propKey={key}
                        schema={prop}
                        value={values[key]}
                        onChange={v => set(key, v)}
                    />
                </div>
            ))}
        </div>
    )
}
