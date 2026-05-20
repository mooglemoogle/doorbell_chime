export interface StripReportedStats {
    framesApplied: number;
    underruns: number;
    drops: number;
    processUptimeSecs: number;
    targetFps: number;
    measuredFps?: number;
    avgLatencyMs?: number;
    avgFrameIntervalMs?: number;
}

export interface StripMetrics {
    connectedAt: number;
    uptimeMs: number;
    avgFpsSent: number;
    minBuffer: number;
    maxBuffer: number;
    reported: StripReportedStats | null;
}

export interface Strip {
    stripId: string;
    numPixels: number;
    pixelOffset: number;
    bpp: number;
    connected: boolean;
    disabled: boolean;
    bufferedFrames: number;
    lastSeen: number | null;
    metrics: StripMetrics | null;
    physical: {
        length_meters: number;
        location: {
            start: { x: number; y: number; z: number };
            end: { x: number; y: number; z: number };
        };
    };
}

const BASE = '/api/strips';

export const getStrips = async (): Promise<Strip[]> => {
    const res = await fetch(BASE);
    return res.json() as Promise<Strip[]>;
};

export const removeStrip = async (stripId: string): Promise<void> => {
    await fetch(`${BASE}/${encodeURIComponent(stripId)}`, { method: 'DELETE' });
};

export const disableStrip = async (stripId: string): Promise<void> => {
    await fetch(`${BASE}/${encodeURIComponent(stripId)}/disable`, { method: 'POST' });
};

export const enableStrip = async (stripId: string): Promise<void> => {
    await fetch(`${BASE}/${encodeURIComponent(stripId)}/enable`, { method: 'POST' });
};
