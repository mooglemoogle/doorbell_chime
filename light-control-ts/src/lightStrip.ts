import { Pixel, hsvToRgb } from './algorithms/_meta/index.js'
import { LightStripConfig } from './lightConfig.js'

const isDevMode = process.env['MODE'] === 'DEVELOPMENT'

// Lazy-import piixel so the module can load in dev mode without hardware
let ws281x: import('piixel').Ws281xAPI | null = null
let StripType: typeof import('piixel').StripType | null = null

async function getPiixel() {
  if (!ws281x) {
    const piixel = await import('piixel')
    ws281x = piixel.ws281x
    StripType = piixel.StripType
  }
  return { ws281x, StripType: StripType! }
}

function packRgb(r: number, g: number, b: number): number {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}

function packRgbw(r: number, g: number, b: number, w: number): number {
  return ((w & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}

// Terminal color preview for dev mode
function termColor(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m  \x1b[0m`
}

export class LightStrip {
  readonly stripIndex: number
  readonly indexStart: number
  readonly indexEnd: number
  private readonly gpioPin: number
  private readonly bpp: 3 | 4
  private readonly order: string
  private readonly skip: Set<number>
  private pixelArray: Uint32Array
  private initialized = false

  constructor(stripIndex: number, config: LightStripConfig) {
    this.stripIndex = stripIndex
    this.indexStart = config.index_start
    this.indexEnd = config.index_end

    if (
      this.indexStart < 0 ||
      this.indexEnd < 0 ||
      this.indexStart === this.indexEnd
    ) {
      throw new Error('No light strip index may be below zero and they must be different')
    }

    this.gpioPin = config.gpio_pin
    this.bpp = config.bpp
    this.order = config.order
    this.skip = new Set(config.skip)
    this.pixelArray = new Uint32Array(this.numPixels())
  }

  numPixels(): number {
    return Math.abs(this.indexEnd - this.indexStart) + 1
  }

  private getRanges(): [number, number][] {
    const reversed = this.indexEnd < this.indexStart
    const step = reversed ? -1 : 1
    const ranges: [number, number][] = []

    let hwIdx = 0
    for (let pixelIdx = this.indexStart; pixelIdx !== this.indexEnd + step; pixelIdx += step) {
      ranges.push([hwIdx, pixelIdx])
      hwIdx++
    }
    return ranges
  }

  async initialize(): Promise<void> {
    if (this.initialized || isDevMode) {
      this.initialized = true
      return
    }
    const { ws281x, StripType } = await getPiixel()
    const stripType = (StripType as Record<string, number>)[this.order] ?? StripType.WS2811_STRIP_GRB
    ws281x.configure({
      gpio: this.gpioPin,
      leds: this.numPixels(),
      type: stripType,
      resetOnExit: true,
    })
    this.initialized = true
  }

  applyLights(lights: Pixel[], brightness: number): void {
    const ranges = this.getRanges()

    for (const [hwIdx, pixelIdx] of ranges) {
      if (this.skip.has(pixelIdx)) {
        this.pixelArray[hwIdx] = 0
        continue
      }
      const px = lights[pixelIdx]
      const [r, g, b] = hsvToRgb(px.hue, px.sat, brightness * px.val)
      const ri = Math.round(r * 255)
      const gi = Math.round(g * 255)
      const bi = Math.round(b * 255)

      if (this.bpp === 4) {
        const wi = Math.round(px.white * brightness * 255)
        this.pixelArray[hwIdx] = packRgbw(ri, gi, bi, wi)
      } else {
        this.pixelArray[hwIdx] = packRgb(ri, gi, bi)
      }
    }

    if (isDevMode) {
      const preview = Array.from(this.pixelArray).map(c => {
        const r = (c >> 16) & 0xff
        const g = (c >> 8) & 0xff
        const b = c & 0xff
        return termColor(r, g, b)
      }).join('')
      process.stdout.write(preview + '\r')
    } else if (ws281x) {
      ws281x.render(this.pixelArray)
    }
  }
}
