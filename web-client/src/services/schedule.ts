import type { ScheduleConfig, SchedulePreview } from '@app/types/schedule';

const API_BASE = '/api/schedule';

export const getSchedule = async (): Promise<ScheduleConfig> => {
    const res = await fetch(API_BASE);
    const json = await res.json();
    return json.response as ScheduleConfig;
};

export const saveSchedule = async (config: ScheduleConfig): Promise<void> => {
    await fetch(API_BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    });
};

export const getSchedulePreview = async (): Promise<SchedulePreview> => {
    const res = await fetch(`${API_BASE}/preview`);
    const json = await res.json();
    return json.response as SchedulePreview;
};
