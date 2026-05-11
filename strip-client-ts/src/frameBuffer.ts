/**
 * Timestamped frame buffer.
 *
 * The server sends frames LEAD_MS (1 second) ahead of their target display
 * time. This buffer queues them and returns the correct frame when polled.
 *
 * On underrun (no frame ready): returns the last applied frame so the strip
 * holds steady rather than going dark.
 * On overflow (> maxFrames queued): drops the oldest frames to self-heal lag.
 */

export const MSG_FRAME = 0x01
export const MSG_SYNC = 0x02

export class FrameBuffer {
  private frames = new Map<number, Uint8Array>()
  private lastFrame: Uint8Array | null = null
  fps = 30

  /** Maximum number of queued frames (1 second worth at current fps) */
  get maxFrames(): number {
    return this.fps
  }

  addFrame(timestampMs: number, pixels: Uint8Array): void {
    this.frames.set(timestampMs, pixels)
    this.evict()
  }

  /**
   * Returns the pixel data for the frame whose timestamp is <= now,
   * or the last applied frame if none is ready.
   */
  getFrame(nowMs: number): Uint8Array | null {
    let bestTs = -1
    for (const ts of this.frames.keys()) {
      if (ts <= nowMs && ts > bestTs) bestTs = ts
    }
    if (bestTs === -1) return this.lastFrame

    const frame = this.frames.get(bestTs)!
    // Remove all frames at or before this timestamp
    for (const ts of this.frames.keys()) {
      if (ts <= bestTs) this.frames.delete(ts)
    }
    this.lastFrame = frame
    return frame
  }

  /** Drop all frames at or after fromMs (used on SYNC) */
  sync(fromMs: number, newFps: number): void {
    for (const ts of this.frames.keys()) {
      if (ts >= fromMs) this.frames.delete(ts)
    }
    this.fps = newFps
  }

  bufferedCount(): number {
    return this.frames.size
  }

  private evict(): void {
    if (this.frames.size <= this.maxFrames) return
    // Drop oldest frames
    const sorted = Array.from(this.frames.keys()).sort((a, b) => a - b)
    const toRemove = sorted.slice(0, this.frames.size - this.maxFrames)
    for (const ts of toRemove) this.frames.delete(ts)
  }
}

/** Parse a binary server message. Returns null if not a recognised type. */
export function parseServerMessage(
  data: Buffer,
  buffer: FrameBuffer,
): 'frame' | 'sync' | null {
  if (data.length < 1) return null
  const type = data[0]

  if (type === MSG_FRAME && data.length >= 13) {
    const timestampMs = readInt64BE(data, 1)
    const pixelCount = data.readUInt16BE(11)
    const bpp = data.length === 13 + pixelCount * 4 ? 4 : 3
    const pixels = new Uint8Array(data.buffer, data.byteOffset + 13, pixelCount * bpp)
    buffer.addFrame(timestampMs, pixels)
    return 'frame'
  }

  if (type === MSG_SYNC && data.length >= 11) {
    const timestampMs = readInt64BE(data, 1)
    const fps = data.readUInt16BE(9)
    buffer.sync(timestampMs, fps)
    return 'sync'
  }

  return null
}

function readInt64BE(buf: Buffer, offset: number): number {
  const hi = buf.readUInt32BE(offset)
  const lo = buf.readUInt32BE(offset + 4)
  return hi * 0x100000000 + lo
}
