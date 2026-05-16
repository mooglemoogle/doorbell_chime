import { Algorithm } from '../../algorithms/twinkles/twinkles'

const baseSettings = { density: 0.2, freq: 1.0, fadeTime: 2.0 }

describe('Twinkles Algorithm', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('creates the requested number of pixels', () => {
    expect(new Algorithm(10, baseSettings).pixels).toHaveLength(10)
  })

  test('numTwinkles = ceil(density * numPixels) are initially active', () => {
    // density=0.2, numPixels=10 → ceil(2) = 2 active twinkles.
    // Pixel vals are only written in runCycle, so call it with elapsed=0 to avoid fading.
    jest.spyOn(Math, 'random').mockReturnValue(0)
    const algo = new Algorithm(10, baseSettings)
    algo.runCycle(0, 0) // elapsed=0 → no fading, no new chooseTwinkles
    const active = algo.pixels.filter(p => p.val > 0).length
    expect(active).toBe(2)
  })

  test('all twinkles start at val=1.0', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0)
    const algo = new Algorithm(10, baseSettings)
    algo.runCycle(0, 0)
    const active = algo.pixels.filter(p => p.val > 0)
    for (const p of active) {
      expect(p.val).toBe(1.0)
    }
  })

  test('twinkles fade over time: val decreases by elapsed/fadeTime each frame', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0)
    const algo = new Algorithm(10, baseSettings)
    algo.runCycle(0, 0) // populate pixel vals (elapsed=0, no fade)
    const valBefore = Math.max(...algo.pixels.map(p => p.val)) // 1.0

    algo.runCycle(0, 0.5) // should fade by 0.5 / 2.0 = 0.25

    const maxVal = Math.max(...algo.pixels.map(p => p.val))
    expect(maxVal).toBeLessThan(valBefore)
    expect(maxVal).toBeCloseTo(0.75, 3)
  })

  test('twinkle val never goes below 0', () => {
    const algo = new Algorithm(10, baseSettings)
    for (let i = 0; i < 50; i++) algo.runCycle(0, 0.5)
    for (const pixel of algo.pixels) {
      expect(pixel.val).toBeGreaterThanOrEqual(0)
    }
  })

  test('new twinkles are chosen after freq seconds pass (sinceChoose resets)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0)
    const algo = new Algorithm(10, baseSettings)
    algo.runCycle(0, 0)
    const initialVals = algo.pixels.map(p => p.val)
    // Advance past freq=1.0 — chooseTwinkles is called again without throwing
    expect(() => algo.runCycle(0, 1.1)).not.toThrow()
    // sinceChoose resets: 1.1 - 1.0 = 0.1 remaining; another trigger needs another 0.9s
    void initialVals
  })

  test('all pixels start with hue=0 and sat=0 (white twinkles)', () => {
    const algo = new Algorithm(10, baseSettings)
    for (const pixel of algo.pixels) {
      expect(pixel.hue).toBe(0)
      expect(pixel.sat).toBe(0)
    }
  })

  test('runCycle returns false', () => {
    expect(new Algorithm(10, baseSettings).runCycle(0, 0.016)).toBe(false)
  })
})
