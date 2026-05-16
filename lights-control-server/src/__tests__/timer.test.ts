import { Timer } from '../timer'

describe('Timer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(1000)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('constructor', () => {
    test('sets fps', () => {
      expect(new Timer(60).fps).toBe(60)
      expect(new Timer(30).fps).toBe(30)
    })
  })

  describe('updateFps', () => {
    test('updates fps', () => {
      const timer = new Timer(60)
      timer.updateFps(30)
      expect(timer.fps).toBe(30)
    })

    test('throws RangeError for 0', () => {
      expect(() => new Timer(60).updateFps(0)).toThrow(RangeError)
    })

    test('throws RangeError for negative values', () => {
      expect(() => new Timer(60).updateFps(-5)).toThrow(RangeError)
    })
  })

  describe('sleep', () => {
    test('returns 0 when behind schedule (elapsed exceeds frame duration)', async () => {
      const timer = new Timer(10) // frameDuration = 100ms
      jest.advanceTimersByTime(500) // way past one frame
      const slept = await timer.sleep()
      expect(slept).toBe(0)
    })

    test('resets counter and base time when behind schedule', async () => {
      const timer = new Timer(10)
      jest.advanceTimersByTime(500)
      await timer.sleep() // returns 0, resets state
      // Next call should now sleep for a full frame
      const sleepPromise = timer.sleep()
      await jest.runAllTimersAsync()
      const slept = await sleepPromise
      expect(slept).toBeGreaterThan(0)
    })

    test('returns positive sleep time and resolves when on schedule', async () => {
      const timer = new Timer(10) // frameDuration = 100ms
      // No time has passed, so we should sleep for ~100ms
      const sleepPromise = timer.sleep()
      await jest.runAllTimersAsync()
      const slept = await sleepPromise
      expect(slept).toBeGreaterThan(0)
      expect(slept).toBeLessThanOrEqual(100)
    })

    test('increments frame count within a second (consecutive sleeps stay on schedule)', async () => {
      const timer = new Timer(10) // 100ms per frame

      // First sleep: runAllTimersAsync fires the 100ms timeout, advancing clock to t=1100
      const p1 = timer.sleep()
      await jest.runAllTimersAsync()
      const s1 = await p1
      expect(s1).toBeGreaterThan(0) // slept ~100ms

      // Don't advance further — clock is now at t=1100.
      // Second sleep: target = base(1000) + 100*2 = 1200, curTime=1100 → sleepTime=100ms
      const p2 = timer.sleep()
      await jest.runAllTimersAsync()
      const s2 = await p2
      expect(s2).toBeGreaterThan(0)
    })
  })
})
