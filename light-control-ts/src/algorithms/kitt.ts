import { BaseAlgorithm, AlgorithmConfig } from './_meta/index.js'

export const config: AlgorithmConfig = {
  name: 'KITT',
  options: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      color: {
        title: 'Color (HSV)',
        type: 'array',
        minItems: 3,
        maxItems: 4,
        items: { type: 'number', inclusiveMinimum: 0.0, inclusiveMaximum: 1.0 },
      },
      width: { title: 'Number of Pixels for Solid Light', type: 'float', default: 3 },
      speed: { title: 'Seconds per cycle (higher is slower)', type: 'float', default: 4 },
      fade_time: {
        title: 'Fade time',
        description: 'Time it takes for a pixel to fade once it no longer lit (seconds)',
        type: 'float',
        default: 1,
      },
      border: {
        title: 'Border',
        description: 'Limit size of effect with a border on each side',
        type: 'integer',
        default: 0,
      },
    },
    default: { color: [0, 1.0, 1.0], width: 3, speed: 4, fade_time: 1, border: 0 },
  },
  refresh_rate: 60,
}

export class Algorithm extends BaseAlgorithm {
  private readonly speed: number
  private readonly halfWidth: number
  private readonly color: number[]
  private readonly border: number
  private readonly effectSize: number
  private readonly perSecond: number
  private readonly fadePerSecond: number
  private right = true
  private pulseLoc = 0

  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    this.speed = settings['speed'] as number
    this.halfWidth = (settings['width'] as number) / 2
    this.color = settings['color'] as number[]
    this.border = (settings['border'] as number) ?? 0
    this.effectSize = this.pixels.length - this.border * 2
    this.perSecond = (this.effectSize * 2) / this.speed
    this.fadePerSecond = 1.0 / (settings['fade_time'] as number)
  }

  runCycle(elapsedMillis: number, elapsedSeconds: number): boolean {
    this.pulseLoc += elapsedSeconds * this.perSecond * (this.right ? 1 : -1)

    if (this.pulseLoc > this.effectSize) {
      this.pulseLoc = this.effectSize - (this.pulseLoc - this.effectSize)
      this.right = false
    } else if (this.pulseLoc < 0) {
      this.pulseLoc *= -1
      this.right = true
    }

    for (let n = 0; n < this.effectSize; n++) {
      const pixel = this.pixels[n + this.border]
      if (n >= Math.round(this.pulseLoc - this.halfWidth) && n <= Math.round(this.pulseLoc + this.halfWidth)) {
        pixel.set(this.color[0], this.color[1], this.color[2], this.color[3] ?? 0)
      } else {
        pixel.val = Math.max(pixel.val - this.fadePerSecond * elapsedSeconds, 0)
      }
    }

    return super.runCycle(elapsedMillis, elapsedSeconds)
  }
}
