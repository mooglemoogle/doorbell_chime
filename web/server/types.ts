export interface LightStripConfig {
    index_start: number;
    index_end: number;
    gpio_pin: 'D18';
    bpp: 3 | 4;
    order: 'GRB' | 'RGB' | 'RGBW' | 'GRBW';
    skip: number[];
}

export interface LightsSettings {
    light_strips: LightStripConfig[];
    running: boolean;
    brightness: number;
    transition_time: number;
}
