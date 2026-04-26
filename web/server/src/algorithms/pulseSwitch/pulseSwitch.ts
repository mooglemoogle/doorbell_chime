import { BaseAlgorithm, Pixel } from '../_meta/index'
import { config } from './config'

export class Algorithm extends BaseAlgorithm {
  private evenCycle = true
  private fadePercent = 1.0
  private readonly colors: number[][]
  private currentOnTime = 0
  private currentPulseDownTime = 0
  private currentPulseUpTime = 0
  private readonly onTime: number
  private readonly halfPulse: number
  private readonly lightsPerColor: number
  private readonly spaceBetween: number

  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    this.colors = settings['colors'] as number[][]
    this.onTime = settings['onTime'] as number
    this.halfPulse = (settings['pulseTime'] as number) / 2.0
    this.lightsPerColor = settings['lightsPerColor'] as number
    this.spaceBetween = settings['spaceBetween'] as number
    this.setColors()
  }

  private setColor(pixel: Pixel, index: number): void {
    if (index === -1) {
      pixel.hue = 0; pixel.sat = 0; pixel.val = 0
      return
    }
    const color = this.colors[index]
    pixel.hue = color[0]
    pixel.sat = color[1]
    pixel.val = color[2] * this.fadePercent
  }

  private setColors(): void {
    let colorIndex = this.evenCycle ? 0 : 1
    let lightNum = 0

    for (const pixel of this.pixels) {
      if (lightNum < this.lightsPerColor) {
        this.setColor(pixel, colorIndex)
      } else {
        this.setColor(pixel, -1)
      }
      lightNum++
      if (lightNum >= this.lightsPerColor + this.spaceBetween) {
        lightNum = 0
        colorIndex++
        if (colorIndex >= 2) colorIndex = 0
      }
    }
  }

  runCycle(_elapsedMillis: number, elapsedSeconds: number): boolean {
    if (this.currentPulseDownTime >= this.halfPulse && this.currentPulseUpTime === 0) {
      this.evenCycle = !this.evenCycle
    }

    if (this.currentOnTime < this.onTime) {
      this.currentOnTime += elapsedSeconds
    } else if (this.currentPulseDownTime < this.halfPulse) {
      this.currentPulseDownTime += elapsedSeconds
      const fade = (this.halfPulse - this.currentPulseDownTime) / this.halfPulse
      this.fadePercent = Math.max(0, fade)
      this.setColors()
    } else if (this.currentPulseUpTime < this.halfPulse) {
      this.currentPulseUpTime += elapsedSeconds
      const fade = this.currentPulseUpTime / this.halfPulse
      this.fadePercent = Math.min(1.0, fade)
      this.setColors()
    } else {
      this.currentOnTime = 0
      this.currentPulseDownTime = 0
      this.currentPulseUpTime = 0
    }

    return super.runCycle(_elapsedMillis, elapsedSeconds)
  }
}
