import { Algorithm } from '../../algorithms/off'
import { Pixel } from '../../algorithms/_meta/pixel'

describe('Off Algorithm', () => {
  const make = (n = 10) => new Algorithm(n, {})

  test('all pixels start with val=0 and white=0', () => {
    const algo = make()
    for (const pixel of algo.pixels) {
      expect(pixel.val).toBe(0)
      expect(pixel.white).toBe(0)
    }
  })

  test('refreshRate is 2 Hz', () => {
    expect(make().refreshRate()).toBe(2)
  })

  test('runCycle returns false', () => {
    expect(make().runCycle(0, 0)).toBe(false)
  })

  describe('setHueSat', () => {
    test('copies hue and sat from previous pixels', () => {
      const algo = make(3)
      const previous: Pixel[] = [
        new Pixel(0.1, 0.9, 1.0),
        new Pixel(0.5, 0.5, 0.8),
        new Pixel(0.9, 0.2, 0.6),
      ]
      algo.setHueSat(previous)
      expect(algo.pixels[0].hue).toBe(0.1)
      expect(algo.pixels[0].sat).toBe(0.9)
      expect(algo.pixels[1].hue).toBe(0.5)
      expect(algo.pixels[1].sat).toBe(0.5)
      expect(algo.pixels[2].hue).toBe(0.9)
      expect(algo.pixels[2].sat).toBe(0.2)
    })

    test('forces val=0 and white=0 regardless of previous values', () => {
      const algo = make(2)
      const previous: Pixel[] = [new Pixel(0.3, 1.0, 1.0, 1.0), new Pixel(0.7, 0.8, 0.9, 0.5)]
      algo.setHueSat(previous)
      for (const pixel of algo.pixels) {
        expect(pixel.val).toBe(0)
        expect(pixel.white).toBe(0)
      }
    })
  })
})
