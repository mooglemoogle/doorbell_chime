import { Algorithm } from '../../algorithms/blank'

describe('Blank Algorithm', () => {
  const make = (n = 10) => new Algorithm(n, {})

  test('all pixels are (0, 0, 0, 0) after construction', () => {
    const algo = make()
    for (const pixel of algo.pixels) {
      expect(pixel.hue).toBe(0)
      expect(pixel.sat).toBe(0)
      expect(pixel.val).toBe(0)
      expect(pixel.white).toBe(0)
    }
  })

  test('creates the requested number of pixels', () => {
    expect(make(5).pixels).toHaveLength(5)
    expect(make(30).pixels).toHaveLength(30)
  })

  test('refreshRate is 2 Hz', () => {
    expect(make().refreshRate()).toBe(2)
  })

  test('runCycle returns false', () => {
    const algo = make()
    expect(algo.runCycle(0, 0)).toBe(false)
  })

  test('pixels remain zero after runCycle', () => {
    const algo = make()
    algo.runCycle(16, 0.016)
    for (const pixel of algo.pixels) {
      expect(pixel.val).toBe(0)
    }
  })
})
