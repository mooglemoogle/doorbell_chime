import { FC } from 'react';
import { HTMLSelect, InputGroup, NumericInput } from '@blueprintjs/core';
import { isSolarRelativeTime, SOLAR_EVENT_LABELS, SOLAR_EVENT_NAMES, type ScheduleTime, type SolarEventName, type SolarRelativeTime } from '@app/types/schedule';

interface ScheduleTimeInputProps {
    value: ScheduleTime
    onChange: (value: ScheduleTime) => void
    disabled?: boolean
}

export const ScheduleTimeInput: FC<ScheduleTimeInputProps> = ({ value, onChange, disabled }) => {
    const isSolar = isSolarRelativeTime(value);

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === 'absolute') {
            onChange('06:00');
        } else {
            onChange({ event: 'sunrise' });
        }
    };

    return (
        <div css={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <HTMLSelect
                disabled={disabled}
                value={isSolar ? 'solar' : 'absolute'}
                onChange={handleTypeChange}
            >
                <option value="absolute">Absolute time</option>
                <option value="solar">Solar event</option>
            </HTMLSelect>

            {isSolar ? (
                <>
                    <HTMLSelect
                        disabled={disabled}
                        value={(value as SolarRelativeTime).event}
                        onChange={e => onChange({ ...(value as SolarRelativeTime), event: e.target.value as SolarEventName })}
                    >
                        {SOLAR_EVENT_NAMES.map(name => (
                            <option key={name} value={name}>{SOLAR_EVENT_LABELS[name]}</option>
                        ))}
                    </HTMLSelect>
                    <NumericInput
                        disabled={disabled}
                        value={(value as SolarRelativeTime).offsetMinutes ?? 0}
                        onValueChange={v => onChange({ ...(value as SolarRelativeTime), offsetMinutes: v })}
                        min={-180}
                        max={180}
                        stepSize={5}
                        style={{ width: '80px' }}
                        placeholder="±min"
                    />
                    <span css={{ color: '#888', fontSize: '12px', whiteSpace: 'nowrap' }}>min offset</span>
                </>
            ) : (
                <InputGroup
                    disabled={disabled}
                    value={value as string}
                    onChange={e => onChange(e.target.value)}
                    placeholder="HH:mm"
                    style={{ width: '90px' }}
                />
            )}
        </div>
    );
};
