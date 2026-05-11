import { CommandResponse } from '@app/types/command';

const API_BASE_ROUTE = '/api/actions';

export const sendCommand = async (commandName: string): Promise<CommandResponse<void>> => {
    const response = await fetch(`${API_BASE_ROUTE}/${commandName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const result = (await response.json()) as CommandResponse<void>;
    return result;
};
