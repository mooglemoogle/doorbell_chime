import { BaseAlgorithm } from '../_meta/index.js'
import { config } from './config.js'

export class Algorithm extends BaseAlgorithm {
  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    const perItem = 1.0 / numPixels
    for (let n = 0; n < numPixels; n++) {
      const pixel = this.pixels[n]
      pixel.hue = perItem * n
      pixel.sat = 1.0
      pixel.val = 1.0
    }
  }

  runCycle(_elapsedMillis: number, elapsedSeconds: number): boolean {
    const speed = (this.settings()['speed'] as number) / 360.0
    const reverser = this.settings()['reverse'] ? -1 : 1
    const toMove = speed * elapsedSeconds * reverser

    for (const pixel of this.pixels) {
      let newHue = pixel.hue + toMove
      if (newHue > 1.0) newHue -= 1.0
      else if (newHue < 0.0) newHue += 1.0
      pixel.hue = newHue
    }

    return super.runCycle(_elapsedMillis, elapsedSeconds)
  }
}
