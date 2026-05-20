import { FC } from 'react';
import { Button, Switch } from '@blueprintjs/core';
import { type DailyWindow, type ScheduleTime } from '@app/types/schedule';
import { ScheduleTimeInput } from './ScheduleTimeInput';

interface DailyWindowsSectionProps {
    windows: DailyWindow[]
    onChange: (windows: DailyWindow[]) => void
}

const DEFAULT_WINDOW: DailyWindow = { onTime: '07:00', offTime: '23:00' };

export const DailyWindowsSection: FC<DailyWindowsSectionProps> = ({ windows, onChange }) => {
    const add = () => onChange([...windows, { ...DEFAULT_WINDOW }]);

    const remove = (i: number) => onChange(windows.filter((_, idx) => idx !== i));

    const update = (i: number, patch: Partial<DailyWindow>) =>
        onChange(windows.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));

    return (
        <div>
            <h4 css={{ marginBottom: '8px' }}>Daily On/Off Windows</h4>
            <p css={{ color: '#888', fontSize: '13px', marginTop: 0 }}>
                Lights turn on when inside any window. Empty = always off.
            </p>
            {windows.map((w, i) => (
                <div
                    key={i}
                    css={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '10px',
                        flexWrap: 'wrap',
                    }}
                >
                    <span css={{ minWidth: '28px', color: '#aaa', fontSize: '13px' }}>On:</span>
                    <ScheduleTimeInput
                        value={w.onTime}
                        onChange={(v: ScheduleTime) => update(i, { onTime: v })}
                    />
                    <span css={{ minWidth: '28px', color: '#aaa', fontSize: '13px' }}>Off:</span>
                    <Switch
                        label="Until end of day"
                        checked={w.offTime === null}
                        onChange={e =>
                            update(i, { offTime: e.currentTarget.checked ? null : '23:00' })
                        }
                        css={{ margin: 0 }}
                    />
                    {w.offTime !== null && (
                        <ScheduleTimeInput
                            value={w.offTime}
                            onChange={(v: ScheduleTime) => update(i, { offTime: v })}
                        />
                    )}
                    <Button small icon="trash" intent="danger" minimal onClick={() => remove(i)} />
                </div>
            ))}
            <Button small icon="plus" onClick={add}>Add window</Button>
        </div>
    );
};
