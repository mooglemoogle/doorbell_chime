import { BaseAlgorithm, AlgorithmConfig, Pixel, getMillis, bezierBlend } from './_meta/index.js'

export const config: AlgorithmConfig = {
  name: 'Transition',
  options: {},
  refresh_rate: 60,
}

export class Algorithm extends BaseAlgorithm {
  private previousPixels: Pixel[] = []
  private nextPixels: Pixel[] = []
  private startTime = 0

  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
  }

  transitionTime(): number {
    return this.settings()['transition_time'] as number
  }

  reset(previousPixels: Pixel[], nextPixels: Pixel[]): void {
    this.previousPixels = previousPixels
    this.nextPixels = nextPixels
    this.startTime = getMillis()
  }

  runCycle(_elapsedMillis: number, _elapsedSeconds: number): boolean {
    const now = getMillis()

    if (now - this.startTime > this.transitionTime()) {
      for (let i = 0; i < this.pixels.length; i++) {
        const pixel = this.pixels[i]
        const next = this.nextPixels[i]
        pixel.hue = next.hue
        pixel.sat = next.sat
        pixel.val = next.val
        pixel.white = next.white
      }
      return true
    }

    const elapsed = now - this.startTime
    const percentage = elapsed / this.transitionTime()
    const lightPercent = bezierBlend(percentage)

    for (let i = 0; i < this.pixels.length; i++) {
      const pixel = this.pixels[i]
      const prev = this.previousPixels[i]
      const next = this.nextPixels[i]
      pixel.hue = prev.hue + (next.hue - prev.hue) * lightPercent
      pixel.sat = prev.sat + (next.sat - prev.sat) * lightPercent
      pixel.val = prev.val + (next.val - prev.val) * lightPercent
      pixel.white = prev.white + (next.white - prev.white) * lightPercent
    }
    return false
  }
}
