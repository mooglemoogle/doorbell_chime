import { FC } from 'react';
import { Button } from '@blueprintjs/core';
import { SOLAR_EVENT_LABELS, SOLAR_EVENT_NAMES, type SchedulePreview } from '@app/types/schedule';

interface SolarTimesPreviewProps {
    preview: SchedulePreview | null;
    onRefresh: () => void;
}

export const SolarTimesPreview: FC<SolarTimesPreviewProps> = ({ preview, onRefresh }) => {

    return (
        <div>
            <div css={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <h4 css={{ margin: 0 }}>Solar Times Today</h4>
                <Button small icon="refresh" onClick={onRefresh} />
            </div>
            {!preview ? (
                <div css={{ color: '#888', fontStyle: 'italic' }}>
                    Set a location above and click refresh to see solar times.
                </div>
            ) : (
                <div css={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', maxWidth: '400px' }}>
                    {SOLAR_EVENT_NAMES.map(name => (
                        <div key={name} css={{ display: 'contents' }}>
                            <span css={{ color: '#aaa', fontSize: '13px' }}>{SOLAR_EVENT_LABELS[name]}</span>
                            <span css={{ fontFamily: 'monospace', fontSize: '13px' }}>
                                {preview.solarTimes.times[name] ?? '—'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {preview && (
                <div css={{ marginTop: '6px', color: '#888', fontSize: '12px' }}>
                    Date: {preview.solarTimes.date}
                    {preview.activeOverride && (
                        <span css={{ marginLeft: '12px', color: '#e3a23b' }}>
                            Active override: {preview.activeOverride.cycle ?? 'off'}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
