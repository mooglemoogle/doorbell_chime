import { getStatus, setBrightness, setCurrentCycle, setRunning } from '@app/services/status';
import { Status } from '@app/types/status';
import { atom } from 'jotai';
import { loadable } from 'jotai/utils';

export const StatusAtom = atom<Status>({} as Status);

export const FetchStatusAtom = atom(null, async (_get, set) => {
    const status = await getStatus();
    set(StatusAtom, status);
});

export const LoadableFetchStatusAtom = loadable(FetchStatusAtom);

export const RunningStatus = atom(
    get => {
        const status = get(StatusAtom);
        return !!status.running;
    },
    async (get, set, running: boolean) => {
        const status = get(StatusAtom);
        await setRunning(running);
        set(StatusAtom, { ...status, running });
    },
);

export const BrightnessStatus = atom(
    get => {
        const status = get(StatusAtom);
        return status.brightness || 0;
    },
    async (get, set, brightness: number) => {
        const status = get(StatusAtom);
        await setBrightness(brightness);
        set(StatusAtom, { ...status, brightness });
    },
);

export const CurrentCycleStatus = atom(
    get => {
        const status = get(StatusAtom);
        return status.current_cycle;
    },
    async (get, set, cycle: string) => {
        const status = get(StatusAtom);
        await setCurrentCycle(cycle);
        set(StatusAtom, { ...status, current_cycle: cycle });
    },
);
