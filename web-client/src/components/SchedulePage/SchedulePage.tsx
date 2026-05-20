import { FC, useCallback, useEffect, useState } from 'react';
import { Button, FormGroup, NumericInput, Switch } from '@blueprintjs/core';
import { useAtomValue, useSetAtom } from 'jotai';
import { ScheduleConfigAtom, FetchScheduleAtom, SaveScheduleAtom } from '@app/atoms/schedule';
import { FetchCycleNamesAtom } from '@app/atoms/cycles';
import { type ScheduleConfig, type SchedulePreview } from '@app/types/schedule';
import { getSchedulePreview } from '@app/services/schedule';
import { SolarTimesPreview } from './subcomponents/SolarTimesPreview';
import { DailyWindowsSection } from './subcomponents/DailyWindowsSection';
import { BrightnessKeyframesSection } from './subcomponents/BrightnessKeyframesSection';
import { CalendarOverridesSection } from './subcomponents/CalendarOverridesSection';

const DIVIDER_STYLE = { borderTop: '1px solid #3a3a3a', paddingTop: '24px' };

export const SchedulePage: FC = () => {
    const serverConfig = useAtomValue(ScheduleConfigAtom);
    const fetchSchedule = useSetAtom(FetchScheduleAtom);
    const saveSchedule = useSetAtom(SaveScheduleAtom);
    const fetchCycleNames = useSetAtom(FetchCycleNamesAtom);

    const [config, setConfig] = useState<ScheduleConfig>(serverConfig);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<SchedulePreview | null>(null);

    const refreshPreview = useCallback(async () => {
        const p = await getSchedulePreview();
        setPreview(p);
    }, []);

    useEffect(() => {
        fetchSchedule();
        refreshPreview();
        fetchCycleNames();
    }, []);

    useEffect(() => {
        setConfig(serverConfig);
    }, [serverConfig]);

    const patch = (updates: Partial<ScheduleConfig>) => setConfig(c => ({ ...c, ...updates }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveSchedule(config);
            await refreshPreview();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div css={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px' }}>
            <h2 css={{ margin: 0 }}>Schedule</h2>

            {/* Enable toggle */}
            <Switch
                large
                label="Scheduling enabled"
                checked={config.enabled}
                onChange={e => patch({ enabled: e.currentTarget.checked })}
                innerLabel="OFF"
                innerLabelChecked="ON"
                alignIndicator="right"
            />

            {/* Location */}
            <div>
                <h4 css={{ marginBottom: '8px' }}>Location</h4>
                <p css={{ color: '#888', fontSize: '13px', marginTop: 0 }}>
                    Required for solar event times (sunrise, sunset, twilight).
                </p>
                <div css={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <FormGroup label="Latitude" inline>
                        <NumericInput
                            value={config.location.latitude ?? ''}
                            onValueChange={v =>
                                patch({ location: { ...config.location, latitude: isNaN(v) ? null : v } })
                            }
                            placeholder="e.g. 40.71"
                            min={-90}
                            max={90}
                            stepSize={0.01}
                            minorStepSize={null}
                            style={{ width: '120px' }}
                        />
                    </FormGroup>
                    <FormGroup label="Longitude" inline>
                        <NumericInput
                            value={config.location.longitude ?? ''}
                            onValueChange={v =>
                                patch({ location: { ...config.location, longitude: isNaN(v) ? null : v } })
                            }
                            placeholder="e.g. -74.01"
                            min={-180}
                            max={180}
                            stepSize={0.01}
                            minorStepSize={null}
                            style={{ width: '120px' }}
                        />
                    </FormGroup>
                </div>
            </div>

            {/* Solar times preview */}
            <div css={DIVIDER_STYLE}>
                <SolarTimesPreview preview={preview} onRefresh={refreshPreview} />
            </div>

            {/* Daily on/off windows */}
            <div css={DIVIDER_STYLE}>
                <DailyWindowsSection windows={config.dailyWindows} onChange={dailyWindows => patch({ dailyWindows })} />
            </div>

            {/* Brightness keyframes */}
            <div css={DIVIDER_STYLE}>
                <BrightnessKeyframesSection
                    keyframes={config.brightnessKeyframes}
                    onChange={brightnessKeyframes => patch({ brightnessKeyframes })}
                    preview={preview}
                />
            </div>

            {/* Calendar overrides */}
            <div css={DIVIDER_STYLE}>
                <CalendarOverridesSection
                    overrides={config.calendarOverrides}
                    onChange={calendarOverrides => patch({ calendarOverrides })}
                    preview={preview}
                />
            </div>

            {/* Save bar */}
            <div css={{ ...DIVIDER_STYLE, display: 'flex', gap: '10px' }}>
                <Button intent="primary" loading={saving} onClick={handleSave} icon="floppy-disk">
                    Save Schedule
                </Button>
                <Button onClick={() => setConfig(serverConfig)} disabled={saving}>
                    Revert
                </Button>
            </div>
        </div>
    );
};
