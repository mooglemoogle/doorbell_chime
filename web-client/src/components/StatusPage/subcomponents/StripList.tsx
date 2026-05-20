import { FC, useCallback, useEffect, useState } from 'react';
import { Alert, Button, H4, Tag } from '@blueprintjs/core';
import { useInterval } from '@utils/useInterval';
import { getStrips, removeStrip, disableStrip, enableStrip, Strip, StripMetrics, StripReportedStats } from '@services/strips';

function formatUptime(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

const statBlock = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: '1px',
    minWidth: '52px',
};

const statValue = {
    fontSize: '13px',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.2,
};

const statLabel = {
    fontSize: '10px',
    opacity: 0.5,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
};

function MetricsStat({ value, label }: { value: string; label: string }) {
    return (
        <div css={statBlock}>
            <span css={statValue}>{value}</span>
            <span css={statLabel}>{label}</span>
        </div>
    );
}

function StripMetricsRow({ metrics }: { metrics: StripMetrics }) {
    const r: StripReportedStats | null = metrics.reported;
    const sessionMs = Date.now() - metrics.connectedAt;

    // Prefer strip-reported process uptime; fall back to server-tracked connection uptime
    const uptimeDisplay = r != null
        ? formatUptime(r.processUptimeSecs * 1000)
        : formatUptime(metrics.uptimeMs);
    const uptimeLabel = r != null ? 'Process uptime' : 'Uptime';

    return (
        <div css={{
            display: 'flex',
            gap: '16px',
            paddingTop: '8px',
            marginTop: '6px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            flexWrap: 'wrap',
        }}>
            <MetricsStat value={uptimeDisplay} label={uptimeLabel} />
            <MetricsStat value={formatUptime(sessionMs)} label="Connected" />
            {r != null ? (
                <>
                    <MetricsStat
                        value={r.measuredFps != null ? `${r.measuredFps.toFixed(1)}/${r.targetFps}` : r.framesApplied.toString()}
                        label={r.measuredFps != null ? 'FPS' : 'Applied'}
                    />
                    <MetricsStat value={`${metrics.minBuffer}–${metrics.maxBuffer}`} label="Buffer" />
                    <MetricsStat value={r.underruns.toString()} label="Underruns" />
                    <MetricsStat value={r.drops.toString()} label="Drops" />
                    {r.avgLatencyMs != null && (
                        <MetricsStat value={`${r.avgLatencyMs.toFixed(1)}ms`} label="Latency" />
                    )}
                </>
            ) : (
                <>
                    <MetricsStat value={metrics.avgFpsSent.toFixed(1)} label="Sent FPS" />
                    <MetricsStat value={`${metrics.minBuffer}–${metrics.maxBuffer}`} label="Buffer" />
                </>
            )}
        </div>
    );
}

export const StripList: FC = () => {
    const [strips, setStrips] = useState<Strip[]>([]);
    const [removeTarget, setRemoveTarget] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setStrips(await getStrips());
        } catch { /* server not reachable */ }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);
    useInterval(refresh, 5000);

    const handleDisable = useCallback(async (id: string) => {
        await disableStrip(id);
        refresh();
    }, [refresh]);

    const handleEnable = useCallback(async (id: string) => {
        await enableStrip(id);
        refresh();
    }, [refresh]);

    const handleRemoveConfirm = useCallback(async () => {
        if (!removeTarget) return;
        await removeStrip(removeTarget);
        setRemoveTarget(null);
        refresh();
    }, [removeTarget, refresh]);

    if (strips.length === 0) return null;

    return (
        <div>
            <H4 css={{ marginBottom: '12px' }}>Light Strips</H4>
            <div css={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {strips.map(strip => (
                    <div
                        key={strip.stripId}
                        css={{
                            padding: '10px 14px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <div css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            <div css={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                                <span css={{ fontWeight: 600, fontFamily: 'monospace' }}>{strip.stripId}</span>
                                <Tag minimal intent={strip.connected ? 'success' : 'none'}>
                                    {strip.connected ? 'Connected' : 'Disconnected'}
                                </Tag>
                                {strip.disabled && <Tag minimal intent="warning">Disabled</Tag>}
                                <span css={{ fontSize: '12px', opacity: 0.6 }}>
                                    {strip.numPixels}px · offset {strip.pixelOffset} · {strip.bpp}bpp
                                </span>
                            </div>
                            <div css={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                <Button
                                    small
                                    minimal
                                    icon={strip.disabled ? 'eye-open' : 'eye-off'}
                                    onClick={() => strip.disabled ? handleEnable(strip.stripId) : handleDisable(strip.stripId)}
                                >
                                    {strip.disabled ? 'Enable' : 'Disable'}
                                </Button>
                                <Button
                                    small
                                    minimal
                                    intent="danger"
                                    icon="trash"
                                    onClick={() => setRemoveTarget(strip.stripId)}
                                />
                            </div>
                        </div>

                        {strip.connected && strip.metrics != null && (
                            <StripMetricsRow metrics={strip.metrics} />
                        )}
                    </div>
                ))}
            </div>

            <Alert
                isOpen={removeTarget !== null}
                intent="danger"
                icon="trash"
                confirmButtonText="Remove"
                cancelButtonText="Cancel"
                onConfirm={handleRemoveConfirm}
                onCancel={() => setRemoveTarget(null)}
            >
                <p>Remove <strong>{removeTarget}</strong> from the strip registry?</p>
                <p css={{ opacity: 0.7, fontSize: '13px' }}>
                    The strip will stop receiving frames. It will be re-added automatically if it reconnects.
                </p>
            </Alert>
        </div>
    );
};
