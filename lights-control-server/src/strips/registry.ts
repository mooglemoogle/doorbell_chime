import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { homedir } from 'os'

export interface PhysicalLocation {
  x: number
  y: number
  z: number
}

export interface StripRegistryEntry {
  stripId: string
  numPixels: number
  bpp: 3 | 4
  physical: {
    length_meters: number
    location: {
      start: PhysicalLocation
      end: PhysicalLocation
    }
  }
}

export interface ResolvedStrip extends StripRegistryEntry {
  /** Offset of this strip's first pixel in the global virtual pixel array */
  pixelOffset: number
}

export class StripRegistry {
  private entryMap = new Map<string, StripRegistryEntry>()
  private readonly savePath: string

  strips: ResolvedStrip[] = []
  totalPixels = 0

  constructor(savePath = join(homedir(), '.local', 'lights-control', 'strips_config.json')) {
    this.savePath = savePath
    mkdirSync(dirname(savePath), { recursive: true })
    if (existsSync(savePath)) {
      const entries = JSON.parse(readFileSync(savePath, 'utf-8')) as StripRegistryEntry[]
      for (const entry of entries) this.entryMap.set(entry.stripId, entry)
      this.recompute()
      console.log(`Loaded ${this.entryMap.size} strip(s) from ${savePath} (${this.totalPixels}px total)`)
    } else {
      console.log('No strips_config.json found — waiting for strips to register')
    }
  }

  /**
   * Register or update a strip's config. Returns true if the total pixel
   * count changed (the animation runner should be restarted).
   */
  registerStrip(entry: StripRegistryEntry): boolean {
    const prevTotal = this.totalPixels
    this.entryMap.set(entry.stripId, entry)
    this.recompute()
    this.save()

    if (this.totalPixels !== prevTotal) {
      console.log(`Strip layout changed: totalPixels ${prevTotal} → ${this.totalPixels}`)
      return true
    }
    return false
  }

  getStrip(stripId: string): ResolvedStrip | undefined {
    return this.strips.find(s => s.stripId === stripId)
  }

  private recompute(): void {
    const entries = Array.from(this.entryMap.values())
    // Sort left-to-right by start.x, then start.y, then start.z
    entries.sort((a, b) => {
      const ax = a.physical.location.start.x, bx = b.physical.location.start.x
      if (ax !== bx) return ax - bx
      const ay = a.physical.location.start.y, by = b.physical.location.start.y
      if (ay !== by) return ay - by
      return a.physical.location.start.z - b.physical.location.start.z
    })

    let offset = 0
    this.strips = entries.map(entry => {
      const resolved: ResolvedStrip = { ...entry, pixelOffset: offset }
      offset += entry.numPixels
      return resolved
    })
    this.totalPixels = offset
  }

  private save(): void {
    const entries = Array.from(this.entryMap.values())
    writeFileSync(this.savePath, JSON.stringify(entries, null, 2))
  }
}
