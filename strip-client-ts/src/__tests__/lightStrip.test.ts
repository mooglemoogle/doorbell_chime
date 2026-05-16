import { describe, test, expect, beforeEach, vi } from 'vitest'
import { LightStrip } from '../lightStrip.js'
import type { HardwareConfig } from '../stripConfig.js'

// MOCK_PIIXEL=1 is set via vitest.config.ts so LightStrip never calls piixel hardware.
// suppress the terminal-color stdout output from applyFrame in mock mode
beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
})

function makeConfig(overrides: Partial<HardwareConfig> = {}): HardwareConfig {
  return {
    index_start: 0,
    index_end: 2,  // 3 pixels
    gpio_pin: 'D18',
    bpp: 3,
    order: 'GRB',
    skip: [],
    ...overrides,
  }
}

function pixelArray(strip: LightStrip): Uint32Array {
  return (strip as unknown as { pixelArray: Uint32Array }).pixelArray
}

describe('LightStrip', () => {
  describe('numPixels calculation', () => {
    test('|index_end - index_start| + 1', () => {
      const strip = new LightStrip(makeConfig({ index_start: 0, index_end: 9 }))
      expect(pixelArray(strip).length).toBe(10)
    })

    test('works for reversed strip (index_end < index_start)', () => {
      const strip = new LightStrip(makeConfig({ index_start: 9, index_end: 0 }))
      expect(pixelArray(strip).length).toBe(10)
    })

    test('single pixel (start === end)', () => {
      const strip = new LightStrip(makeConfig({ index_start: 5, index_end: 5 }))
      expect(pixelArray(strip).length).toBe(1)
    })
  })

  describe('initialize (mock mode)', () => {
    test('completes without error', async () => {
      const strip = new LightStrip(makeConfig())
      await expect(strip.initialize()).resolves.toBeUndefined()
    })
  })

  describe('applyFrame — RGB (bpp=3)', () => {
    test('packs RGB values into uint32: (r<<16)|(g<<8)|b', () => {
      const strip = new LightStrip(makeConfig({ index_start: 0, index_end: 0 }))
      strip.applyFrame(new Uint8Array([200, 100, 50]))
      const arr = pixelArray(strip)
      expect((arr[0] >> 16) & 0xff).toBe(200) // R
      expect((arr[0] >> 8) & 0xff).toBe(100)  // G
      expect(arr[0] & 0xff).toBe(50)           // B
    })

    test('pure red pixel', () => {
      const strip = new LightStrip(makeConfig({ index_start: 0, index_end: 0 }))
      strip.applyFrame(new Uint8Array([255, 0, 0]))
      const arr = pixelArray(strip)
      expect((arr[0] >> 16) & 0xff).toBe(255)
      expect((arr[0] >> 8) & 0xff).toBe(0)
      expect(arr[0] & 0xff).toBe(0)
    })

    test('all three pixels receive correct colors', () => {
      const strip = new LightStrip(makeConfig()) // 3 pixels
      const frame = new Uint8Array([255, 0, 0,  0, 255, 0,  0, 0, 255])
      strip.applyFrame(frame)
      const arr = pixelArray(strip)
      expect((arr[0] >> 16) & 0xff).toBe(255) // pixel 0: red
      expect((arr[1] >> 8) & 0xff).toBe(255)  // pixel 1: green
      expect(arr[2] & 0xff).toBe(255)          // pixel 2: blue
    })

    test('out-of-bounds pixel bytes default to 0', () => {
      // Only 1 pixel worth of data for a 3-pixel strip
      const strip = new LightStrip(makeConfig())
      strip.applyFrame(new Uint8Array([10, 20, 30]))
      const arr = pixelArray(strip)
      expect((arr[1] >> 16) & 0xff).toBe(0) // pixel 1 has no data → 0
      expect((arr[2] >> 16) & 0xff).toBe(0) // pixel 2 has no data → 0
    })
  })

  describe('applyFrame — RGBW (bpp=4)', () => {
    test('packs RGBW values into uint32: (w<<24)|(r<<16)|(g<<8)|b', () => {
      const strip = new LightStrip(makeConfig({ index_start: 0, index_end: 0, bpp: 4 }))
      strip.applyFrame(new Uint8Array([200, 100, 50, 128]))
      const arr = pixelArray(strip)
      expect((arr[0] >> 16) & 0xff).toBe(200) // R
      expect((arr[0] >> 8) & 0xff).toBe(100)  // G
      expect(arr[0] & 0xff).toBe(50)           // B
      // W is in bits 24-31; read as unsigned from Uint32Array
      expect((arr[0] >>> 24) & 0xff).toBe(128) // W
    })

    test('full white RGBW pixel (0, 0, 0, 255)', () => {
      const strip = new LightStrip(makeConfig({ index_start: 0, index_end: 0, bpp: 4 }))
      strip.applyFrame(new Uint8Array([0, 0, 0, 255]))
      const arr = pixelArray(strip)
      expect((arr[0] >>> 24) & 0xff).toBe(255)
      expect(arr[0] & 0x00ffffff).toBe(0)
    })
  })

  describe('skip indices', () => {
    test('skipped logical index produces zero in pixelArray', () => {
      // index_start=0, index_end=2; pixel i=1 has logicalIdx=1
      const strip = new LightStrip(makeConfig({ skip: [1] }))
      strip.applyFrame(new Uint8Array([255, 255, 255,  255, 255, 255,  255, 255, 255]))
      const arr = pixelArray(strip)
      expect(arr[0]).toBeGreaterThan(0) // pixel 0 not skipped
      expect(arr[1]).toBe(0)            // pixel 1 skipped
      expect(arr[2]).toBeGreaterThan(0) // pixel 2 not skipped
    })

    test('skipping all indices produces all zeros', () => {
      const strip = new LightStrip(makeConfig({ skip: [0, 1, 2] }))
      strip.applyFrame(new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255]))
      const arr = pixelArray(strip)
      expect(arr[0]).toBe(0)
      expect(arr[1]).toBe(0)
      expect(arr[2]).toBe(0)
    })
  })

  describe('reversed strip (index_end < index_start)', () => {
    test('reversed strip: pixel i uses logicalIdx = index_start - i', () => {
      // strip: index_start=2, index_end=0 → reversed, 3 pixels
      // pixel i=0 → logicalIdx=2, i=1 → logicalIdx=1, i=2 → logicalIdx=0
      // skip=[1] skips pixel i=1 (logical index 1)
      const strip = new LightStrip(makeConfig({ index_start: 2, index_end: 0, skip: [1] }))
      strip.applyFrame(new Uint8Array([255, 0, 0,  255, 0, 0,  255, 0, 0]))
      const arr = pixelArray(strip)
      expect(arr[0]).toBeGreaterThan(0) // not skipped
      expect(arr[1]).toBe(0)             // logical index 1 is skipped
      expect(arr[2]).toBeGreaterThan(0) // not skipped
    })
  })
})
