import { CommandResponse } from '@app/types/command';
import type { AlgorithmConfig } from './algorithms';

const API_BASE_ROUTE = '/api/actions';
const CYCLES_API = '/api/cycles';

export const getCycleNames = async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE_ROUTE}/get_cycles`);
    const result = await response.json();
    return result.response;
};

export interface CycleEntryDetail {
    algorithm: string;
    seconds_in_cycle: number;
    display_name?: string;
    options: Record<string, unknown>;
    algorithmConfig: AlgorithmConfig | null;
}

export interface CycleDetail {
    name: string;
    cycles: CycleEntryDetail[];
}

export const fetchCycleDetail = async (name: string): Promise<CycleDetail> => {
    const response = await fetch(`${CYCLES_API}/${encodeURIComponent(name)}`);
    const result = (await response.json()) as CommandResponse<CycleDetail>;
    if (!result.accepted) throw new Error(`Cycle not found: ${name}`);
    return result.response;
};

export const saveCycle = async (cycle: CycleDetail): Promise<void> => {
    const body = {
        name: cycle.name,
        cycles: cycle.cycles.map(({ algorithmConfig: _config, ...entry }) => entry),
    };
    const response = await fetch(`${CYCLES_API}/${encodeURIComponent(cycle.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Failed to save cycle');
};
