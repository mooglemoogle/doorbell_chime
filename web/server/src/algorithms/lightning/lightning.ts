import { BaseAlgorithm, Pixel, Pulse } from '../_meta/index'
import { config } from './config'

interface Bolt {
  pulse: Pulse
  percentage: number
}

const BUMP_PERC = 0.3

export class Algorithm extends BaseAlgorithm {
  private bolts: Bolt[] = []
  private readonly flashColor: Pixel
  private readonly maxBolts: number
  private readonly boltProb: number
  private readonly bumpProb: number

  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    const color = settings['color'] as number[]
    this.flashColor = new Pixel(color[0], color[1], color[2], color[3] ?? 0)
    this.maxBolts = settings['max_bolts'] as number
    this.boltProb = settings['bolt_prob'] as number
    this.bumpProb = settings['bump_prob'] as number
  }

  private addBolt(): void {
    if (this.bolts.length < this.maxBolts && Math.random() < this.boltProb) {
      const position = Math.floor(Math.random() * this.pixels.length)
      const width = 4 + Math.floor(Math.random() * 16)
      this.bolts.push({
        pulse: new Pulse(
          position,
          new Pixel(this.flashColor.hue, this.flashColor.sat, this.flashColor.val),
          width,
          4,
          4,
        ),
        percentage: 1.0,
      })
    }
  }

  private fadeBolts(elapsedSeconds: number): void {
    for (const bolt of this.bolts) {
      if (Math.random() < this.bumpProb) {
        bolt.percentage = Math.min(1.0, bolt.percentage + BUMP_PERC)
      } else {
        bolt.percentage = Math.max(0, bolt.percentage - elapsedSeconds * 0.5)
      }
      bolt.pulse.color.val = bolt.percentage * this.flashColor.val
    }
  }

  private clearBolts(): void {
    this.bolts = this.bolts.filter(bolt => bolt.percentage > 0)
  }

  runCycle(elapsedMillis: number, elapsedSeconds: number): boolean {
    for (const pixel of this.pixels) pixel.clear()

    this.fadeBolts(elapsedSeconds)
    this.clearBolts()
    this.addBolt()

    for (const bolt of this.bolts) {
      bolt.pulse.applyPulse(this.pixels)
    }

    return super.runCycle(elapsedMillis, elapsedSeconds)
  }
}
