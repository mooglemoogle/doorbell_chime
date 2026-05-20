import { BaseAlgorithm } from '../_meta/index'
import { hsvToRgb } from '../_meta/helpers'
import { config } from './config'

export class Algorithm extends BaseAlgorithm {
  private readonly colors: number[][]
  private readonly width: number
  private readonly blendWidth: number
  private readonly speed: number
  private readonly segmentLength: number
  private readonly patternLength: number
  private offset = 0

  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    this.colors = (settings['colors'] as number[][]) ?? [[0, 1, 1], [0.333, 1, 1], [0.667, 1, 1]]
    this.width = Math.max(1, (settings['width'] as number) ?? 10)
    this.blendWidth = Math.max(0, (settings['blend_width'] as number) ?? 5)
    this.speed = (settings['speed'] as number) ?? 20
    this.segmentLength = this.width + this.blendWidth
    this.patternLength = this.colors.length * this.segmentLength
  }

  runCycle(elapsedMillis: number, elapsedSeconds: number): boolean {
    this.offset = (this.offset + this.speed * elapsedSeconds) % this.patternLength

    for (let i = 0; i < this.pixels.length; i++) {
      const p = ((i + this.offset) % this.patternLength + this.patternLength) % this.patternLength
      const segIdx = Math.floor(p / this.segmentLength)
      const posInSeg = p - segIdx * this.segmentLength

      const c1 = this.colors[segIdx % this.colors.length]
      const c2 = this.colors[(segIdx + 1) % this.colors.length]

      if (this.blendWidth === 0 || posInSeg < this.width) {
        this.pixels[i].set(c1[0], c1[1], c1[2])
      } else {
        const t = (posInSeg - this.width) / this.blendWidth
        const [r1, g1, b1] = hsvToRgb(c1[0], c1[1], c1[2])
        const [r2, g2, b2] = hsvToRgb(c2[0], c2[1], c2[2])
        this.pixels[i].fromRgb(
          r1 + (r2 - r1) * t,
          g1 + (g2 - g1) * t,
          b1 + (b2 - b1) * t,
        )
      }
    }

    return super.runCycle(elapsedMillis, elapsedSeconds)
  }
}
