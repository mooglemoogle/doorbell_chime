import { bezierBlend, hsvToRgb } from '../../algorithms/_meta/helpers'

describe('bezierBlend', () => {
  test('returns 0 at t=0', () => {
    expect(bezierBlend(0)).toBe(0)
  })

  test('returns 1 at t=1', () => {
    expect(bezierBlend(1)).toBe(1)
  })

  test('returns 0.5 at t=0.5', () => {
    // 0.5 * 0.5 * (3 - 2 * 0.5) = 0.25 * 2 = 0.5
    expect(bezierBlend(0.5)).toBe(0.5)
  })

  test('is monotonically increasing on [0, 1]', () => {
    const steps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    const values = steps.map(bezierBlend)
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1])
    }
  })

  test('output stays within [0, 1]', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const v = bezierBlend(t)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

describe('hsvToRgb', () => {
  const close = (a: number, b: number) => Math.abs(a - b) < 0.001

  test('pure red: h=0, s=1, v=1', () => {
    const [r, g, b] = hsvToRgb(0, 1, 1)
    expect(r).toBe(1)
    expect(close(g, 0)).toBe(true)
    expect(close(b, 0)).toBe(true)
  })

  test('pure green: h=1/3, s=1, v=1', () => {
    const [r, g, b] = hsvToRgb(1 / 3, 1, 1)
    expect(close(r, 0)).toBe(true)
    expect(close(g, 1)).toBe(true)
    expect(close(b, 0)).toBe(true)
  })

  test('pure blue: h=2/3, s=1, v=1', () => {
    const [r, g, b] = hsvToRgb(2 / 3, 1, 1)
    expect(close(r, 0)).toBe(true)
    expect(close(g, 0)).toBe(true)
    expect(close(b, 1)).toBe(true)
  })

  test('black: v=0', () => {
    const [r, g, b] = hsvToRgb(0, 1, 0)
    expect(r).toBe(0)
    expect(g).toBe(0)
    expect(b).toBe(0)
  })

  test('white: s=0, v=1', () => {
    const [r, g, b] = hsvToRgb(0, 0, 1)
    expect(r).toBe(1)
    expect(g).toBe(1)
    expect(b).toBe(1)
  })

  test('half brightness red: h=0, s=1, v=0.5', () => {
    const [r, g, b] = hsvToRgb(0, 1, 0.5)
    expect(close(r, 0.5)).toBe(true)
    expect(close(g, 0)).toBe(true)
    expect(close(b, 0)).toBe(true)
  })

  test('returns tuple of three numbers', () => {
    const result = hsvToRgb(0.5, 0.5, 0.5)
    expect(result).toHaveLength(3)
    result.forEach(v => expect(typeof v).toBe('number'))
  })

  test('all output values are in [0, 1]', () => {
    const hues = [0, 1 / 6, 1 / 3, 0.5, 2 / 3, 5 / 6, 1]
    for (const h of hues) {
      const [r, g, b] = hsvToRgb(h, 1, 1)
      ;[r, g, b].forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      })
    }
  })
})
