import { Pixel } from '../algorithms/_meta/pixel'
import { StripRegistry } from '../strips/registry'
import { StripManager } from '../strips/manager'
import { Timer } from '../timer'
import { encodeFrame, encodeFrameRGBW, encodeSync } from '../websocket/protocol'

/**
 * Converts the virtual pixel array to per-strip binary frames and sends them.
 * The server sends frames LEAD_MS ahead of their target display time so strips
 * can buffer them.
 */
const LEAD_MS = 1000

export class FrameGenerator {
  private readonly registry: StripRegistry
  private readonly manager: StripManager
  private frameIndex = 0
  private frameOrigin = 0
  private frameDurationMs = 1000 / 30

  constructor(registry: StripRegistry, manager: StripManager) {
    this.registry = registry
    this.manager = manager
  }

  async sendFrame(pixels: Pixel[], brightness: number): Promise<void> {
    if (this.frameOrigin === 0) {
      this.frameOrigin = Date.now()
    }
    const targetTime = this.frameOrigin + this.frameIndex * this.frameDurationMs + LEAD_MS
    const frameNumber = this.frameIndex++

    for (const strip of this.registry.strips) {
      if (this.manager.isDisabled(strip.stripId)) continue
      const connected = this.manager.getConnected().find(c => c.stripId === strip.stripId)
      if (!connected) continue

      const pixelBytes = this.encodeStripPixels(pixels, strip.pixelOffset, strip.numPixels, strip.bpp, brightness)
      const msg = strip.bpp === 4
        ? encodeFrameRGBW(targetTime, frameNumber, pixelBytes)
        : encodeFrame(targetTime, frameNumber, pixelBytes)

      this.manager.send(strip.stripId, msg)
    }
  }

  sendSyncToStrip(stripId: string, timer: Timer): void {
    const effectiveTime = Date.now() + 50
    const msg = encodeSync(effectiveTime, timer.fps)
    this.manager.send(stripId, msg)
  }

  broadcastSync(timer: Timer): void {
    // Use a small lookahead so strips have time to process the sync before the next frame arrives
    const effectiveTime = Date.now() + 50
    const msg = encodeSync(effectiveTime, timer.fps)
    this.manager.broadcast(msg)
    this.frameOrigin = Date.now()
    this.frameIndex = 0
    this.frameDurationMs = 1000 / timer.fps
  }

  private encodeStripPixels(
    pixels: Pixel[],
    offset: number,
    count: number,
    bpp: 3 | 4,
    brightness: number,
  ): Uint8Array {
    const bytes = new Uint8Array(count * bpp)
    for (let i = 0; i < count; i++) {
      const px = pixels[offset + i]
      if (!px) continue
      if (bpp === 4) {
        const [r, g, b, w] = px.getRgbw(brightness)
        bytes[i * 4 + 0] = Math.round(r)
        bytes[i * 4 + 1] = Math.round(g)
        bytes[i * 4 + 2] = Math.round(b)
        bytes[i * 4 + 3] = Math.round(w)
      } else {
        const [r, g, b] = px.getRgb(brightness)
        bytes[i * 3 + 0] = Math.round(r)
        bytes[i * 3 + 1] = Math.round(g)
        bytes[i * 3 + 2] = Math.round(b)
      }
    }
    return bytes
  }
}
