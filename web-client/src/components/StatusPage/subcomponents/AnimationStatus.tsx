import { FC, useState, useCallback } from 'react';
import { H4, Tag } from '@blueprintjs/core';
import { useAtomValue } from 'jotai';
import { StatusAtom } from '@app/atoms/status';
import { getSchedulePreview } from '@app/services/schedule';
import { useInterval } from '@utils/useInterval';
import type { CalendarOverride, SchedulePreview } from '@app/types/schedule';

function formatDuration(ms: number): string {
    if (ms < 0) return 'any moment';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

function formatAlgorithmName(name: string): string {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatOverride(o: CalendarOverride): string {
    switch (o.type) {
        case 'specific': return `Specific date: ${o.date}`;
        case 'annual': return `Annual: ${o.date}`;
        case 'range': return `Range: ${o.startDate} – ${o.endDate}`;
    }
}

const row = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '12px',
    padding: '3px 0',
    fontSize: '13px',
};

const label = {
    opacity: 0.6,
    flexShrink: 0,
};

const value = {
    textAlign: 'right' as const,
    wordBreak: 'break-all' as const,
};

const card = {
    padding: '12px 14px',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
};

export const AnimationStatus: FC = () => {
    const status = useAtomValue(StatusAtom);
    const [preview, setPreview] = useState<SchedulePreview | null>(null);
    const [now, setNow] = useState(Date.now());

    const refreshPreview = useCallback(() => {
        getSchedulePreview().then(setPreview).catch(() => {});
    }, []);

    useInterval(refreshPreview, 30000);
    useInterval(() => setNow(Date.now()), 1000);

    const alg = status.current_algorithm;
    const lastChange = status.last_change_time;
    const nextChange = status.next_change_time;
    const inTransition = status.is_in_transition;

    const showPattern = status.running && (alg != null || inTransition);

    const hasScheduleInfo = preview != null && (
        preview.activeOverride != null ||
        preview.resolvedWindows.length > 0 ||
        preview.brightnessSchedule.some(p => p.source === 'keyframe')
    );

    if (!showPattern && !hasScheduleInfo) return null;

    return (
        <div css={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            '@media (min-width: 680px)': {
                flexDirection: 'row',
                alignItems: 'flex-start',
                '& > div': { flex: '1 1 0', minWidth: 0 },
            },
        }}>
            {showPattern && (
                <div>
                    <H4 css={{ marginBottom: '10px' }}>Current Pattern</H4>
                    <div css={{ ...card, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div css={row}>
                            <span css={label}>Algorithm</span>
                            <span css={value}>
                                {inTransition && (
                                    <Tag minimal intent="primary" css={{ marginRight: '6px' }}>transitioning</Tag>
                                )}
                                {alg
                                    ? (status.current_algorithm_display_name ?? formatAlgorithmName(alg))
                                    : '—'}
                            </span>
                        </div>

                        {!inTransition && lastChange != null && (
                            <div css={row}>
                                <span css={label}>Running for</span>
                                <span css={value}>{formatDuration(now - lastChange)}</span>
                            </div>
                        )}

                        {!inTransition && (
                            <div css={row}>
                                <span css={label}>Next switch</span>
                                <span css={value}>
                                    {nextChange == null
                                        ? 'indefinite'
                                        : nextChange - now < 0
                                            ? 'any moment'
                                            : `in ${formatDuration(nextChange - now)}`}
                                </span>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {hasScheduleInfo && (
                <div>
                    <H4 css={{ marginBottom: '10px' }}>Today's Schedule</H4>
                    <div css={{ ...card, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {preview!.activeOverride != null && (
                            <div css={row}>
                                <span css={label}>Override</span>
                                <span css={{ ...value, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Tag minimal intent="warning">active</Tag>
                                    {formatOverride(preview!.activeOverride)}
                                    {' → '}
                                    {preview!.activeOverride.cycle ?? 'Off'}
                                </span>
                            </div>
                        )}

                        {preview!.resolvedWindows.map((w, i) => (
                            <div key={i} css={row}>
                                <span css={label}>Window {preview!.resolvedWindows.length > 1 ? i + 1 : ''}</span>
                                <span css={value}>
                                    {w.onTime ?? '—'}
                                    {w.offTime != null ? ` – ${w.offTime}` : ' (no off time)'}
                                </span>
                            </div>
                        ))}

                        {preview!.brightnessSchedule.filter(p => p.source === 'keyframe').map((p, i) => (
                            <div key={i} css={row}>
                                <span css={label}>Brightness at {p.time}</span>
                                <span css={value}>{Math.round(p.brightness * 100)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
