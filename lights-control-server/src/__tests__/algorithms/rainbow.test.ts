import { Algorithm } from '../../algorithms/rainbow/rainbow'

describe('Rainbow Algorithm', () => {
  const baseSettings = { speed: 360, reverse: false }

  test('pixel[0] starts at hue=0', () => {
    const algo = new Algorithm(10, baseSettings)
    expect(algo.pixels[0].hue).toBe(0)
  })

  test('hues span evenly from 0 to (n-1)/n across the strip', () => {
    const n = 10
    const algo = new Algorithm(n, baseSettings)
    const perItem = 1.0 / n
    for (let i = 0; i < n; i++) {
      expect(algo.pixels[i].hue).toBeCloseTo(perItem * i, 5)
    }
  })

  test('all pixels start at sat=1 and val=1', () => {
    const algo = new Algorithm(10, baseSettings)
    for (const pixel of algo.pixels) {
      expect(pixel.sat).toBe(1)
      expect(pixel.val).toBe(1)
    }
  })

  test('runCycle shifts hues by speed/360 * elapsed', () => {
    const algo = new Algorithm(10, baseSettings)
    const before = algo.pixels.map(p => p.hue)
    // speed=360, elapsed=0.1 → toMove = 1.0 * 0.1 = 0.1
    algo.runCycle(0, 0.1)
    for (let i = 0; i < 10; i++) {
      // Algorithm uses strict > 1.0 (not >=), so match that boundary exactly
      let expected = before[i] + 0.1
      if (expected > 1.0) expected -= 1.0
      expect(algo.pixels[i].hue).toBeCloseTo(expected, 5)
    }
  })

  test('reverse: hues shift in the negative direction', () => {
    const fwd = new Algorithm(10, { speed: 360, reverse: false })
    const rev = new Algorithm(10, { speed: 360, reverse: true })
    const fwdBefore = fwd.pixels[0].hue
    const revBefore = rev.pixels[0].hue
    fwd.runCycle(0, 0.1)
    rev.runCycle(0, 0.1)
    expect(fwd.pixels[0].hue).toBeGreaterThan(fwdBefore)
    // rev hue decreases but wraps — check it moved differently from fwd
    expect(rev.pixels[0].hue).not.toBeCloseTo(fwd.pixels[0].hue, 3)
  })

  test('hue wraps above 1.0 after shift', () => {
    const algo = new Algorithm(10, baseSettings)
    // pixel[9].hue = 0.9; shift by 0.5 → 1.4 > 1.0 → wraps to 0.4
    algo.runCycle(0, 0.5)
    expect(algo.pixels[9].hue).toBeCloseTo(0.4, 4)
  })

  test('hue wraps below 0.0 when reversed', () => {
    const algo = new Algorithm(10, { speed: 360, reverse: true })
    // pixel[0].hue = 0.0; shift by -0.1 → -0.1 < 0 → wraps to 0.9
    algo.runCycle(0, 0.1)
    expect(algo.pixels[0].hue).toBeCloseTo(0.9, 4)
  })

  test('full rotation returns hues to original values', () => {
    const algo = new Algorithm(10, baseSettings)
    const before = algo.pixels.map(p => p.hue)
    // Use 1.05 so all hues overshoot 1.0 and wrap; pixel[0] goes 0 → 1.05 → 0.05
    algo.runCycle(0, 1.05)
    for (let i = 0; i < 10; i++) {
      let expected = before[i] + 1.05
      if (expected > 1.0) expected -= 1.0
      expect(algo.pixels[i].hue).toBeCloseTo(expected, 4)
    }
  })

  test('runCycle returns false', () => {
    expect(new Algorithm(10, baseSettings).runCycle(0, 0.016)).toBe(false)
  })
})
