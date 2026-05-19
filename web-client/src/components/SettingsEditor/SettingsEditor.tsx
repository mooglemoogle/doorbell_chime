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
