export class Timer {
  fps: number
  private frameDuration: number
  private lastZeroCallEndTime: number
  private lastZeroCount: number

  constructor(framesPerSecond: number) {
    this.fps = framesPerSecond
    this.frameDuration = 1000 / framesPerSecond
    this.lastZeroCallEndTime = Date.now()
    this.lastZeroCount = 1
  }

  updateFps(newFps: number): void {
    if (newFps <= 0) throw new RangeError('framesPerSecond must be a positive, nonzero number')
    this.fps = newFps
    this.frameDuration = 1000 / newFps
    this.lastZeroCallEndTime = Date.now()
    this.lastZeroCount = 1
  }

  async sleep(): Promise<number> {
    const curTime = Date.now()
    const sleepTime =
      this.lastZeroCallEndTime + this.frameDuration * this.lastZeroCount - curTime

    if (sleepTime <= 0) {
      this.lastZeroCallEndTime = curTime
      this.lastZeroCount = 1
      return 0
    }

    await new Promise<void>(resolve => setTimeout(resolve, sleepTime))
    this.lastZeroCount++
    return sleepTime
  }
}
