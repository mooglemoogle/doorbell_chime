import { readdirSync, existsSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { Cycle } from './cycle.js'

export class Cycles {
  cycles: Cycle[] = []
  cycleNames: string[] = []
  private cycleMap: Map<string, Cycle> = new Map()
  private readonly cycleDirectory: string

  constructor(cycleDirectory = './cycles') {
    this.cycleDirectory = resolve(cycleDirectory)
    this.reloadCycles()
  }

  reloadCycles(): void {
    if (!existsSync(this.cycleDirectory) || !statSync(this.cycleDirectory).isDirectory()) {
      throw new Error('cycles directory does not exist or is not a directory')
    }

    const files = readdirSync(this.cycleDirectory)
    this.cycles = files.map(file => new Cycle(join(this.cycleDirectory, file)))
    this.cycleNames = this.cycles.map(c => c.name)
    this.cycleMap = new Map(this.cycles.map(c => [c.name, c]))
  }

  getCycle(name: string): Cycle {
    return this.cycleMap.get(name) ?? this.getDefaultCycle()
  }

  private getDefaultCycle(): Cycle {
    return (
      this.cycleMap.get('Default') ??
      this.cycleMap.get('default') ??
      this.cycles[0]
    )
  }
}
