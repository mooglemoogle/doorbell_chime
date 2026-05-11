import { getCycleNames } from '@app/services/cycles';
import { atom } from 'jotai';
import { loadable } from 'jotai/utils';

export const CycleNamesAtom = atom<string[]>([]);

export const FetchCycleNamesAtom = atom(null, async (_get, set) => {
    const status = await getCycleNames();
    set(CycleNamesAtom, status);
});

export const LoadableFetchCycleNamesAtom = loadable(FetchCycleNamesAtom);
