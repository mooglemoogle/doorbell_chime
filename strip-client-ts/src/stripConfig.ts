import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";

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

const DEFAULT_CONFIG_PATH = join(homedir(), '.local', 'lights-control', 'strip_config.json');

async function ask(rl: ReturnType<typeof createInterface>, question: string, def: string): Promise<string> {
    const answer = await rl.question(`  ${question} [${def}]: `);
    return answer.trim() || def;
}

async function runSetupWizard(configPath: string): Promise<StripConfig> {
    const rl = createInterface({ input, output });
    console.log(`\nNo config found at ${configPath}. Let's set one up.\n`);

    const stripId        = await ask(rl, 'Strip ID',                          'my-strip');
    const host           = await ask(rl, 'Server host',                       'localhost');
    const wsPort         = parseInt(await ask(rl, 'Server WebSocket port',    '3002'));
    const indexStart     = parseInt(await ask(rl, 'LED index start',          '0'));
    const indexEnd       = parseInt(await ask(rl, 'LED index end (inclusive)', '29'));
    const gpioPin        = parseInt(await ask(rl, 'GPIO pin',                 '18'));
    const bppRaw         = parseInt(await ask(rl, 'Bytes per pixel (3=RGB, 4=RGBW)', '3'));
    const bpp            = (bppRaw === 4 ? 4 : 3) as 3 | 4;
    const order          = await ask(rl, 'Pixel order',                       'GRB');
    const lengthMeters   = parseFloat(await ask(rl, 'Strip length (meters)',  '1.0'));

    rl.close();

    const config: StripConfig = {
        stripId,
        server: { host, wsPort },
        hardware: { index_start: indexStart, index_end: indexEnd, gpio_pin: gpioPin, bpp, order, skip: [] },
        physical: {
            length_meters: lengthMeters,
            location: {
                start: { x: 0, y: 0, z: 0 },
                end:   { x: lengthMeters, y: 0, z: 0 },
            },
        },
    };

    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`\nConfig saved to ${configPath}\n`);
    return config;
}

export async function loadStripConfig(): Promise<StripConfig> {
    const envPath = process.env['STRIP_CONFIG'];
    const configPath = envPath ?? DEFAULT_CONFIG_PATH;

    if (!existsSync(configPath)) {
        if (envPath) throw new Error(`strip_config.json not found at ${configPath}`);
        return runSetupWizard(configPath);
    }
    return JSON.parse(readFileSync(configPath, "utf-8")) as StripConfig;
}
