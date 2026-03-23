import { BaseAlgorithm, Pixel } from '../_meta/index.js'
import { config } from './config.js'

export class Algorithm extends BaseAlgorithm {
  private readonly colors: number[][]
  private cycle = 0
  private sinceChange = 0
  private readonly cycleTime: number

  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    this.colors = settings['colors'] as number[][]
    this.cycleTime = settings['freq'] as number
    this.setColors()
  }

  private setBlack(pixel: Pixel): void {
    pixel.hue = 0
    pixel.sat = 0
    pixel.val = 0
  }

  private setColor(pixel: Pixel, index: number): void {
    const color = this.colors[index]
    pixel.hue = color[0]
    pixel.sat = color[1]
    pixel.val = color[2]
  }

  private setColors(): void {
    const numColors = this.colors.length
    let count = Math.floor(this.cycle / 2)
    const isEvenCycle = this.cycle % 2 === 0

    for (let n = 0; n < this.pixels.length; n++) {
      const pixel = this.pixels[n]
      const isEven = n % 2 === 0

      if (isEvenCycle === isEven) {
        this.setBlack(pixel)
      } else {
        this.setColor(pixel, count)
        count++
        if (count >= numColors) count = 0
      }
    }

    this.cycle++
    if (this.cycle >= numColors * 2) this.cycle = 0
  }

  runCycle(_elapsedMillis: number, elapsedSeconds: number): boolean {
    this.sinceChange += elapsedSeconds
    if (this.sinceChange > this.cycleTime) {
      this.sinceChange -= this.cycleTime
      this.setColors()
    }
    return super.runCycle(_elapsedMillis, elapsedSeconds)
  }
}
