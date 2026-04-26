import { BaseAlgorithm } from '../_meta/index'
import { config } from './config'

export class Algorithm extends BaseAlgorithm {
  private readonly num: number

  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    this.num = this.pixels.length
    const middle = this.num / 2
    const floorMiddle = Math.floor(middle)
    const centerIndices: number[] = []

    if (middle !== floorMiddle) {
      // Odd number of pixels
      centerIndices.push(floorMiddle)
    } else {
      centerIndices.push(middle - 1)
      centerIndices.push(middle)
    }

    const numOutside = (this.num - centerIndices.length) / 2
    const increasePerPixel = 1.0 / numOutside

    for (let n = 0; n < this.pixels.length; n++) {
      const pixel = this.pixels[n]
      if (centerIndices.includes(n)) {
        pixel.hue = 0.0
      } else if (n < middle) {
        pixel.hue = (numOutside - n) * increasePerPixel
      } else {
        pixel.hue = (n - centerIndices[centerIndices.length - 1]) * increasePerPixel
      }
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
