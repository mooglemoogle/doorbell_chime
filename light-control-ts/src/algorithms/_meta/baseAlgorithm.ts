import { Pixel } from './pixel.js'

export interface AlgorithmConfig {
  name: string
  refresh_rate: number
  options: Record<string, unknown>
}

export class BaseAlgorithm {
  readonly name: string
  pixels: Pixel[]
  protected readonly config: AlgorithmConfig
  private readonly algSettings: Record<string, unknown>

  constructor(numPixels: number, config: AlgorithmConfig, settings: Record<string, unknown>) {
    this.name = config.name
    this.config = config
    this.algSettings = settings
    this.pixels = Array.from({ length: numPixels }, () => new Pixel())
  }

  refreshRate(): number {
    return (this.algSettings['refresh_rate'] as number | undefined) ?? this.config.refresh_rate
  }

  settings(): Record<string, unknown> {
    return this.algSettings
  }

  // Returns true when the algorithm signals completion (used by transition)
  runCycle(_elapsedMillis: number, _elapsedSeconds: number): boolean {
    return false
  }
}
