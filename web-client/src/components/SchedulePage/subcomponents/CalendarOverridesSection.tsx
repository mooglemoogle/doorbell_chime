import { FC } from 'react';
import { Button, HTMLSelect, InputGroup, NumericInput } from '@blueprintjs/core';
import { useAtomValue } from 'jotai';
import {
    type CalendarOverride,
    type AnnualOverride,
    type RangeOverride,
    type SpecificOverride,
    type SchedulePreview,
} from '@app/types/schedule';
import { CycleNamesAtom } from '@app/atoms/cycles';

interface CalendarOverridesSectionProps {
    overrides: CalendarOverride[];
    onChange: (overrides: CalendarOverride[]) => void;
    preview: SchedulePreview | null;
}

const DEFAULT_ANNUAL: AnnualOverride = { type: 'annual', date: '01-01', cycle: null, priority: 0 };
const DEFAULT_RANGE: RangeOverride = { type: 'range', startDate: '01-01', endDate: '01-31', cycle: null, priority: 0 };
const DEFAULT_SPECIFIC: SpecificOverride = {
    type: 'specific',
    date: new Date().toISOString().slice(0, 10),
    cycle: null,
    priority: 0,
};

export const CalendarOverridesSection: FC<CalendarOverridesSectionProps> = ({ overrides, onChange, preview }) => {
    const cycleNames = useAtomValue(CycleNamesAtom);
    const activeOverride = preview?.activeOverride ?? null;

    const add = () => onChange([...overrides, { ...DEFAULT_ANNUAL }]);
    const remove = (i: number) => onChange(overrides.filter((_, idx) => idx !== i));
    const update = (i: number, patch: Partial<CalendarOverride>) =>
        onChange(overrides.map((o, idx) => (idx === i ? ({ ...o, ...patch } as CalendarOverride) : o)));

    const changeType = (i: number, type: CalendarOverride['type']) => {
        if (type === 'annual')
            onChange(
                overrides.map((o, idx) =>
                    idx === i ? { ...DEFAULT_ANNUAL, cycle: o.cycle, priority: o.priority } : o,
                ),
            );
        else if (type === 'range')
            onChange(
                overrides.map((o, idx) => (idx === i ? { ...DEFAULT_RANGE, cycle: o.cycle, priority: o.priority } : o)),
            );
        else
            onChange(
                overrides.map((o, idx) =>
                    idx === i ? { ...DEFAULT_SPECIFIC, cycle: o.cycle, priority: o.priority } : o,
                ),
            );
    };

    return (
        <div>
            <h4 css={{ marginBottom: '8px' }}>Calendar Overrides</h4>
            <p css={{ color: '#888', fontSize: '13px', marginTop: 0 }}>
                Switch to a specific cycle (or turn off) on certain dates. More specific types take priority.
            </p>
            {overrides.map((o, i) => {
                const isActive = activeOverride === null ? false : JSON.stringify(activeOverride) === JSON.stringify(o);
                return (
                    <div 
                        key={i}
                        css={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            marginBottom: '10px',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: isActive ? '1px solid #e3a23b' : '1px solid transparent',
                            background: isActive ? 'rgba(227, 162, 59, 0.08)' : 'transparent',
                        }}
                    >
                        {isActive && <span css={{ fontSize: '11px', color: '#e3a23b', minWidth: '50px' }}>ACTIVE</span>}
                        <div
                            css={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <HTMLSelect
                                value={o.type}
                                onChange={e => changeType(i, e.target.value as CalendarOverride['type'])}
                            >
                                <option value="annual">Annual (MM-DD)</option>
                                <option value="range">Range (MM-DD)</option>
                                <option value="specific">Specific (YYYY-MM-DD)</option>
                            </HTMLSelect>

                            {o.type === 'annual' && (
                                <InputGroup
                                    value={(o as AnnualOverride).date}
                                    onChange={e => update(i, { date: e.target.value } as Partial<CalendarOverride>)}
                                    placeholder="MM-DD"
                                    style={{ width: '90px' }}
                                />
                            )}
                            {o.type === 'range' && (
                                <>
                                    <InputGroup
                                        value={(o as RangeOverride).startDate}
                                        onChange={e => update(i, { startDate: e.target.value } as Partial<CalendarOverride>)}
                                        placeholder="MM-DD"
                                        style={{ width: '90px' }}
                                    />
                                    <span css={{ color: '#aaa' }}>to</span>
                                    <InputGroup
                                        value={(o as RangeOverride).endDate}
                                        onChange={e => update(i, { endDate: e.target.value } as Partial<CalendarOverride>)}
                                        placeholder="MM-DD"
                                        style={{ width: '90px' }}
                                    />
                                </>
                            )}
                            {o.type === 'specific' && (
                                <InputGroup
                                    value={(o as SpecificOverride).date}
                                    onChange={e => update(i, { date: e.target.value } as Partial<CalendarOverride>)}
                                    placeholder="YYYY-MM-DD"
                                    style={{ width: '130px' }}
                                />
                            )}

                            <HTMLSelect
                                value={o.cycle ?? '__off__'}
                                onChange={e =>
                                    update(i, { cycle: e.target.value === '__off__' ? null : e.target.value })
                                }
                            >
                                <option value="__off__">— Turn Off —</option>
                                {cycleNames.map(name => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </HTMLSelect>

                            <span css={{ color: '#888', fontSize: '12px', whiteSpace: 'nowrap' }}>Priority:</span>
                            <NumericInput
                                value={o.priority}
                                onValueChange={v => update(i, { priority: v })}
                                min={0}
                                stepSize={1}
                                style={{ width: '60px' }}
                            />

                            <Button small icon="trash" intent="danger" minimal onClick={() => remove(i)} />
                        </div>
                    </div>
                );
            })}
            <Button small icon="plus" onClick={add}>
                Add override
            </Button>
        </div>
    );
};
