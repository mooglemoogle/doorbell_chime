import { Algorithm } from '../../algorithms/pulseSwitch/pulseSwitch'

const baseSettings = {
  colors: [[0, 1, 1], [1 / 3, 1, 1]], // red, green
  onTime: 1.0,
  pulseTime: 0.5, // halfPulse = 0.25
  lightsPerColor: 3,
  spaceBetween: 1,
}

describe('PulseSwitch Algorithm', () => {
  test('creates the requested number of pixels', () => {
    expect(new Algorithm(10, baseSettings).pixels).toHaveLength(10)
  })

  test('construction sets colored groups separated by black pixels', () => {
    const algo = new Algorithm(10, baseSettings)
    // Group of 3 colored, 1 black, group of 3 colored, 1 black, ...
    // pixels[0..2] = color[0] (or color[1]), pixels[3] = black
    expect(algo.pixels[0].val).toBeGreaterThan(0)
    expect(algo.pixels[1].val).toBeGreaterThan(0)
    expect(algo.pixels[2].val).toBeGreaterThan(0)
    expect(algo.pixels[3].val).toBe(0) // space
  })

  test('during onTime phase: pixel brightness stays at full', () => {
    const algo = new Algorithm(10, baseSettings)
    algo.runCycle(0, 0.5) // 0.5s < onTime=1.0, still in onTime phase
    expect(algo.pixels[0].val).toBeCloseTo(1.0, 5)
  })

  test('during pulse-down phase: brightness decreases below 1', () => {
    const algo = new Algorithm(10, baseSettings)
    algo.runCycle(0, 1.0) // exhaust onTime
    algo.runCycle(0, 0.1) // enter pulse-down phase (0.1s into it)
    expect(algo.pixels[0].val).toBeLessThan(1.0)
    expect(algo.pixels[0].val).toBeGreaterThan(0)
  })

  test('evenCycle flips at the halfway point of pulse', () => {
    const algo = new Algorithm(10, baseSettings)
    const firstHue = algo.pixels[0].hue // color[0]
    // Advance through onTime + halfPulse to trigger color switch
    algo.runCycle(0, 1.0)   // exhaust onTime
    algo.runCycle(0, 0.25)  // exhaust pulse-down (halfPulse=0.25)
    algo.runCycle(0, 0.001) // first tick of pulse-up — evenCycle has flipped
    // Now pixels should be set to the other color
    expect(algo.pixels[0].hue).not.toBeCloseTo(firstHue, 3)
  })

  test('during pulse-up phase: brightness increases back toward 1', () => {
    const algo = new Algorithm(10, baseSettings)
    algo.runCycle(0, 1.0)  // exhaust onTime
    algo.runCycle(0, 0.25) // exhaust pulse-down
    algo.runCycle(0, 0.1)  // 40% through pulse-up
    expect(algo.pixels[0].val).toBeGreaterThan(0)
    expect(algo.pixels[0].val).toBeLessThan(1.0)
  })

  test('after a full cycle: timers reset and new onTime phase starts', () => {
    const algo = new Algorithm(10, baseSettings)
    algo.runCycle(0, 1.0)  // exhaust onTime
    algo.runCycle(0, 0.25) // exhaust pulse-down
    algo.runCycle(0, 0.25) // exhaust pulse-up → timers reset on next tick
    algo.runCycle(0, 0.001) // reset happens here; enters new onTime
    // At start of new onTime, brightness should be full (or close)
    expect(algo.pixels[0].val).toBeCloseTo(1.0, 1)
  })

  test('runCycle returns false', () => {
    expect(new Algorithm(10, baseSettings).runCycle(0, 0.016)).toBe(false)
  })
})
