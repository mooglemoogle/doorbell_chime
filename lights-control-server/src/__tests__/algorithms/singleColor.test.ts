import { Algorithm } from '../../algorithms/singleColor'

describe('SingleColor Algorithm', () => {
  test('all pixels match a 3-component color setting', () => {
    const algo = new Algorithm(8, { color: [0.25, 0.8, 0.6] })
    for (const pixel of algo.pixels) {
      expect(pixel.hue).toBe(0.25)
      expect(pixel.sat).toBe(0.8)
      expect(pixel.val).toBe(0.6)
      expect(pixel.white).toBe(0)
    }
  })

  test('all pixels match a 4-component color setting (with white)', () => {
    const algo = new Algorithm(5, { color: [0.5, 1.0, 0.9, 0.3] })
    for (const pixel of algo.pixels) {
      expect(pixel.hue).toBe(0.5)
      expect(pixel.sat).toBe(1.0)
      expect(pixel.val).toBe(0.9)
      expect(pixel.white).toBe(0.3)
    }
  })

  test('works with different pixel counts', () => {
    const settings = { color: [0.1, 0.2, 0.3] }
    expect(new Algorithm(1, settings).pixels).toHaveLength(1)
    expect(new Algorithm(50, settings).pixels).toHaveLength(50)
  })

  test('runCycle returns false', () => {
    const algo = new Algorithm(5, { color: [0, 1, 1] })
    expect(algo.runCycle(0, 0)).toBe(false)
  })

  test('pixels are unchanged after runCycle', () => {
    const algo = new Algorithm(4, { color: [0.7, 0.5, 0.8] })
    algo.runCycle(16, 0.016)
    for (const pixel of algo.pixels) {
      expect(pixel.hue).toBe(0.7)
      expect(pixel.val).toBe(0.8)
    }
  })
})
