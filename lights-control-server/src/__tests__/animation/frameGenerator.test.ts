import { FrameGenerator } from '../../animation/frameGenerator'
import { StripRegistry, ResolvedStrip } from '../../strips/registry'
import { StripManager } from '../../strips/manager'
import { Timer } from '../../timer'
import { Pixel } from '../../algorithms/_meta/pixel'
import { MSG_FRAME, MSG_SYNC } from '../../websocket/protocol'

function makeStrip(id: string, numPixels: number, pixelOffset: number, bpp: 3 | 4 = 3): ResolvedStrip {
  return {
    stripId: id,
    numPixels,
    bpp,
    pixelOffset,
    physical: {
      length_meters: 1,
      location: { start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 } },
    },
  }
}

function makePixels(n: number, hue = 0, sat = 1, val = 1): Pixel[] {
  return Array.from({ length: n }, () => new Pixel(hue, sat, val))
}

function makeTimer(fps = 60): Timer {
  return { fps } as unknown as Timer
}

describe('FrameGenerator', () => {
  let mockRegistry: jest.Mocked<Pick<StripRegistry, 'strips'>> & { strips: ResolvedStrip[] }
  let mockManager: jest.Mocked<Pick<StripManager, 'getConnected' | 'send' | 'broadcast'>>
  let generator: FrameGenerator

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000)

    mockRegistry = { strips: [] }
    mockManager = {
      getConnected: jest.fn().mockReturnValue([]),
      send: jest.fn(),
      broadcast: jest.fn(),
    }
    generator = new FrameGenerator(
      mockRegistry as unknown as StripRegistry,
      mockManager as unknown as StripManager,
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('sendFrame', () => {
    test('sends a frame buffer to each connected strip', async () => {
      const strip = makeStrip('strip-a', 5, 0, 3)
      mockRegistry.strips = [strip]
      mockManager.getConnected.mockReturnValue([
        { stripId: 'strip-a', socket: {} as any, meta: strip, bufferedFrames: 0, lastSeen: 0 },
      ])

      await generator.sendFrame(makePixels(5), 1.0, makeTimer())
      expect(mockManager.send).toHaveBeenCalledWith('strip-a', expect.any(Buffer))
    })

    test('sent buffer starts with MSG_FRAME (0x01)', async () => {
      const strip = makeStrip('strip-a', 3, 0)
      mockRegistry.strips = [strip]
      mockManager.getConnected.mockReturnValue([
        { stripId: 'strip-a', socket: {} as any, meta: strip, bufferedFrames: 0, lastSeen: 0 },
      ])

      await generator.sendFrame(makePixels(3), 1.0, makeTimer())
      const buf = (mockManager.send as jest.Mock).mock.calls[0][1] as Buffer
      expect(buf[0]).toBe(MSG_FRAME)
    })

    test('encodes RGB pixels (bpp=3) as 3 bytes per pixel starting at offset 13', async () => {
      const strip = makeStrip('strip-a', 1, 0, 3)
      mockRegistry.strips = [strip]
      mockManager.getConnected.mockReturnValue([
        { stripId: 'strip-a', socket: {} as any, meta: strip, bufferedFrames: 0, lastSeen: 0 },
      ])

      const pixels = [new Pixel(0, 1, 1)] // pure red
      await generator.sendFrame(pixels, 1.0, makeTimer())
      const buf = (mockManager.send as jest.Mock).mock.calls[0][1] as Buffer
      expect(buf.length).toBe(13 + 3) // header + 1 RGB pixel
      expect(buf[13]).toBe(255) // R
      expect(buf[14]).toBe(0)   // G
      expect(buf[15]).toBe(0)   // B
    })

    test('encodes RGBW pixels (bpp=4) as 4 bytes per pixel', async () => {
      const strip = makeStrip('strip-a', 1, 0, 4)
      mockRegistry.strips = [strip]
      mockManager.getConnected.mockReturnValue([
        { stripId: 'strip-a', socket: {} as any, meta: strip, bufferedFrames: 0, lastSeen: 0 },
      ])

      await generator.sendFrame([new Pixel(0, 0, 0, 1)], 1.0, makeTimer())
      const buf = (mockManager.send as jest.Mock).mock.calls[0][1] as Buffer
      expect(buf.length).toBe(13 + 4) // header + 1 RGBW pixel
      expect(buf[16]).toBe(255) // W channel
    })

    test('applies brightness: val=1, brightness=0.5 produces half-brightness output', async () => {
      const strip = makeStrip('strip-a', 1, 0, 3)
      mockRegistry.strips = [strip]
      mockManager.getConnected.mockReturnValue([
        { stripId: 'strip-a', socket: {} as any, meta: strip, bufferedFrames: 0, lastSeen: 0 },
      ])

      await generator.sendFrame([new Pixel(0, 1, 1)], 0.5, makeTimer())
      const buf = (mockManager.send as jest.Mock).mock.calls[0][1] as Buffer
      expect(buf[13]).toBeCloseTo(128, 0) // R at 50%
    })

    test('only sends to strips that have a connected socket', async () => {
      const s1 = makeStrip('strip-a', 5, 0)
      const s2 = makeStrip('strip-b', 5, 5)
      mockRegistry.strips = [s1, s2]
      // Only strip-a is connected
      mockManager.getConnected.mockReturnValue([
        { stripId: 'strip-a', socket: {} as any, meta: s1, bufferedFrames: 0, lastSeen: 0 },
      ])

      await generator.sendFrame(makePixels(10), 1.0, makeTimer())
      expect(mockManager.send).toHaveBeenCalledTimes(1)
      expect(mockManager.send).toHaveBeenCalledWith('strip-a', expect.any(Buffer))
    })

    test('encodes only the pixels belonging to each strip (by offset and count)', async () => {
      const s1 = makeStrip('strip-a', 2, 0)
      const s2 = makeStrip('strip-b', 2, 2)
      mockRegistry.strips = [s1, s2]

      const redPixel = new Pixel(0, 1, 1)   // red
      const bluePixel = new Pixel(2 / 3, 1, 1) // blue
      const pixels = [redPixel, redPixel, bluePixel, bluePixel]

      mockManager.getConnected.mockReturnValue([
        { stripId: 'strip-a', socket: {} as any, meta: s1, bufferedFrames: 0, lastSeen: 0 },
        { stripId: 'strip-b', socket: {} as any, meta: s2, bufferedFrames: 0, lastSeen: 0 },
      ])

      await generator.sendFrame(pixels, 1.0, makeTimer())

      const callA = (mockManager.send as jest.Mock).mock.calls.find(c => c[0] === 'strip-a')
      const callB = (mockManager.send as jest.Mock).mock.calls.find(c => c[0] === 'strip-b')
      const bufA = callA[1] as Buffer
      const bufB = callB[1] as Buffer

      // strip-a should be red (R=255, G≈0, B≈0)
      expect(bufA[13]).toBe(255)
      expect(bufA[14]).toBeCloseTo(0, 0)

      // strip-b should be blue (R≈0, G≈0, B=255)
      expect(bufB[13]).toBeCloseTo(0, 0)
      expect(bufB[15]).toBe(255)
    })

    test('frame counter increments within a second', async () => {
      const strip = makeStrip('strip-a', 1, 0)
      mockRegistry.strips = [strip]
      const conn = { stripId: 'strip-a', socket: {} as any, meta: strip, bufferedFrames: 0, lastSeen: 0 }
      mockManager.getConnected.mockReturnValue([conn])

      await generator.sendFrame(makePixels(1), 1.0, makeTimer())
      await generator.sendFrame(makePixels(1), 1.0, makeTimer())

      const buf0 = (mockManager.send as jest.Mock).mock.calls[0][1] as Buffer
      const buf1 = (mockManager.send as jest.Mock).mock.calls[1][1] as Buffer
      const frame0 = buf0.readUInt16BE(9)
      const frame1 = buf1.readUInt16BE(9)
      expect(frame0).toBe(0)
      expect(frame1).toBe(1)
    })

    test('frame counter resets when the second changes', async () => {
      const strip = makeStrip('strip-a', 1, 0)
      mockRegistry.strips = [strip]
      const conn = { stripId: 'strip-a', socket: {} as any, meta: strip, bufferedFrames: 0, lastSeen: 0 }
      mockManager.getConnected.mockReturnValue([conn])

      const dateSpy = jest.spyOn(Date, 'now')
      dateSpy.mockReturnValue(1_000_000)
      await generator.sendFrame(makePixels(1), 1.0, makeTimer())
      // Advance to the next second
      dateSpy.mockReturnValue(1_001_001) // LEAD_MS=1000 → targetTime in new second
      await generator.sendFrame(makePixels(1), 1.0, makeTimer())

      const buf1 = (mockManager.send as jest.Mock).mock.calls[1][1] as Buffer
      expect(buf1.readUInt16BE(9)).toBe(0) // reset to 0
    })
  })

  describe('broadcastSync', () => {
    test('broadcasts a MSG_SYNC buffer', () => {
      generator.broadcastSync(makeTimer(30))
      expect(mockManager.broadcast).toHaveBeenCalledWith(expect.any(Buffer))
      const buf = (mockManager.broadcast as jest.Mock).mock.calls[0][0] as Buffer
      expect(buf[0]).toBe(MSG_SYNC)
    })

    test('encodes the timer fps in the sync message', () => {
      generator.broadcastSync(makeTimer(30))
      const buf = (mockManager.broadcast as jest.Mock).mock.calls[0][0] as Buffer
      expect(buf.readUInt16BE(9)).toBe(30)
    })

    test('resets the frame counter to 0', async () => {
      const strip = makeStrip('strip-a', 1, 0)
      mockRegistry.strips = [strip]
      const conn = { stripId: 'strip-a', socket: {} as any, meta: strip, bufferedFrames: 0, lastSeen: 0 }
      mockManager.getConnected.mockReturnValue([conn])

      await generator.sendFrame(makePixels(1), 1.0, makeTimer())
      await generator.sendFrame(makePixels(1), 1.0, makeTimer())
      generator.broadcastSync(makeTimer()) // resets counter

      mockManager.send.mockClear()
      await generator.sendFrame(makePixels(1), 1.0, makeTimer())
      const buf = (mockManager.send as jest.Mock).mock.calls[0][1] as Buffer
      expect(buf.readUInt16BE(9)).toBe(0)
    })
  })
})
