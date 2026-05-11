import { readFileSync } from 'fs'

export interface CycleEntry {
  algorithm: string
  seconds_in_cycle: number
  options: Record<string, unknown>
}

export class Cycle {
  name: string = ''
  cycles: CycleEntry[] = []

  constructor(cycleConfigPath: string) {
    const data = JSON.parse(readFileSync(cycleConfigPath, 'utf-8')) as {
      name: string
      cycles: CycleEntry[]
    }
    this.name = data.name
    this.cycles = data.cycles
  }
}
