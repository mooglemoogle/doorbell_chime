import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { DATA_DIR } from './dataDir'

export interface StatusProperties {
  brightness: number
  transition_time: number
  running: boolean
  current_cycle: string
}

const defaultStatus: StatusProperties = {
  brightness: 0.5,
  transition_time: 2000,
  running: false,
  current_cycle: 'Default',
}

export class Status {
  properties: StatusProperties
  private readonly statusFilePath: string
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(statusFilePath = join(DATA_DIR, 'status.json')) {
    this.statusFilePath = statusFilePath
    mkdirSync(dirname(this.statusFilePath), { recursive: true })
    this.properties = this.loadStatusFile()
  }

  getValue<K extends keyof StatusProperties>(key: K): StatusProperties[K] {
    return this.properties[key]
  }

  setValue<K extends keyof StatusProperties>(key: K, value: StatusProperties[K]): void {
    this.properties[key] = value
    this.debouncedSave()
  }

  private debouncedSave(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      writeFileSync(this.statusFilePath, JSON.stringify(this.properties, null, 4))
      this.debounceTimer = null
    }, 500)
  }

  private loadStatusFile(): StatusProperties {
    let data: Partial<StatusProperties> = {}

    if (existsSync(this.statusFilePath)) {
      data = JSON.parse(readFileSync(this.statusFilePath, 'utf-8')) as Partial<StatusProperties>
    }

    const result = {} as StatusProperties
    for (const key of Object.keys(defaultStatus) as (keyof StatusProperties)[]) {
      // @ts-expect-error dynamic key assignment
      result[key] = key in data ? data[key] : defaultStatus[key]
    }
    return result
  }
}
