import { CommandResponse } from '@app/types/command';
import { Status } from '@app/types/status';

const API_BASE_ROUTE = '/api/actions';

export const getStatus = async (): Promise<Status> => {
    const response = await fetch(`${API_BASE_ROUTE}/get_status`);
    const result = (await response.json()) as CommandResponse<Status>;
    return result.response;
};

export const setRunning = async (running: boolean): Promise<void> => {
    const response = await fetch(`${API_BASE_ROUTE}/${running ? 'on' : 'off'}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const result = (await response.json()) as CommandResponse<void>;
    if (!result.accepted) {
        throw new Error('Failed to set running status');
    }
};

export const setBrightness = async (brightness: number): Promise<void> => {
    const response = await fetch(`${API_BASE_ROUTE}/set_brightness/${brightness.toFixed(2)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const result = (await response.json()) as CommandResponse<void>;
    if (!result.accepted) {
        throw new Error('Failed to set brightness');
    }
};

export const setCurrentCycle = async (cycle: string): Promise<void> => {
    const response = await fetch(`${API_BASE_ROUTE}/set_cycle/${cycle}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const result = (await response.json()) as CommandResponse<void>;
    if (!result.accepted) {
        throw new Error('Failed to set cycle');
    }
};
