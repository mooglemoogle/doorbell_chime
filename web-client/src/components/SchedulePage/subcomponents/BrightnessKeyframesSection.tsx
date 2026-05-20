import { FC } from 'react';
import { Button, Slider } from '@blueprintjs/core';
import { type BrightnessKeyframe, type ScheduleTime, type SchedulePreview } from '@app/types/schedule';
import { ScheduleTimeInput } from './ScheduleTimeInput';

interface BrightnessKeyframesSectionProps {
    keyframes: BrightnessKeyframe[]
    onChange: (keyframes: BrightnessKeyframe[]) => void
    preview: SchedulePreview | null
}

const DEFAULT_KEYFRAME: BrightnessKeyframe = { time: '18:00', brightness: 0.5 };

export const BrightnessKeyframesSection: FC<BrightnessKeyframesSectionProps> = ({ keyframes, onChange, preview }) => {

    const add = () => onChange([...keyframes, { ...DEFAULT_KEYFRAME }]);
    const remove = (i: number) => onChange(keyframes.filter((_, idx) => idx !== i));
    const update = (i: number, patch: Partial<BrightnessKeyframe>) =>
        onChange(keyframes.map((kf, idx) => (idx === i ? { ...kf, ...patch } : kf)));

    // Find matching resolved point for a keyframe to show its computed time
    const resolvedKeyframes = preview?.brightnessSchedule.filter(p => p.source === 'keyframe') ?? [];

    return (
        <div>
            <h4 css={{ marginBottom: '8px' }}>Brightness Schedule</h4>
            <p css={{ color: '#888', fontSize: '13px', marginTop: 0 }}>
                Brightness is interpolated between keyframes throughout the day.
            </p>
            {keyframes.map((kf, i) => (
                <div
                    key={i}
                    css={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                        flexWrap: 'wrap',
                    }}
                >
                    <ScheduleTimeInput
                        value={kf.time}
                        onChange={(v: ScheduleTime) => update(i, { time: v })}
                    />
                    {resolvedKeyframes[i] && (
                        <span css={{ color: '#888', fontSize: '12px', fontFamily: 'monospace' }}>
                            → {resolvedKeyframes[i].time}
                        </span>
                    )}
                    <div css={{ flex: '1 1 200px', minWidth: '150px' }}>
                        <Slider
                            min={0}
                            max={100}
                            stepSize={1}
                            labelStepSize={25}
                            labelRenderer={v => `${v}%`}
                            value={Math.round(kf.brightness * 100)}
                            onChange={v => update(i, { brightness: v / 100 })}
                        />
                    </div>
                    <span css={{ minWidth: '38px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px' }}>
                        {Math.round(kf.brightness * 100)}%
                    </span>
                    <Button small icon="trash" intent="danger" minimal onClick={() => remove(i)} />
                </div>
            ))}
            <Button small icon="plus" onClick={add}>Add keyframe</Button>
        </div>
    );
};
