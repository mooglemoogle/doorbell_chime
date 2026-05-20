import { atom } from 'jotai';
import { getSchedule, saveSchedule } from '@app/services/schedule';
import { DEFAULT_SCHEDULE_CONFIG, type ScheduleConfig } from '@app/types/schedule';

export const ScheduleConfigAtom = atom<ScheduleConfig>(DEFAULT_SCHEDULE_CONFIG);

export const FetchScheduleAtom = atom(null, async (_get, set) => {
    const config = await getSchedule();
    set(ScheduleConfigAtom, config);
});

export const SaveScheduleAtom = atom(null, async (_get, set, config: ScheduleConfig) => {
    await saveSchedule(config);
    set(ScheduleConfigAtom, config);
});
