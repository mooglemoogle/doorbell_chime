import { Status } from '../status'
import { Cycles } from '../cycles'
import logger from '../logger'
import { Cycle } from '../cycle'
import { Timer } from '../timer'
import { algorithms } from '../algorithms/index'
import { BaseAlgorithm } from '../algorithms/_meta/index'
import { Algorithm as OffAlgorithm } from '../algorithms/off'
import { Algorithm as TransitionAlgorithm } from '../algorithms/transition'
import { Pixel } from '../algorithms/_meta/pixel'
import { StripRegistry } from '../strips/registry'
import { FrameGenerator } from './frameGenerator'

export class AnimationRunner {
  private readonly status: Status
  private readonly cycles: Cycles
  private readonly registry: StripRegistry
  private readonly frameGenerator: FrameGenerator

  private currentCycle: Cycle
  private cycleIndex = 0
  private readonly offAlg: OffAlgorithm
  private readonly transitionAlg: TransitionAlgorithm
  private curAlg: BaseAlgorithm
  private nextAlg: BaseAlgorithm
  private lastChangeTime = Date.now()
  private nextCycleLength = Infinity
  timer: Timer
  private running = false

  /** Virtual pixel array spanning all strips combined */
  pixels: Pixel[]

  constructor(
    status: Status,
    cycles: Cycles,
    registry: StripRegistry,
    frameGenerator: FrameGenerator,
  ) {
    this.status = status
    this.cycles = cycles
    this.registry = registry
    this.frameGenerator = frameGenerator
    this.currentCycle = this.cycles.getCycle(this.status.getValue('current_cycle'))

    const numPx = this.registry.totalPixels
    this.pixels = Array.from({ length: numPx }, () => new Pixel())

    this.offAlg = new OffAlgorithm(numPx, {})
    this.transitionAlg = new TransitionAlgorithm(numPx, {
      transition_time: this.status.getValue('transition_time'),
    })
    this.curAlg = this.offAlg
    this.nextAlg = this.offAlg

    this.timer = new Timer(this.curAlg.refreshRate())
    this.refreshAlgorithms()

    logger.info('Animation runner ready', { totalPixels: numPx, strips: this.registry.strips.length })
  }

  fps(): number {
    return this.curAlg.refreshRate()
  }

  private refreshAlgorithms(): void {
    this.cycleIndex = -1
    if (this.currentCycle.cycles.length === 0 || !this.status.getValue('running')) {
      this.turnOff()
    } else {
      this.nextAlgorithm()
    }
  }

  nextAlgorithm(): void {
    const cycle = this.currentCycle.cycles
    this.cycleIndex++
    if (this.cycleIndex >= cycle.length) this.cycleIndex = 0

    const entry = cycle[this.cycleIndex]
    this.nextCycleLength = entry.seconds_in_cycle
    const mod = algorithms[entry.algorithm]
    if (!mod) throw new Error(`Unknown algorithm: ${entry.algorithm}`)

    logger.info('Algorithm queued', {
      algorithm: entry.algorithm,
      cycleIndex: this.cycleIndex,
      durationSecs: entry.seconds_in_cycle,
      cycle: this.currentCycle.name,
    })

    this.nextAlg = new mod.Algorithm(this.registry.totalPixels, entry.options)
    this.startTransition()
    this.timer.updateFps(this.transitionAlg.refreshRate())
    // Send sync to all strips so they flush their buffers at the right time
    this.frameGenerator.broadcastSync(this.timer)
  }

  turnOff(): void {
    logger.info('Lights off')
    this.cycleIndex = -1
    this.nextAlg = this.offAlg
    this.offAlg.setHueSat(this.curAlg.pixels)
    this.startTransition()
    this.timer.updateFps(this.transitionAlg.refreshRate())
    this.frameGenerator.broadcastSync(this.timer)
  }

  private startTransition(): void {
    this.transitionAlg.reset(this.curAlg.pixels, this.nextAlg.pixels)
    this.curAlg = this.transitionAlg
  }

  isOff(): boolean {
    return this.curAlg === this.offAlg
  }

  isInTransition(): boolean {
    return this.curAlg === this.transitionAlg
  }

  setBrightness(value: number): void {
    this.status.setValue('brightness', Math.max(0, Math.min(1, value)))
  }

  setCycle(name: string): void {
    logger.info('Cycle changed', { cycle: name })
    this.cycleIndex = -1
    this.currentCycle = this.cycles.getCycle(name)
    this.status.setValue('current_cycle', name)
    if (this.status.getValue('running') && !this.isOff()) {
      this.nextAlgorithm()
    }
  }

  turnOn(): void {
    if (this.isOff()) {
      logger.info('Lights on')
      this.nextAlgorithm()
      this.status.setValue('running', true)
    }
  }

  turnOffCommand(): void {
    if (!this.isOff()) {
      this.turnOff()
      this.status.setValue('running', false)
    }
  }

  getStatus() {
    return this.status.properties
  }

  getCycleNames(): string[] {
    return this.cycles.cycleNames
  }

  async start(): Promise<void> {
    this.running = true
    while (this.running) {
      await this.tick()
      await this.timer.sleep()
    }
  }

  stop(): void {
    this.running = false
  }

  private async tick(): Promise<void> {
    const now = Date.now()
    const idealFrameMs = 1000 / this.timer.fps
    const sinceLastChange = (now - this.lastChangeTime) / 1000

    if (!this.isOff()) {
      const done = this.curAlg.runCycle(idealFrameMs, idealFrameMs / 1000)
      this.pixels = this.curAlg.pixels

      await this.frameGenerator.sendFrame(this.pixels, this.status.getValue('brightness'))

      if (done) {
        this.curAlg = this.nextAlg
        this.lastChangeTime = now
        this.timer.updateFps(this.curAlg.refreshRate())
      } else if (!this.isInTransition() && sinceLastChange > this.nextCycleLength) {
        this.nextAlgorithm()
      }
    }
  }
}
