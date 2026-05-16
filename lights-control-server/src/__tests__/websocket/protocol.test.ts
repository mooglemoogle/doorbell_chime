import { encodeFrame, encodeFrameRGBW, encodeSync, MSG_FRAME, MSG_SYNC } from '../../websocket/protocol'

/** Read a 53-bit-safe int64 big-endian from a buffer at offset */
function readInt64BE(buf: Buffer, offset: number): number {
  const hi = buf.readUInt32BE(offset)
  const lo = buf.readUInt32BE(offset + 4)
  return hi * 0x100000000 + lo
}

describe('encodeFrame (RGB, bpp=3)', () => {
  const ts = 1_700_000_000_000
  const frameNum = 42
  const pixels = new Uint8Array([255, 0, 0, 0, 255, 0]) // 2 red, green pixels

  test('buffer length is 13 + pixel bytes', () => {
    const buf = encodeFrame(ts, frameNum, pixels)
    expect(buf.length).toBe(13 + pixels.length)
  })

  test('byte 0 is MSG_FRAME (0x01)', () => {
    expect(encodeFrame(ts, frameNum, pixels)[0]).toBe(MSG_FRAME)
  })

  test('bytes 1–8 encode the timestamp as int64 BE', () => {
    const buf = encodeFrame(ts, frameNum, pixels)
    expect(readInt64BE(buf, 1)).toBe(ts)
  })

  test('bytes 9–10 encode frameNumber as uint16 BE', () => {
    const buf = encodeFrame(ts, frameNum, pixels)
    expect(buf.readUInt16BE(9)).toBe(frameNum)
  })

  test('bytes 11–12 encode pixel count (byte length / 3)', () => {
    const buf = encodeFrame(ts, frameNum, pixels)
    expect(buf.readUInt16BE(11)).toBe(pixels.length / 3)
  })

  test('bytes 13+ contain the raw pixel data', () => {
    const buf = encodeFrame(ts, frameNum, pixels)
    for (let i = 0; i < pixels.length; i++) {
      expect(buf[13 + i]).toBe(pixels[i])
    }
  })

  test('timestamp zero encodes correctly', () => {
    const buf = encodeFrame(0, 0, new Uint8Array(3))
    expect(readInt64BE(buf, 1)).toBe(0)
  })

  test('frame number 0 encodes correctly', () => {
    const buf = encodeFrame(ts, 0, new Uint8Array(3))
    expect(buf.readUInt16BE(9)).toBe(0)
  })

  test('large frame number encodes correctly', () => {
    const buf = encodeFrame(ts, 65535, new Uint8Array(3))
    expect(buf.readUInt16BE(9)).toBe(65535)
  })
})

describe('encodeFrameRGBW (RGBW, bpp=4)', () => {
  const ts = 1_700_000_000_000
  const pixels = new Uint8Array([255, 0, 0, 128, 0, 255, 0, 64]) // 2 RGBW pixels

  test('buffer length is 13 + pixel bytes', () => {
    expect(encodeFrameRGBW(ts, 0, pixels).length).toBe(13 + pixels.length)
  })

  test('byte 0 is MSG_FRAME (0x01)', () => {
    expect(encodeFrameRGBW(ts, 0, pixels)[0]).toBe(MSG_FRAME)
  })

  test('pixel count is byte length / 4', () => {
    const buf = encodeFrameRGBW(ts, 0, pixels)
    expect(buf.readUInt16BE(11)).toBe(pixels.length / 4)
  })

  test('bytes 13+ contain the raw pixel data', () => {
    const buf = encodeFrameRGBW(ts, 0, pixels)
    for (let i = 0; i < pixels.length; i++) {
      expect(buf[13 + i]).toBe(pixels[i])
    }
  })
})

describe('encodeSync', () => {
  const ts = 1_700_000_000_123
  const fps = 60

  test('buffer length is 11 bytes', () => {
    expect(encodeSync(ts, fps).length).toBe(11)
  })

  test('byte 0 is MSG_SYNC (0x02)', () => {
    expect(encodeSync(ts, fps)[0]).toBe(MSG_SYNC)
  })

  test('bytes 1–8 encode the timestamp as int64 BE', () => {
    const buf = encodeSync(ts, fps)
    expect(readInt64BE(buf, 1)).toBe(ts)
  })

  test('bytes 9–10 encode framerate as uint16 BE', () => {
    const buf = encodeSync(ts, fps)
    expect(buf.readUInt16BE(9)).toBe(fps)
  })

  test('framerate 2 encodes correctly', () => {
    expect(encodeSync(ts, 2).readUInt16BE(9)).toBe(2)
  })
})
