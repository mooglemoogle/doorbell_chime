import { Algorithm } from '../../algorithms/transition'
import { Pixel } from '../../algorithms/_meta/pixel'
import { bezierBlend } from '../../algorithms/_meta/helpers'

function makePixels(n: number, hue: number, val = 1): Pixel[] {
  return Array.from({ length: n }, () => new Pixel(hue, 1, val))
}

describe('Transition Algorithm', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(0)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const TRANSITION_MS = 1000
  const settings = { transition_time: TRANSITION_MS }

  test('transitionTime() reflects the setting', () => {
    const algo = new Algorithm(4, settings)
    expect(algo.transitionTime()).toBe(TRANSITION_MS)
  })

  test('immediately after reset: pixels match previousPixels (t=0)', () => {
    const algo = new Algorithm(4, settings)
    const prev = makePixels(4, 0.1) // red-ish
    const next = makePixels(4, 0.9) // blue-ish
    algo.reset(prev, next)
    // No time has elapsed — bezierBlend(0) = 0, so pixels should equal prev
    const result = algo.runCycle(0, 0)
    expect(result).toBe(false)
    expect(algo.pixels[0].hue).toBeCloseTo(0.1, 5)
  })

  test('at 50% elapsed: pixels are bezier-blended between prev and next', () => {
    const algo = new Algorithm(4, settings)
    const prev = makePixels(4, 0.0) // hue=0
    const next = makePixels(4, 1.0) // hue=1
    algo.reset(prev, next)
    jest.advanceTimersByTime(500) // 50% of 1000ms
    algo.runCycle(0, 0)
    // bezierBlend(0.5) = 0.5, so hue = 0 + (1 - 0) * 0.5 = 0.5
    expect(algo.pixels[0].hue).toBeCloseTo(bezierBlend(0.5), 3)
  })

  test('after full transition_time: returns true and pixels match nextPixels', () => {
    const algo = new Algorithm(4, settings)
    const prev = makePixels(4, 0.1)
    const next = makePixels(4, 0.9)
    algo.reset(prev, next)
    jest.advanceTimersByTime(TRANSITION_MS + 1)
    const result = algo.runCycle(0, 0)
    expect(result).toBe(true)
    expect(algo.pixels[0].hue).toBe(0.9)
    expect(algo.pixels[0].sat).toBe(1)
    expect(algo.pixels[0].val).toBe(1)
  })

  test('before full transition_time: returns false', () => {
    const algo = new Algorithm(4, settings)
    algo.reset(makePixels(4, 0), makePixels(4, 1))
    jest.advanceTimersByTime(999)
    expect(algo.runCycle(0, 0)).toBe(false)
  })

  test('blends all four pixel channels', () => {
    const algo = new Algorithm(2, settings)
    const prev = [new Pixel(0.0, 0.0, 0.0, 0.0), new Pixel(0.0, 0.0, 0.0, 0.0)]
    const next = [new Pixel(1.0, 1.0, 1.0, 1.0), new Pixel(1.0, 1.0, 1.0, 1.0)]
    algo.reset(prev, next)
    jest.advanceTimersByTime(500)
    algo.runCycle(0, 0)
    const p = algo.pixels[0]
    const blend = bezierBlend(0.5)
    expect(p.hue).toBeCloseTo(blend, 3)
    expect(p.sat).toBeCloseTo(blend, 3)
    expect(p.val).toBeCloseTo(blend, 3)
    expect(p.white).toBeCloseTo(blend, 3)
  })

  test('calling reset() again restarts the timer', () => {
    const algo = new Algorithm(4, settings)
    const prev = makePixels(4, 0.0)
    const next = makePixels(4, 1.0)
    algo.reset(prev, next)
    jest.advanceTimersByTime(TRANSITION_MS + 1)
    // Transition completes
    expect(algo.runCycle(0, 0)).toBe(true)
    // Reset again and advance only half
    algo.reset(makePixels(4, 0.0), makePixels(4, 1.0))
    jest.advanceTimersByTime(500)
    expect(algo.runCycle(0, 0)).toBe(false)
  })
})
