import { BaseAlgorithm } from '../_meta/index.js'
import { config } from './config.js'

export class Algorithm extends BaseAlgorithm {
  private readonly numTwinkles: number
  private readonly freq: number
  private readonly fadeTime: number
  private twinkles: number[]
  private sinceChoose = 0

  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    this.numTwinkles = Math.ceil((settings['density'] as number) * numPixels)
    this.freq = settings['freq'] as number
    this.fadeTime = settings['fadeTime'] as number
    this.twinkles = new Array(numPixels).fill(0)

    for (const pixel of this.pixels) {
      pixel.hue = 0
      pixel.sat = 0
      pixel.val = 0
    }

    this.chooseTwinkles()
  }

  private chooseTwinkles(): void {
    const indices = Array.from({ length: this.pixels.length }, (_, i) => i)
    // Fisher-Yates partial shuffle to pick numTwinkles unique indices
    for (let i = 0; i < this.numTwinkles; i++) {
      const j = i + Math.floor(Math.random() * (indices.length - i))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
      const n = indices[i]
      if (this.twinkles[n] === 0) {
        this.twinkles[n] = 1.0
      }
    }
  }

  runCycle(_elapsedMillis: number, elapsedSeconds: number): boolean {
    this.sinceChoose += elapsedSeconds
    if (this.sinceChoose > this.freq) {
      this.sinceChoose -= this.freq
      this.chooseTwinkles()
    }

    const fadeAmount = elapsedSeconds / this.fadeTime

    for (let i = 0; i < this.pixels.length; i++) {
      const pixel = this.pixels[i]
      if (this.twinkles[i] > 0) {
        this.twinkles[i] = Math.max(0, this.twinkles[i] - fadeAmount)
      }
      pixel.val = this.twinkles[i]
    }

    return super.runCycle(_elapsedMillis, elapsedSeconds)
  }
}
