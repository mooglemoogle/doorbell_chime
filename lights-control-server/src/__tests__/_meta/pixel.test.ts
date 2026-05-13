import { Pixel } from '../../algorithms/_meta/pixel'
import { hsvToRgb } from '../../algorithms/_meta/helpers'

describe('Pixel constructor', () => {
  test('default: all fields are 0', () => {
    const p = new Pixel()
    expect(p.hue).toBe(0)
    expect(p.sat).toBe(0)
    expect(p.val).toBe(0)
    expect(p.white).toBe(0)
  })

  test('positional args set all four fields', () => {
    const p = new Pixel(0.5, 0.8, 0.9, 0.2)
    expect(p.hue).toBe(0.5)
    expect(p.sat).toBe(0.8)
    expect(p.val).toBe(0.9)
    expect(p.white).toBe(0.2)
  })
})

describe('Pixel.set', () => {
  test('sets hue, sat, val and defaults white to 0', () => {
    const p = new Pixel(1, 1, 1, 1)
    p.set(0.3, 0.6, 0.9)
    expect(p.hue).toBe(0.3)
    expect(p.sat).toBe(0.6)
    expect(p.val).toBe(0.9)
    expect(p.white).toBe(0)
  })

  test('sets all four fields when white is provided', () => {
    const p = new Pixel()
    p.set(0.1, 0.2, 0.3, 0.4)
    expect(p.hue).toBe(0.1)
    expect(p.sat).toBe(0.2)
    expect(p.val).toBe(0.3)
    expect(p.white).toBe(0.4)
  })
})

describe('Pixel.clear', () => {
  test('resets all fields to 0', () => {
    const p = new Pixel(0.5, 0.5, 0.5, 0.5)
    p.clear()
    expect(p.hue).toBe(0)
    expect(p.sat).toBe(0)
    expect(p.val).toBe(0)
    expect(p.white).toBe(0)
  })
})

describe('Pixel.multiply', () => {
  test('returns a new pixel with val and white scaled', () => {
    const p = new Pixel(0.4, 0.8, 1.0, 0.6)
    const result = p.multiply(0.5)
    expect(result.hue).toBe(0.4)
    expect(result.sat).toBe(0.8)
    expect(result.val).toBeCloseTo(0.5)
    expect(result.white).toBeCloseTo(0.3)
  })

  test('does not mutate the original', () => {
    const p = new Pixel(0.4, 0.8, 1.0, 0.6)
    p.multiply(0.5)
    expect(p.val).toBe(1.0)
    expect(p.white).toBe(0.6)
  })

  test('multiply by 0 produces zero val and white', () => {
    const p = new Pixel(0.4, 0.8, 1.0, 0.6)
    const result = p.multiply(0)
    expect(result.val).toBe(0)
    expect(result.white).toBe(0)
  })
})

describe('Pixel.diff', () => {
  test('returns field-wise subtraction', () => {
    const a = new Pixel(0.8, 0.6, 0.4, 0.2)
    const b = new Pixel(0.3, 0.2, 0.1, 0.1)
    const d = a.diff(b)
    expect(d.hue).toBeCloseTo(0.5)
    expect(d.sat).toBeCloseTo(0.4)
    expect(d.val).toBeCloseTo(0.3)
    expect(d.white).toBeCloseTo(0.1)
  })

  test('can produce negative values', () => {
    const a = new Pixel(0.1, 0.1, 0.1, 0)
    const b = new Pixel(0.5, 0.5, 0.5, 0)
    const d = a.diff(b)
    expect(d.hue).toBeCloseTo(-0.4)
    expect(d.val).toBeCloseTo(-0.4)
  })
})

describe('Pixel.combineWith', () => {
  test('additively blends RGB values', () => {
    // Red pixel combined with green pixel → yellow
    const p = new Pixel(0, 1, 1) // red
    const other = new Pixel(1 / 3, 1, 1) // green
    p.combineWith(other)
    const [r, g, b] = p.getRawRgb()
    expect(r).toBeCloseTo(1, 1)
    expect(g).toBeCloseTo(1, 1)
    expect(b).toBeCloseTo(0, 1)
  })

  test('clamps combined values at 1.0', () => {
    const p = new Pixel(0, 1, 1) // full red
    p.combineWith(new Pixel(0, 1, 1)) // add another full red
    const [r] = p.getRawRgb()
    expect(r).toBeLessThanOrEqual(1.0)
  })

  test('mutates the receiver, not the argument', () => {
    const p = new Pixel(0, 1, 0.5)
    const other = new Pixel(1 / 3, 1, 0.5)
    const otherHueBefore = other.hue
    p.combineWith(other)
    expect(other.hue).toBe(otherHueBefore)
  })
})

describe('Pixel.fromRgb', () => {
  test('pure red [1, 0, 0]', () => {
    const p = new Pixel()
    p.fromRgb(1, 0, 0)
    expect(p.hue).toBeCloseTo(0, 3)
    expect(p.sat).toBeCloseTo(1, 3)
    expect(p.val).toBeCloseTo(1, 3)
  })

  test('pure green [0, 1, 0]', () => {
    const p = new Pixel()
    p.fromRgb(0, 1, 0)
    expect(p.hue).toBeCloseTo(1 / 3, 3)
    expect(p.sat).toBeCloseTo(1, 3)
    expect(p.val).toBeCloseTo(1, 3)
  })

  test('black [0, 0, 0]: sat=0 (delta=0 branch)', () => {
    const p = new Pixel()
    p.fromRgb(0, 0, 0)
    expect(p.sat).toBe(0)
    expect(p.val).toBe(0)
  })

  test('white [1, 1, 1]: sat=0, val=1', () => {
    const p = new Pixel()
    p.fromRgb(1, 1, 1)
    expect(p.sat).toBeCloseTo(0, 3)
    expect(p.val).toBeCloseTo(1, 3)
  })

  test('round-trips through hsvToRgb', () => {
    const [r, g, b] = hsvToRgb(0.25, 0.7, 0.9)
    const p = new Pixel()
    p.fromRgb(r, g, b)
    const [r2, g2, b2] = p.getRawRgb()
    expect(r2).toBeCloseTo(r, 3)
    expect(g2).toBeCloseTo(g, 3)
    expect(b2).toBeCloseTo(b, 3)
  })
})

describe('Pixel.getRawRgb', () => {
  test('returns [r, g, b] in [0, 1] range', () => {
    const p = new Pixel(0, 1, 1)
    const rgb = p.getRawRgb()
    expect(rgb).toHaveLength(3)
    rgb.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    })
  })

  test('matches hsvToRgb directly', () => {
    const p = new Pixel(0.6, 0.8, 0.7)
    const [r, g, b] = p.getRawRgb()
    const [er, eg, eb] = hsvToRgb(0.6, 0.8, 0.7)
    expect(r).toBeCloseTo(er, 5)
    expect(g).toBeCloseTo(eg, 5)
    expect(b).toBeCloseTo(eb, 5)
  })
})

describe('Pixel.getRgb', () => {
  test('returns [r, g, b] in 0–255 range', () => {
    const p = new Pixel(0, 1, 1)
    const [r, g, b] = p.getRgb(1)
    expect(r).toBe(255)
    expect(g).toBeCloseTo(0, 0)
    expect(b).toBeCloseTo(0, 0)
  })

  test('scales by brightness', () => {
    const p = new Pixel(0, 1, 1)
    const [r] = p.getRgb(0.5)
    expect(r).toBeCloseTo(127.5, 0)
  })

  test('brightness=0 produces all zeros', () => {
    const p = new Pixel(0, 1, 1)
    const [r, g, b] = p.getRgb(0)
    expect(r).toBe(0)
    expect(g).toBe(0)
    expect(b).toBe(0)
  })
})

describe('Pixel.getRgbw', () => {
  test('returns four-element tuple', () => {
    const p = new Pixel(0, 1, 1, 0.5)
    expect(p.getRgbw(1)).toHaveLength(4)
  })

  test('white channel is white * 255 * brightness', () => {
    const p = new Pixel(0, 0, 0, 1.0)
    const [, , , w] = p.getRgbw(0.5)
    expect(w).toBeCloseTo(127.5, 0)
  })

  test('white=0 produces zero white channel', () => {
    const p = new Pixel(0, 1, 1, 0)
    const [, , , w] = p.getRgbw(1)
    expect(w).toBe(0)
  })
})
