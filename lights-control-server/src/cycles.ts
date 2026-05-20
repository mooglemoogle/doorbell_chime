import { readdirSync, existsSync, statSync, mkdirSync, writeFileSync, copyFileSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'
import { Cycle, CycleEntry } from './cycle'

export class Cycles {
  cycles: Cycle[] = []
  cycleNames: string[] = []
  private cycleMap: Map<string, Cycle> = new Map()
  private readonly sourceDir: string
  private readonly defaultCyclesDir: string
  private readonly userCyclesDir: string

  constructor(
    cycleDirectory = './cycles',
    localDataDir = join(homedir(), '.local', 'lights-control'),
  ) {
    this.sourceDir = resolve(cycleDirectory)
    this.defaultCyclesDir = join(localDataDir, 'default_cycles')
    this.userCyclesDir = join(localDataDir, 'user_cycles')
    mkdirSync(this.defaultCyclesDir, { recursive: true })
    mkdirSync(this.userCyclesDir, { recursive: true })
    this.copyDefaultCycles()
    this.reloadCycles()
  }

  private copyDefaultCycles(): void {
    if (!existsSync(this.sourceDir) || !statSync(this.sourceDir).isDirectory()) {
      throw new Error(`Cycles source directory does not exist or is not a directory: ${this.sourceDir}`)
    }
    const files = readdirSync(this.sourceDir).filter(f => f.endsWith('.json'))
    for (const file of files) {
      copyFileSync(join(this.sourceDir, file), join(this.defaultCyclesDir, file))
    }
  }

  reloadCycles(): void {
    const loadDir = (dir: string): Cycle[] => {
      if (!existsSync(dir) || !statSync(dir).isDirectory()) return []
      return readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => new Cycle(join(dir, f)))
    }

    // User cycles override defaults by cycle name
    const map = new Map<string, Cycle>()
    for (const c of loadDir(this.defaultCyclesDir)) map.set(c.name, c)
    for (const c of loadDir(this.userCyclesDir)) map.set(c.name, c)

    this.cycleMap = map
    this.cycles = [...map.values()]
    this.cycleNames = this.cycles.map(c => c.name)
  }

  getCycle(name: string): Cycle {
    return this.cycleMap.get(name) ?? this.getDefaultCycle()
  }

  saveCycle(cycle: { name: string; cycles: CycleEntry[] }): void {
    const slug = cycle.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const filePath = join(this.userCyclesDir, `${slug}.json`)
    writeFileSync(filePath, JSON.stringify(cycle, null, 2))
    this.reloadCycles()
  }

  private getDefaultCycle(): Cycle {
    return (
      this.cycleMap.get('Default') ??
      this.cycleMap.get('default') ??
      this.cycles[0]
    )
  }
}
