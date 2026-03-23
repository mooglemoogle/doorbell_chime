import { BaseAlgorithm, Pixel } from '../_meta/index.js'
import { config } from './config.js'

export class Algorithm extends BaseAlgorithm {
  private readonly reversed: number
  private readonly speed: number
  private readonly square: boolean
  private readonly locs: number[]
  private readonly baseColor: Pixel
  private readonly diff: Pixel
  private startTime = 0

  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    this.reversed = settings['reverse'] ? 1 : -1
    this.speed = settings['speed'] as number
    this.square = !!(settings['square'])

    const multiplier = (2 * Math.PI) / (settings['wavelength'] as number)
    const split = !!(settings['split'])

    if (!split) {
      this.locs = Array.from({ length: this.pixels.length }, (_, n) => n * multiplier)
    } else {
      const center = this.pixels.length / 2 - 0.5
      this.locs = Array.from({ length: this.pixels.length }, (_, n) =>
        Math.abs((n - center) * multiplier),
      )
    }

    const colors = settings['colors'] as number[][]
    this.baseColor = new Pixel(colors[0][0], colors[0][1], colors[0][2])
    this.diff = new Pixel(colors[1][0], colors[1][1], colors[1][2]).diff(this.baseColor)

    this.runCycle(0, 0)
    this.startTime = 0
  }

  runCycle(elapsedMillis: number, elapsedSeconds: number): boolean {
    const curTime = Date.now() / 1000
    if (this.startTime === 0) this.startTime = curTime

    const phase =
      (((curTime - this.startTime) % this.speed) / this.speed) * this.reversed * 2 * Math.PI

    for (let n = 0; n < this.pixels.length; n++) {
      const loc = this.locs[n]
      const pixel = this.pixels[n]

      let pos = (Math.cos(loc + phase) + 1) / 2
      if (this.square) pos = pos > 0.5 ? 1 : 0

      pixel.hue = this.baseColor.hue + this.diff.hue * pos
      pixel.sat = this.baseColor.sat + this.diff.sat * pos
      pixel.val = this.baseColor.val + this.diff.val * pos
    }

    return super.runCycle(elapsedMillis, elapsedSeconds)
  }
}
