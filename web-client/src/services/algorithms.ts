import { CommandResponse } from '@app/types/command';

const API_BASE = '/api/algorithms';

export interface AlgorithmSource {
    config: string;
    algorithm: string;
}

export interface PropertySchema {
    type: string;
    title?: string;
    description?: string;
    default?: unknown;
    minimum?: number;
    maximum?: number;
    inclusiveMinimum?: number;
    inclusiveMaximum?: number;
    minItems?: number;
    maxItems?: number;
    items?: PropertySchema;
    properties?: Record<string, PropertySchema>;
    enum?: unknown[];
}

export interface OptionsSchema {
    properties?: Record<string, PropertySchema>;
    default?: Record<string, unknown>;
}

export interface AlgorithmConfig {
    name: string;
    refresh_rate: number;
    options: OptionsSchema;
}

export const getAlgorithmNames = async (): Promise<string[]> => {
    const response = await fetch(API_BASE);
    const result = (await response.json()) as CommandResponse<string[]>;
    return result.response;
};

export const getAlgorithmSource = async (name: string): Promise<AlgorithmSource> => {
    const response = await fetch(`${API_BASE}/${name}/source`);
    const result = (await response.json()) as CommandResponse<AlgorithmSource>;
    if (!result.accepted) throw new Error(`Source not found for algorithm: ${name}`);
    return result.response;
};

export const getAlgorithmConfig = async (name: string): Promise<AlgorithmConfig> => {
    const response = await fetch(`${API_BASE}/${name}/config`);
    const result = (await response.json()) as CommandResponse<AlgorithmConfig>;
    if (!result.accepted) throw new Error(`Config not found for algorithm: ${name}`);
    return result.response;
};
