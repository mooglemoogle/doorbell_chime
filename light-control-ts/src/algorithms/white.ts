import { BaseAlgorithm, AlgorithmConfig } from './_meta/index.js'

export const config: AlgorithmConfig = {
  name: 'White',
  options: {},
  refresh_rate: 2,
}

export class Algorithm extends BaseAlgorithm {
  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    for (const pixel of this.pixels) {
      pixel.hue = 0
      pixel.sat = 0
      pixel.val = 1
      pixel.white = 0
    }
  }
}
