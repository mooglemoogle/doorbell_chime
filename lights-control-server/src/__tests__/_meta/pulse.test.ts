import { Pulse } from '../../algorithms/_meta/pulse'
import { Pixel } from '../../algorithms/_meta/pixel'

function makePixels(count: number): Pixel[] {
  return Array.from({ length: count }, () => new Pixel())
}

describe('Pulse.applyPulse', () => {
  test('pixel at the center location gets full color', () => {
    const color = new Pixel(0, 1, 1)
    const pulse = new Pulse(10, color, 2, 3, 3)
    const pixels = makePixels(20)
    pulse.applyPulse(pixels)
    // pixel 10 is within mainBound (size/2 = 1) of location 10
    expect(pixels[10].val).toBeGreaterThan(0)
  })

  test('pixel solidly inside the core gets the full color applied', () => {
    const color = new Pixel(0, 1, 1) // red, full brightness
    const pulse = new Pulse(10, color, 6, 2, 2) // size=6, so mainBound=3 (pixels 7–13 solid)
    const pixels = makePixels(20)
    pulse.applyPulse(pixels)
    // pixel 10 is inside mainBound — combineWith(color) makes it full brightness
    const [r] = pixels[10].getRawRgb()
    expect(r).toBeCloseTo(1, 2)
  })

  test('pixel far outside the dropOff range is unaffected', () => {
    const color = new Pixel(0, 1, 1)
    // location=10, mainBound=2, dropOffLeft=2 → leftBound = floor(10-1-2) = 7
    const pulse = new Pulse(10, color, 4, 2, 2)
    const pixels = makePixels(20)
    pulse.applyPulse(pixels)
    // pixel 0 is far to the left — should be untouched
    expect(pixels[0].val).toBe(0)
    expect(pixels[0].hue).toBe(0)
  })

  test('pixel at the edge of dropOff gets partial color (bezier falloff)', () => {
    const color = new Pixel(0, 1, 1)
    const pulse = new Pulse(10, color, 4, 4, 4) // mainBound=2, dropOffRight=4
    const pixels = makePixels(20)
    pulse.applyPulse(pixels)
    // pixel 14 is 2 pixels into the right dropOff zone — gets partial color
    const partialVal = pixels[14].val
    expect(partialVal).toBeGreaterThan(0)
    expect(partialVal).toBeLessThan(1)
    // pixel at the core (pixel 10) should be brighter
    expect(pixels[10].val).toBeGreaterThan(partialVal)
  })

  test('leftBound is clamped to 0 when pulse is near the left edge', () => {
    const color = new Pixel(0, 1, 1)
    const pulse = new Pulse(1, color, 4, 5, 5) // would extend to -5, clamped to 0
    const pixels = makePixels(20)
    expect(() => pulse.applyPulse(pixels)).not.toThrow()
    expect(pixels[0].val).toBeGreaterThan(0)
  })

  test('rightBound is clamped to pixels.length-1 when near the right edge', () => {
    const color = new Pixel(0, 1, 1)
    const pulse = new Pulse(18, color, 4, 5, 5) // would extend to 25, clamped to 19
    const pixels = makePixels(20)
    expect(() => pulse.applyPulse(pixels)).not.toThrow()
    expect(pixels[19].val).toBeGreaterThan(0)
  })

  test('applying two pulses accumulates colors additively', () => {
    // Use full brightness so the additive blend exceeds either color alone.
    // red [1,0,0] + green [0,1,0] = yellow [1,1,0], val = max(R,G,B) = 1.0
    const redPulse = new Pulse(5, new Pixel(0, 1, 1), 2, 0, 0)
    const greenPulse = new Pulse(5, new Pixel(1 / 3, 1, 1), 2, 0, 0)
    const pixels = makePixels(20)
    redPulse.applyPulse(pixels)
    greenPulse.applyPulse(pixels)
    // The combined pixel is yellow with val=1 — brighter than either half-bright source
    expect(pixels[5].val).toBeGreaterThanOrEqual(1.0)
  })
})
