import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface HardwareConfig {
    index_start: number;
    index_end: number;
    gpio_pin: number;
    bpp: 3 | 4;
    order: string;
    skip: number[];
}

export interface ServerConfig {
    host: string;
    wsPort: number;
}

export interface PhysicalLocation {
    x: number;
    y: number;
    z: number;
}

export interface PhysicalConfig {
    length_meters: number;
    location: {
        start: PhysicalLocation;
        end: PhysicalLocation;
    };
}

export interface StripConfig {
    stripId: string;
    server: ServerConfig;
    hardware: HardwareConfig;
    physical: PhysicalConfig;
}

export function loadStripConfig(path = resolve(__dirname, "../strip_config.json")): StripConfig {
    if (!existsSync(path)) {
        throw new Error(`strip_config.json not found at ${path}`);
    }
    return JSON.parse(readFileSync(path, "utf-8")) as StripConfig;
}
