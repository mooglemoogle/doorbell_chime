import { BaseAlgorithm, AlgorithmConfig, Pixel } from './_meta/index.js'

export const config: AlgorithmConfig = {
  name: 'Off',
  options: {},
  refresh_rate: 2,
}

export class Algorithm extends BaseAlgorithm {
  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
  }

  setHueSat(previousPixels: Pixel[]): void {
    for (let i = 0; i < this.pixels.length; i++) {
      const pixel = this.pixels[i]
      pixel.hue = previousPixels[i].hue
      pixel.sat = previousPixels[i].sat
      pixel.val = 0
      pixel.white = 0
    }
  }
}
