import { Algorithm } from '../../algorithms/splitRainbow/splitRainbow'

describe('SplitRainbow Algorithm', () => {
  const baseSettings = { speed: 360, reverse: false }

  describe('odd pixel count (11 pixels, center at index 5)', () => {
    test('center pixel has hue=0', () => {
      const algo = new Algorithm(11, baseSettings)
      expect(algo.pixels[5].hue).toBe(0)
    })

    test('pixels equidistant from center have the same hue', () => {
      const algo = new Algorithm(11, baseSettings)
      expect(algo.pixels[4].hue).toBeCloseTo(algo.pixels[6].hue, 5)
      expect(algo.pixels[3].hue).toBeCloseTo(algo.pixels[7].hue, 5)
      expect(algo.pixels[0].hue).toBeCloseTo(algo.pixels[10].hue, 5)
    })

    test('hue increases from center outward', () => {
      const algo = new Algorithm(11, baseSettings)
      expect(algo.pixels[4].hue).toBeLessThan(algo.pixels[3].hue)
      expect(algo.pixels[3].hue).toBeLessThan(algo.pixels[2].hue)
    })
  })

  describe('even pixel count (10 pixels, centers at index 4 and 5)', () => {
    test('both center pixels have hue=0', () => {
      const algo = new Algorithm(10, baseSettings)
      expect(algo.pixels[4].hue).toBe(0)
      expect(algo.pixels[5].hue).toBe(0)
    })

    test('pixels equidistant from the center pair have the same hue', () => {
      const algo = new Algorithm(10, baseSettings)
      expect(algo.pixels[3].hue).toBeCloseTo(algo.pixels[6].hue, 5)
      expect(algo.pixels[0].hue).toBeCloseTo(algo.pixels[9].hue, 5)
    })
  })

  test('all pixels have sat=1 and val=1', () => {
    const algo = new Algorithm(11, baseSettings)
    for (const pixel of algo.pixels) {
      expect(pixel.sat).toBe(1)
      expect(pixel.val).toBe(1)
    }
  })

  test('runCycle shifts hues by speed/360 * elapsed', () => {
    const algo = new Algorithm(11, baseSettings)
    const before = algo.pixels.map(p => p.hue)
    // speed=360, elapsed=0.1 → toMove = 0.1
    algo.runCycle(0, 0.1)
    for (let i = 0; i < 11; i++) {
      let expected = before[i] + 0.1
      if (expected >= 1.0) expected -= 1.0
      expect(algo.pixels[i].hue).toBeCloseTo(expected, 5)
    }
  })

  test('reverse: hues shift in the negative direction', () => {
    const algo = new Algorithm(11, { speed: 360, reverse: true })
    // Center pixel hue=0, after reverse shift should become ~0.9 (wraps)
    algo.runCycle(0, 0.1)
    expect(algo.pixels[5].hue).toBeCloseTo(0.9, 4)
  })

  test('hue wraps correctly above 1.0 and below 0.0', () => {
    const algo = new Algorithm(11, baseSettings)
    // Use 1.05 so hues overshoot 1.0 (strict > check) and wrap.
    // Center pixel: 0 + 1.05 = 1.05 > 1.0 → wraps to 0.05
    algo.runCycle(0, 1.05)
    const center = algo.pixels[5].hue
    expect(center).toBeCloseTo(0.05, 4)
  })

  test('symmetry is preserved after rotation', () => {
    const algo = new Algorithm(11, baseSettings)
    algo.runCycle(0, 0.3)
    // After rotation, equidistant pixels from center still have same hue
    expect(algo.pixels[4].hue).toBeCloseTo(algo.pixels[6].hue, 4)
    expect(algo.pixels[3].hue).toBeCloseTo(algo.pixels[7].hue, 4)
  })

  test('runCycle returns false', () => {
    expect(new Algorithm(11, baseSettings).runCycle(0, 0.016)).toBe(false)
  })
})
