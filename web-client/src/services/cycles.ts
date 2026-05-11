const API_BASE_ROUTE = '/api/actions';

export const getCycleNames = async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE_ROUTE}/get_cycles`);
    const result = await response.json();
    return result.response;
};
