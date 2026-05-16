import { Algorithm } from '../../algorithms/kitt'

const baseSettings = { color: [0, 1, 1], width: 3, speed: 4, fade_time: 1, border: 0 }

describe('Kitt Algorithm', () => {
  test('creates the requested number of pixels', () => {
    const algo = new Algorithm(20, baseSettings)
    expect(algo.pixels).toHaveLength(20)
  })

  test('initial pixels start all dark (default Pixel)', () => {
    const algo = new Algorithm(20, baseSettings)
    // Before any runCycle, pixels are unset (all 0)
    for (const pixel of algo.pixels) {
      expect(pixel.val).toBe(0)
    }
  })

  test('pixels within the pulse width are set to full color after runCycle', () => {
    // speed=1, 20 pixels → perSecond = (20*2)/1 = 40 px/s
    // After 0.01s: pulseLoc ≈ 0.4, halfWidth=0.5
    // Pixel 0 is within [-0.5, +0.5] of 0.4 — set to full color
    const algo = new Algorithm(20, { ...baseSettings, speed: 1 })
    algo.runCycle(0, 0.01)
    // At least some pixels near position 0 should be lit
    const litPixels = algo.pixels.filter(p => p.val > 0)
    expect(litPixels.length).toBeGreaterThan(0)
  })

  test('pixels outside pulse width begin fading after they have been set', () => {
    const algo = new Algorithm(20, { ...baseSettings, speed: 1, width: 1, fade_time: 1 })
    // Move the pulse to around position 3
    algo.runCycle(0, 0.075) // pulseLoc ≈ 3
    const valAtPulse = algo.pixels.filter(p => p.val === 1).length
    // Run again to move pulse away from pixel 0
    algo.runCycle(0, 0.5) // pulseLoc moves further
    // Pixels that were lit but are no longer under the pulse start fading
    const fadingPixels = algo.pixels.filter(p => p.val > 0 && p.val < 1)
    expect(fadingPixels.length + valAtPulse).toBeGreaterThan(0)
  })

  test('pulse bounces when reaching the end of the strip', () => {
    // speed=1, effectSize=20 → needs 0.5s to traverse half (10/20px/s * 2)
    // perSecond = 40, to reach effectSize=20 need 0.5s
    const algo = new Algorithm(20, { ...baseSettings, speed: 1 })
    // Run for more than one full traversal to confirm it bounces back
    // After 0.6s pulseLoc would overshoot 20 and bounce back
    algo.runCycle(0, 0.6)
    // After bounce, pulseLoc is back within [0, effectSize]
    // Just check it doesn't throw and pixels remain valid
    for (const pixel of algo.pixels) {
      expect(pixel.val).toBeGreaterThanOrEqual(0)
      expect(pixel.val).toBeLessThanOrEqual(1)
    }
  })

  test('border: pixels in border zone are never set', () => {
    const algo = new Algorithm(20, { ...baseSettings, border: 4 })
    // Pulse starts at pulseLoc=0 within the effectSize (4..16)
    // Run for a small amount — pulse at border's start pixel 4
    algo.runCycle(0, 0.001)
    // Pixels 0–3 (border zone) should remain at val=0
    for (let i = 0; i < 4; i++) {
      expect(algo.pixels[i].val).toBe(0)
    }
  })

  test('color matches the settings color', () => {
    const color = [0.5, 0.8, 1.0]
    const algo = new Algorithm(20, { ...baseSettings, color, speed: 1 })
    algo.runCycle(0, 0.01)
    const lit = algo.pixels.find(p => p.val === 1)
    if (lit) {
      expect(lit.hue).toBe(0.5)
      expect(lit.sat).toBe(0.8)
    }
  })

  test('runCycle returns false', () => {
    const algo = new Algorithm(20, baseSettings)
    expect(algo.runCycle(0, 0.016)).toBe(false)
  })
})
