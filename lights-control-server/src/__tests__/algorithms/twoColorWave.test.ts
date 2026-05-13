import { Algorithm } from '../../algorithms/twoColorWave/wave'

const baseSettings = {
  colors: [[0, 1, 1], [0.5, 1, 1]], // red and cyan
  wavelength: 10,
  speed: 1.0,
  reverse: false,
  square: false,
  split: false,
}

describe('TwoColorWave Algorithm', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('creates the requested number of pixels', () => {
    const algo = new Algorithm(10, baseSettings)
    expect(algo.pixels).toHaveLength(10)
  })

  test('construction initializes pixels with cosine wave values (hue varies across strip)', () => {
    const algo = new Algorithm(10, baseSettings)
    // Both colors have val=1 so val is always 1; variation is in hue.
    const hues = algo.pixels.map(p => p.hue)
    const min = Math.min(...hues)
    const max = Math.max(...hues)
    expect(max).toBeGreaterThan(min) // cosine produces different hue per pixel
  })

  test('pixel hues are interpolated between the two colors', () => {
    const algo = new Algorithm(10, baseSettings)
    for (const pixel of algo.pixels) {
      // hue must be between color[0].hue=0 and color[1].hue=0.5
      expect(pixel.hue).toBeGreaterThanOrEqual(0)
      expect(pixel.hue).toBeLessThanOrEqual(0.5)
      expect(pixel.val).toBe(1.0) // both colors have val=1
    }
  })

  test('square=true: each pixel is exactly one of the two colors', () => {
    const algo = new Algorithm(10, { ...baseSettings, square: true })
    for (const pixel of algo.pixels) {
      const isColor1 = Math.abs(pixel.hue - 0) < 0.001
      const isColor2 = Math.abs(pixel.hue - 0.5) < 0.001
      expect(isColor1 || isColor2).toBe(true)
    }
  })

  test('split=true: wave pattern is symmetric around center', () => {
    const algo = new Algorithm(11, { ...baseSettings, split: true })
    algo.runCycle(0, 0)
    // Pixels equidistant from center should have same hue
    for (let d = 1; d <= 5; d++) {
      expect(algo.pixels[5 - d].hue).toBeCloseTo(algo.pixels[5 + d].hue, 3)
    }
  })

  test('wave advances over time (hues change when Date.now advances)', () => {
    // The algorithm's startTime guard: on the first call after construction, startTime is
    // still 0 so the branch sets startTime=curTime, making phase=0 (same as initial).
    // We need a second call after startTime is set to observe a non-zero phase.
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(0)
    const algo = new Algorithm(10, baseSettings)

    // Call 1 at t=250: startTime was 0 → branch fires, sets startTime=0.25, phase=0
    dateSpy.mockReturnValue(250)
    algo.runCycle(0, 0)
    const before = algo.pixels.map(p => p.hue) // startTime=0.25, phase=0

    // Call 2 at t=500: startTime=0.25, branch skipped, phase=(0.25%1/1)*-2π ≠ 0
    dateSpy.mockReturnValue(500)
    algo.runCycle(0, 0)
    const after = algo.pixels.map(p => p.hue)

    const changed = before.some((h, i) => Math.abs(h - after[i]) > 0.01)
    expect(changed).toBe(true)
  })

  test('after a full speed period: wave returns to initial position', () => {
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(0)
    const algo = new Algorithm(10, baseSettings)

    // Lock in startTime=0.25 first
    dateSpy.mockReturnValue(250)
    algo.runCycle(0, 0)
    const before = algo.pixels.map(p => p.hue) // phase=0

    // After one full period (1000ms), phase = (1.0 % 1.0) * ... = 0 again
    dateSpy.mockReturnValue(1250) // 250 + 1000ms
    algo.runCycle(0, 0)
    const after = algo.pixels.map(p => p.hue)
    for (let i = 0; i < 10; i++) {
      expect(after[i]).toBeCloseTo(before[i], 3)
    }
  })

  test('runCycle returns false', () => {
    const algo = new Algorithm(10, baseSettings)
    expect(algo.runCycle(0, 0.016)).toBe(false)
  })
})
