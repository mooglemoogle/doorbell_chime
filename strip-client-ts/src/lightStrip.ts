import { HardwareConfig } from './stripConfig.js'

const isMock = process.env['MOCK_PIIXEL'] === '1'

let ws281x: import('piixel').Ws281xAPI | null = null
let StripType: typeof import('piixel').StripType | null = null

async function getPiixel() {
  if (!ws281x) {
    const piixel = await import('piixel')
    ws281x = piixel.ws281x
    StripType = piixel.StripType
  }
  return { ws281x: ws281x!, StripType: StripType! }
}

function termColor(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m  \x1b[0m`
}

export class LightStrip {
  private readonly config: HardwareConfig
  private readonly numPixels: number
  private readonly skip: Set<number>
  private readonly reversed: boolean
  private pixelArray: Uint32Array
  private initialized = false

  constructor(config: HardwareConfig) {
    this.config = config
    this.numPixels = Math.abs(config.index_end - config.index_start) + 1
    this.skip = new Set(config.skip)
    this.reversed = config.index_end < config.index_start
    this.pixelArray = new Uint32Array(this.numPixels)
  }

  async initialize(): Promise<void> {
    if (this.initialized || isMock) {
      this.initialized = true
      return
    }
    const { ws281x, StripType } = await getPiixel()
    const stripType = (StripType as Record<string, number>)[this.config.order] ?? StripType.WS2811_STRIP_GRB
    ws281x.configure({
      gpio: this.config.gpio_pin,
      leds: this.numPixels,
      type: stripType,
      resetOnExit: true,
    })
    this.initialized = true
  }

  /**
   * Apply a frame of pre-computed pixel bytes from the server.
   * pixels: flat Uint8Array of [R,G,B, R,G,B, ...] (or [R,G,B,W,...] for bpp=4)
   */
  applyFrame(pixels: Uint8Array): void {
    const bpp = this.config.bpp

    for (let i = 0; i < this.numPixels; i++) {
      // Map logical index → hardware index (handle reversal)
      const logicalIdx = this.reversed
        ? this.config.index_start - i
        : this.config.index_start + i

      if (this.skip.has(logicalIdx)) {
        this.pixelArray[i] = 0
        continue
      }

      const srcIdx = i * bpp
      const r = pixels[srcIdx] ?? 0
      const g = pixels[srcIdx + 1] ?? 0
      const b = pixels[srcIdx + 2] ?? 0

      if (bpp === 4) {
        const w = pixels[srcIdx + 3] ?? 0
        this.pixelArray[i] = ((w & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
      } else {
        this.pixelArray[i] = ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
      }
    }

    if (isMock) {
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
