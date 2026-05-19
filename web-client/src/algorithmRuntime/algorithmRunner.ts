import { BaseAlgorithm } from './baseAlgorithm'
import { Pixel } from './pixel'

export class AlgorithmRunner {
  private rafId: number | null = null
  private lastFrameTime: number | null = null

  start(algorithm: BaseAlgorithm, onFrame: (pixels: Pixel[]) => void): void {
    this.stop()
    this.lastFrameTime = null

    const minFrameMs = 1000 / algorithm.refreshRate()

    const loop = (timestamp: number) => {
      if (this.lastFrameTime === null) this.lastFrameTime = timestamp - minFrameMs

      const elapsed = timestamp - this.lastFrameTime
      if (elapsed >= minFrameMs) {
        this.lastFrameTime = timestamp
        algorithm.runCycle(elapsed, elapsed / 1000)
        onFrame([...algorithm.pixels])
      }

      this.rafId = requestAnimationFrame(loop)
    }

    this.rafId = requestAnimationFrame(loop)
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  isRunning(): boolean {
    return this.rafId !== null
  }
}
