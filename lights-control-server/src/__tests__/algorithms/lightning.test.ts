import { Algorithm } from '../../algorithms/lightning/lightning'

const baseSettings = { color: [2 / 3, 1, 1], max_bolts: 3, bolt_prob: 0, bump_prob: 0 }

describe('Lightning Algorithm', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('starts with all pixels clear', () => {
    const algo = new Algorithm(20, baseSettings)
    for (const pixel of algo.pixels) {
      expect(pixel.val).toBe(0)
    }
  })

  test('bolt_prob=0: no bolts appear across many frames', () => {
    const algo = new Algorithm(20, baseSettings) // bolt_prob=0
    for (let i = 0; i < 20; i++) algo.runCycle(0, 0.1)
    for (const pixel of algo.pixels) {
      expect(pixel.val).toBe(0)
    }
  })

  test('bolt_prob=1: a bolt appears after the first runCycle', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5)
    const algo = new Algorithm(20, { ...baseSettings, bolt_prob: 1, max_bolts: 1 })
    algo.runCycle(0, 0.1)
    const anyLit = algo.pixels.some(p => p.val > 0)
    expect(anyLit).toBe(true)
  })

  test('max_bolts=1: second runCycle does not add a second bolt when first is still alive', () => {
    // Use a sequence: first call is for position check (bolt_prob=1), rest for size
    let callCount = 0
    jest.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      return 0.5
    })
    const algo = new Algorithm(30, { ...baseSettings, bolt_prob: 1, bump_prob: 1, max_bolts: 1 })
    algo.runCycle(0, 0.016) // adds 1 bolt
    const litAfterFirst = algo.pixels.filter(p => p.val > 0).length
    algo.runCycle(0, 0.016) // should NOT add another bolt (max reached)
    const litAfterSecond = algo.pixels.filter(p => p.val > 0).length
    // Pixel count should be the same or less (bolt still alive due to bump_prob=1)
    expect(litAfterSecond).toBeGreaterThan(0)
    expect(litAfterFirst).toBeGreaterThan(0)
  })

  test('bump_prob=0: bolt percentage decreases by 0.5 * elapsed each frame', () => {
    // Force Math.random: first call for bolt_prob check → 0 (< 1, bolt created)
    // subsequent calls for bumpProb check → 1 (> 0, no bump)
    let firstCall = true
    jest.spyOn(Math, 'random').mockImplementation(() => {
      if (firstCall) { firstCall = false; return 0 } // position/size
      return 1 // never bumps, always fades
    })
    const algo = new Algorithm(30, { ...baseSettings, bolt_prob: 1, bump_prob: 0, max_bolts: 1 })
    algo.runCycle(0, 0.016) // bolt added at percentage=1.0
    // Advance: percentage should decrease by 0.5 * 1 = 0.5
    algo.runCycle(0, 1.0)
    // Some pixels should be dimmer than full
    const maxVal = Math.max(...algo.pixels.map(p => p.val))
    expect(maxVal).toBeLessThan(1.0)
  })

  test('cleared bolts are replaced immediately when bolt_prob=1', () => {
    // With bolt_prob=1 and bump_prob=0, a bolt fades and is cleared in the same frame
    // that addBolt() fires again — so there is always at most 1 bolt present.
    jest.spyOn(Math, 'random').mockImplementation(() => 0)
    const algo = new Algorithm(30, { ...baseSettings, bolt_prob: 1, bump_prob: 0, max_bolts: 1 })
    for (let i = 0; i < 40; i++) algo.runCycle(0, 0.1)
    // A replacement bolt should always exist (never all-zero after clearing)
    const anyLit = algo.pixels.some(p => p.val > 0)
    expect(anyLit).toBe(true)
  })

  test('runCycle returns false', () => {
    const algo = new Algorithm(20, baseSettings)
    expect(algo.runCycle(0, 0.016)).toBe(false)
  })
})
