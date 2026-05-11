import { BaseAlgorithm } from '../_meta/index'
import { config } from './config'

const MAX_WAVE_PERC = 0.1
const WAVE_SIZE_SPEED = 7
const TAU_BY_WAVE_SIZE = (2 * Math.PI) / WAVE_SIZE_SPEED
const WAVE_SPEED = 3
const TAU_BY_WAVE = (2 * Math.PI) / WAVE_SPEED

interface FlagPartConfig {
  color: number[]
  parts: number
}

class FlagPart {
  readonly color: number[]
  readonly splitPos: number
  readonly maxWaveSize: number
  private currentWavePos: number
  private currentWaveSizePos: number

  constructor(flagPart: FlagPartConfig, totalParts: number, numPixels: number, priorPercentage: number) {
    this.color = flagPart.color
    const percentage = flagPart.parts / totalParts
    const totalPassed = priorPercentage + percentage
    this.splitPos = Math.floor(numPixels * totalPassed)
    this.maxWaveSize = Math.floor(numPixels * percentage * MAX_WAVE_PERC)
    this.currentWavePos = Math.random() * WAVE_SPEED
    this.currentWaveSizePos = Math.random() * WAVE_SIZE_SPEED
  }

  updateSplitPos(elapsedSeconds: number): void {
    this.currentWavePos += elapsedSeconds
    if (this.currentWavePos > WAVE_SPEED) this.currentWavePos -= WAVE_SPEED

    this.currentWaveSizePos += elapsedSeconds
    if (this.currentWaveSizePos > WAVE_SIZE_SPEED) this.currentWaveSizePos -= WAVE_SIZE_SPEED
  }

  private getMaxWaveSize(): number {
    return Math.sin(this.currentWaveSizePos * TAU_BY_WAVE_SIZE) * this.maxWaveSize
  }

  private getWaveSize(): number {
    return Math.sin(this.currentWavePos * TAU_BY_WAVE) * this.getMaxWaveSize()
  }

  getSplitPos(): number {
    return Math.floor(this.splitPos + this.getWaveSize())
  }
}

export class Algorithm extends BaseAlgorithm {
  private readonly flagParts: FlagPart[]

  constructor(numPixels: number, settings: Record<string, unknown>) {
    super(numPixels, config, settings)
    const flagPartConfigs = settings['flag_parts'] as FlagPartConfig[]
    const totalParts = flagPartConfigs.reduce((sum, p) => sum + (p.parts || 1), 0)
    const numParts = flagPartConfigs.length

    let totalPerc = 0
    this.flagParts = []
    for (let i = 0; i < numParts; i++) {
      const part = new FlagPart(flagPartConfigs[i], totalParts, this.pixels.length, totalPerc)
      totalPerc += flagPartConfigs[i].parts / totalParts
      this.flagParts.push(part)
    }

    this.setColors()
  }

  private setColors(): void {
    let index = 0
    const numParts = this.flagParts.length

    for (let i = 0; i < numParts; i++) {
      const part = this.flagParts[i]
      const splitPos = i === numParts - 1 ? this.pixels.length : part.getSplitPos() + 1

      for (let n = index; n < splitPos; n++) {
        const pixel = this.pixels[n]
        const color = part.color
        pixel.set(color[0], color[1], color[2], color[3] ?? 0)
      }
      index = splitPos
    }
  }

  runCycle(_elapsedMillis: number, elapsedSeconds: number): boolean {
    for (const part of this.flagParts) part.updateSplitPos(elapsedSeconds)
    this.setColors()
    return super.runCycle(_elapsedMillis, elapsedSeconds)
  }
}
