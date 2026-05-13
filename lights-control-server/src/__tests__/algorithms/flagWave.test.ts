import { Algorithm } from '../../algorithms/flagWave/flagWave'

const twoPartSettings = {
  flag_parts: [
    { color: [0, 1, 1], parts: 1 },       // red: first half
    { color: [1 / 3, 1, 1], parts: 1 },   // green: second half
  ],
}

const threePartSettings = {
  flag_parts: [
    { color: [0, 1, 1], parts: 1 },       // red
    { color: [1 / 3, 1, 1], parts: 1 },   // green
    { color: [2 / 3, 1, 1], parts: 1 },   // blue
  ],
}

describe('FlagWave Algorithm', () => {
  beforeEach(() => {
    // Fix Math.random to 0 so initial wave offsets are deterministic (no wave shift at t=0)
    jest.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('creates the requested number of pixels', () => {
    const algo = new Algorithm(20, twoPartSettings)
    expect(algo.pixels).toHaveLength(20)
  })

  test('two equal parts: first half is color[0], second half is color[1]', () => {
    const algo = new Algorithm(20, twoPartSettings)
    // With random=0, wave offsets are 0, so split is clean at pixel 10
    expect(algo.pixels[0].hue).toBeCloseTo(0, 3)       // red
    expect(algo.pixels[19].hue).toBeCloseTo(1 / 3, 3)  // green
  })

  test('three equal parts: each section has its color', () => {
    const algo = new Algorithm(30, threePartSettings)
    // With random=0, splits at 10 and 20 (no wave offset)
    expect(algo.pixels[0].hue).toBeCloseTo(0, 3)       // red section
    expect(algo.pixels[25].hue).toBeCloseTo(2 / 3, 3)  // blue section
  })

  test('all pixels have sat=1 and val=1', () => {
    const algo = new Algorithm(20, twoPartSettings)
    for (const pixel of algo.pixels) {
      expect(pixel.sat).toBe(1)
      expect(pixel.val).toBe(1)
    }
  })

  test('runCycle does not throw', () => {
    jest.restoreAllMocks() // allow real random for wave update
    const algo = new Algorithm(20, twoPartSettings)
    expect(() => algo.runCycle(0, 0.1)).not.toThrow()
    expect(() => algo.runCycle(0, 1.0)).not.toThrow()
  })

  test('runCycle updates internal wave state without error across many frames', () => {
    jest.restoreAllMocks() // real random gives non-zero starting offsets
    const algo = new Algorithm(20, twoPartSettings)
    // Run 300 frames — exercises full wave period (WAVE_SPEED=3s, WAVE_SIZE_SPEED=7s)
    expect(() => {
      for (let i = 0; i < 300; i++) algo.runCycle(0, 0.1)
    }).not.toThrow()
    // After many frames all pixels should still be one of the two flag colors
    for (const pixel of algo.pixels) {
      const isColor0 = Math.abs(pixel.hue - 0) < 0.001
      const isColor1 = Math.abs(pixel.hue - 1 / 3) < 0.001
      expect(isColor0 || isColor1).toBe(true)
    }
  })

  test('parts weighting: unequal parts divide the strip proportionally', () => {
    const algo = new Algorithm(30, {
      flag_parts: [
        { color: [0, 1, 1], parts: 2 },     // red: 2/3 of strip (20 pixels)
        { color: [1 / 3, 1, 1], parts: 1 }, // green: 1/3 of strip (10 pixels)
      ],
    })
    // With random=0, first split at floor(30 * 2/3) = 20
    expect(algo.pixels[0].hue).toBeCloseTo(0, 3)
    expect(algo.pixels[29].hue).toBeCloseTo(1 / 3, 3)
  })

  test('runCycle returns false', () => {
    const algo = new Algorithm(20, twoPartSettings)
    expect(algo.runCycle(0, 0.016)).toBe(false)
  })
})
