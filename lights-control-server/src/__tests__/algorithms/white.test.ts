import { Algorithm } from '../../algorithms/white'

describe('White Algorithm', () => {
  const make = (n = 10) => new Algorithm(n, {})

  test('all pixels have val=1, sat=0, hue=0, white=0 after construction', () => {
    const algo = make()
    for (const pixel of algo.pixels) {
      expect(pixel.val).toBe(1)
      expect(pixel.sat).toBe(0)
      expect(pixel.hue).toBe(0)
      expect(pixel.white).toBe(0)
    }
  })

  test('creates the requested number of pixels', () => {
    expect(make(5).pixels).toHaveLength(5)
    expect(make(30).pixels).toHaveLength(30)
  })

  test('runCycle returns false', () => {
    expect(make().runCycle(0, 0)).toBe(false)
  })

  test('pixels are unchanged after runCycle', () => {
    const algo = make()
    algo.runCycle(16, 0.016)
    for (const pixel of algo.pixels) {
      expect(pixel.val).toBe(1)
      expect(pixel.sat).toBe(0)
    }
  })
})
