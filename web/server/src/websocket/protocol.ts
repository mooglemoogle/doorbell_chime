/**
 * Binary WebSocket protocol — server → strip
 *
 * MSG_FRAME (0x01)
 *   [0]     uint8     message type = 0x01
 *   [1–8]   int64 BE  target timestamp (Unix ms)
 *   [9–10]  uint16 BE frame number within second (0 to fps-1)
 *   [11–12] uint16 BE pixel count
 *   [13+]   uint8[]   R,G,B per pixel  (or R,G,B,W for bpp=4)
 *
 * MSG_SYNC (0x02)
 *   [0]     uint8     message type = 0x02
 *   [1–8]   int64 BE  effective timestamp (Unix ms) — strip discards buffer at/after this
 *   [9–10]  uint16 BE framerate
 */

export const MSG_FRAME = 0x01
export const MSG_SYNC = 0x02

export function encodeFrame(
  timestampMs: number,
  frameNumber: number,
  pixels: Uint8Array,
): Buffer {
  const pixelCount = pixels.length / 3 | 0
  const buf = Buffer.allocUnsafe(13 + pixels.length)
  buf[0] = MSG_FRAME
  writeInt64BE(buf, timestampMs, 1)
  buf.writeUInt16BE(frameNumber, 9)
  buf.writeUInt16BE(pixelCount, 11)
  buf.set(pixels, 13)
  return buf
}

export function encodeFrameRGBW(
  timestampMs: number,
  frameNumber: number,
  pixels: Uint8Array,
): Buffer {
  const pixelCount = pixels.length / 4 | 0
  const buf = Buffer.allocUnsafe(13 + pixels.length)
  buf[0] = MSG_FRAME
  writeInt64BE(buf, timestampMs, 1)
  buf.writeUInt16BE(frameNumber, 9)
  buf.writeUInt16BE(pixelCount, 11)
  buf.set(pixels, 13)
  return buf
}

export function encodeSync(timestampMs: number, framerate: number): Buffer {
  const buf = Buffer.allocUnsafe(11)
  buf[0] = MSG_SYNC
  writeInt64BE(buf, timestampMs, 1)
  buf.writeUInt16BE(framerate, 9)
  return buf
}

/** Write a 53-bit-safe int64 big-endian into buf at offset */
function writeInt64BE(buf: Buffer, value: number, offset: number): void {
  const hi = Math.floor(value / 0x100000000)
  const lo = value >>> 0
  buf.writeUInt32BE(hi, offset)
  buf.writeUInt32BE(lo, offset + 4)
}
