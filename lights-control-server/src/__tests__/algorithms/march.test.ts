import { Algorithm } from '../../algorithms/march/march'

const twoColors = [[0, 1, 1], [1 / 3, 1, 1]] // red and green
const baseSettings = { colors: twoColors, freq: 1.0 }

describe('March Algorithm', () => {
  test('creates the requested number of pixels', () => {
    expect(new Algorithm(6, baseSettings).pixels).toHaveLength(6)
  })

  test('construction sets an alternating pattern (no all-off state)', () => {
    const algo = new Algorithm(6, baseSettings)
    // After construction, setColors() has been called once.
    // Some pixels are black (val=0), some are colored (val=1)
    const colored = algo.pixels.filter(p => p.val > 0)
    const black = algo.pixels.filter(p => p.val === 0)
    expect(colored.length).toBeGreaterThan(0)
    expect(black.length).toBeGreaterThan(0)
  })

  test('runCycle does not advance pattern before freq seconds', () => {
    const algo = new Algorithm(6, baseSettings)
    const before = algo.pixels.map(p => ({ hue: p.hue, val: p.val }))
    algo.runCycle(0, 0.5) // half of freq=1.0
    const after = algo.pixels.map(p => ({ hue: p.hue, val: p.val }))
    expect(before).toEqual(after)
  })

  test('pattern shifts after freq seconds elapse', () => {
    const algo = new Algorithm(6, baseSettings)
    const before = algo.pixels.map(p => ({ hue: p.hue, val: p.val }))
    // Use 1.1 > freq=1.0 because the check is sinceChange > cycleTime (strict)
    algo.runCycle(0, 1.1)
    const after = algo.pixels.map(p => ({ hue: p.hue, val: p.val }))
    expect(before).not.toEqual(after)
  })

  test('pattern cycles back to start after numColors * 2 steps', () => {
    const algo = new Algorithm(6, baseSettings)
    const initial = algo.pixels.map(p => ({ hue: p.hue, val: p.val }))
    // 2 colors → cycle length = 4 steps; use 1.1 to exceed freq on each step
    const steps = twoColors.length * 2
    for (let i = 0; i < steps; i++) algo.runCycle(0, 1.1)
    const final = algo.pixels.map(p => ({ hue: p.hue, val: p.val }))
    expect(final).toEqual(initial)
  })

  test('runCycle returns false', () => {
    expect(new Algorithm(6, baseSettings).runCycle(0, 0.016)).toBe(false)
  })

  test('sinceChange accumulates across frames until it exceeds freq', () => {
    const algo = new Algorithm(6, baseSettings)
    const before = algo.pixels.map(p => ({ hue: p.hue, val: p.val }))
    // Each step alone is below freq=1.0, but together they exceed it
    algo.runCycle(0, 0.6)
    const mid = algo.pixels.map(p => ({ hue: p.hue, val: p.val }))
    expect(mid).toEqual(before) // not triggered yet
    algo.runCycle(0, 0.5) // sinceChange = 1.1 > 1.0 → triggers setColors
    const after = algo.pixels.map(p => ({ hue: p.hue, val: p.val }))
    expect(after).not.toEqual(before)
  })
})
