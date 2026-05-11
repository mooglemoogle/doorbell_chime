import { BaseAlgorithm, AlgorithmConfig } from "./_meta/index";

export const config: AlgorithmConfig = {
    name: "Blank",
    options: {},
    refresh_rate: 2,
};

export class Algorithm extends BaseAlgorithm {
    constructor(numPixels: number, settings: Record<string, unknown>) {
        super(numPixels, config, settings);
        for (const pixel of this.pixels) {
            pixel.hue = 0;
            pixel.sat = 0;
            pixel.val = 0;
            pixel.white = 0;
        }
    }
}
