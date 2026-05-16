import { describe, test, expect, beforeEach } from 'vitest'
import { FrameBuffer, parseServerMessage, MSG_FRAME, MSG_SYNC } from '../frameBuffer.js'

// ---------------------------------------------------------------------------
// Helpers to build binary server messages
// ---------------------------------------------------------------------------

function writeInt64BE(buf: Buffer, value: number, offset: number): void {
  const hi = Math.floor(value / 0x100000000)
  const lo = value >>> 0
  buf.writeUInt32BE(hi, offset)
  buf.writeUInt32BE(lo, offset + 4)
}

function makeFrameMsg(ts: number, frameNum: number, pixels: Uint8Array): Buffer {
  const buf = Buffer.allocUnsafe(13 + pixels.length)
  buf[0] = MSG_FRAME
  writeInt64BE(buf, ts, 1)
  buf.writeUInt16BE(frameNum, 9)
  buf.writeUInt16BE(pixels.length / 3 | 0, 11)
  buf.set(pixels, 13)
  return buf
}

function makeFrameMsgRGBW(ts: number, pixels: Uint8Array): Buffer {
  const pixelCount = pixels.length / 4 | 0
  const buf = Buffer.allocUnsafe(13 + pixels.length)
  buf[0] = MSG_FRAME
  writeInt64BE(buf, ts, 1)
  buf.writeUInt16BE(0, 9)
  buf.writeUInt16BE(pixelCount, 11)
  buf.set(pixels, 13)
  return buf
}

function makeSyncMsg(ts: number, fps: number): Buffer {
  const buf = Buffer.allocUnsafe(11)
  buf[0] = MSG_SYNC
  writeInt64BE(buf, ts, 1)
  buf.writeUInt16BE(fps, 9)
  return buf
}

// ---------------------------------------------------------------------------
// FrameBuffer
// ---------------------------------------------------------------------------

describe('FrameBuffer', () => {
  let buf: FrameBuffer

  beforeEach(() => { buf = new FrameBuffer() })

  test('starts empty with fps=30', () => {
    expect(buf.fps).toBe(30)
    expect(buf.bufferedCount()).toBe(0)
    expect(buf.maxFrames).toBe(30)
  })

  test('maxFrames equals fps', () => {
    buf.fps = 60
    expect(buf.maxFrames).toBe(60)
  })

  test('getFrame returns null when empty and no lastFrame', () => {
    expect(buf.getFrame(Date.now())).toBeNull()
  })

  test('addFrame stores a frame; getFrame at exact timestamp returns it', () => {
    const pixels = new Uint8Array([255, 0, 0])
    buf.addFrame(1000, pixels)
    expect(buf.getFrame(1000)).toEqual(pixels)
  })

  test('getFrame returns the latest frame at or before now', () => {
    buf.addFrame(1000, new Uint8Array([1]))
    buf.addFrame(2000, new Uint8Array([2]))
    buf.addFrame(3000, new Uint8Array([3]))
    expect(buf.getFrame(2500)).toEqual(new Uint8Array([2]))
  })

  test('getFrame does not return frames in the future', () => {
    buf.addFrame(9000, new Uint8Array([99]))
    expect(buf.getFrame(5000)).toBeNull()
  })

  test('getFrame removes the consumed frame and all older frames', () => {
    buf.addFrame(1000, new Uint8Array([1]))
    buf.addFrame(2000, new Uint8Array([2]))
    buf.addFrame(3000, new Uint8Array([3]))
    buf.getFrame(2000) // consumes 2000, evicts 1000
    expect(buf.bufferedCount()).toBe(1) // only 3000 remains
  })

  test('getFrame does not remove frames newer than the consumed one', () => {
    buf.addFrame(1000, new Uint8Array([1]))
    buf.addFrame(5000, new Uint8Array([2]))
    buf.getFrame(1000)
    expect(buf.getFrame(5000)).toEqual(new Uint8Array([2]))
  })

  test('getFrame returns lastFrame on underrun (no frame ready)', () => {
    const pixels = new Uint8Array([42, 43, 44])
    buf.addFrame(100, pixels)
    buf.getFrame(100) // consumes it, sets lastFrame
    // No frames left, future underrun returns lastFrame
    expect(buf.getFrame(200)).toEqual(pixels)
  })

  describe('sync', () => {
    test('removes frames at or after fromMs', () => {
      buf.addFrame(1000, new Uint8Array([1]))
      buf.addFrame(2000, new Uint8Array([2]))
      buf.addFrame(3000, new Uint8Array([3]))
      buf.sync(2000, 30)
      expect(buf.bufferedCount()).toBe(1) // only 1000 remains
      expect(buf.getFrame(999)).toBeNull()
      expect(buf.getFrame(1000)).toEqual(new Uint8Array([1]))
    })

    test('updates fps', () => {
      buf.sync(0, 60)
      expect(buf.fps).toBe(60)
    })

    test('clears all frames when fromMs=0', () => {
      buf.addFrame(1000, new Uint8Array([1]))
      buf.addFrame(2000, new Uint8Array([2]))
      buf.sync(0, 30)
      expect(buf.bufferedCount()).toBe(0)
    })
  })

  describe('evict', () => {
    test('drops oldest frames when buffered count exceeds maxFrames', () => {
      buf.fps = 3 // maxFrames = 3
      buf.addFrame(1000, new Uint8Array([1]))
      buf.addFrame(2000, new Uint8Array([2]))
      buf.addFrame(3000, new Uint8Array([3]))
      buf.addFrame(4000, new Uint8Array([4])) // triggers eviction
      expect(buf.bufferedCount()).toBe(3) // oldest dropped
      expect(buf.getFrame(1000)).toBeNull() // 1000 was evicted
    })

    test('keeps newest frames after eviction', () => {
      buf.fps = 2
      buf.addFrame(1000, new Uint8Array([1]))
      buf.addFrame(2000, new Uint8Array([2]))
      buf.addFrame(3000, new Uint8Array([3]))
      expect(buf.getFrame(3000)).toEqual(new Uint8Array([3]))
    })
  })

  describe('bufferedCount', () => {
    test('increments on addFrame and resets after consumption', () => {
      expect(buf.bufferedCount()).toBe(0)
      buf.addFrame(1000, new Uint8Array([1]))
      buf.addFrame(2000, new Uint8Array([2]))
      expect(buf.bufferedCount()).toBe(2)
      buf.getFrame(2000) // consumes both (2000 consumed + 1000 evicted)
      expect(buf.bufferedCount()).toBe(0)
    })
  })
})

// ---------------------------------------------------------------------------
// parseServerMessage
// ---------------------------------------------------------------------------

describe('parseServerMessage', () => {
  let buf: FrameBuffer

  beforeEach(() => { buf = new FrameBuffer() })

  test('returns null for empty buffer', () => {
    expect(parseServerMessage(Buffer.alloc(0), buf)).toBeNull()
  })

  test('returns null for unknown message type', () => {
    const bad = Buffer.from([0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(parseServerMessage(bad, buf)).toBeNull()
  })

  test('returns null for MSG_FRAME with insufficient length', () => {
    const short = Buffer.from([MSG_FRAME, 0, 0]) // only 3 bytes, need >= 13
    expect(parseServerMessage(short, buf)).toBeNull()
  })

  test('returns "frame" and adds frame to buffer for valid MSG_FRAME', () => {
    const pixels = new Uint8Array([255, 0, 0, 0, 255, 0]) // 2 RGB pixels
    const msg = makeFrameMsg(1_000_000, 0, pixels)
    const result = parseServerMessage(msg, buf)
    expect(result).toBe('frame')
    expect(buf.bufferedCount()).toBe(1)
    expect(buf.getFrame(1_000_000)).toEqual(pixels)
  })

  test('decodes timestamp correctly from int64 BE', () => {
    const ts = 1_700_000_000_123 // a realistic 2023 timestamp
    const msg = makeFrameMsg(ts, 0, new Uint8Array([1, 2, 3]))
    parseServerMessage(msg, buf)
    expect(buf.getFrame(ts)).toBeDefined()
  })

  test('detects bpp=3 (RGB) when payload length matches 3 bytes/pixel', () => {
    const pixels = new Uint8Array([1, 2, 3]) // 1 pixel × 3 bytes
    const msg = makeFrameMsg(1000, 0, pixels)
    parseServerMessage(msg, buf)
    const frame = buf.getFrame(1000)!
    expect(frame.length).toBe(3)
  })

  test('detects bpp=4 (RGBW) when payload length matches 4 bytes/pixel', () => {
    const pixels = new Uint8Array([1, 2, 3, 4]) // 1 pixel × 4 bytes
    const msg = makeFrameMsgRGBW(1000, pixels)
    parseServerMessage(msg, buf)
    const frame = buf.getFrame(1000)!
    expect(frame.length).toBe(4)
  })

  test('returns "sync" and updates fps for valid MSG_SYNC', () => {
    buf.addFrame(2000, new Uint8Array([1]))
    buf.addFrame(3000, new Uint8Array([2]))
    const msg = makeSyncMsg(2000, 60)
    const result = parseServerMessage(msg, buf)
    expect(result).toBe('sync')
    expect(buf.fps).toBe(60)
    // Frames at or after sync timestamp should be removed
    expect(buf.bufferedCount()).toBe(0)
  })

  test('returns null for MSG_SYNC with insufficient length', () => {
    const short = Buffer.from([MSG_SYNC, 0, 0]) // only 3 bytes, need >= 11
    expect(parseServerMessage(short, buf)).toBeNull()
  })
})
