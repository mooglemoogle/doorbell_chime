import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { DATA_DIR } from '../dataDir'
import type { ScheduleConfigProperties } from './types'

const defaultConfig: ScheduleConfigProperties = {
    enabled: false,
    location: { latitude: null, longitude: null },
    dailyWindows: [],
    brightnessKeyframes: [],
    calendarOverrides: [],
}

export class SchedulerConfig {
    properties: ScheduleConfigProperties
    private readonly filePath: string
    private debounceTimer: ReturnType<typeof setTimeout> | null = null

    constructor(filePath = join(DATA_DIR, 'schedule.json')) {
        this.filePath = filePath
        mkdirSync(dirname(this.filePath), { recursive: true })
        this.properties = this.load()
    }

    getValue<K extends keyof ScheduleConfigProperties>(key: K): ScheduleConfigProperties[K] {
        return this.properties[key]
    }

    setValue<K extends keyof ScheduleConfigProperties>(key: K, value: ScheduleConfigProperties[K]): void {
        this.properties[key] = value
        this.debouncedSave()
    }

    private debouncedSave(): void {
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer)
        this.debounceTimer = setTimeout(() => {
            writeFileSync(this.filePath, JSON.stringify(this.properties, null, 4))
            this.debounceTimer = null
        }, 500)
    }

    private load(): ScheduleConfigProperties {
        let data: Partial<ScheduleConfigProperties> = {}
        if (existsSync(this.filePath)) {
            data = JSON.parse(readFileSync(this.filePath, 'utf-8')) as Partial<ScheduleConfigProperties>
        }
        const result = {} as ScheduleConfigProperties
        for (const key of Object.keys(defaultConfig) as (keyof ScheduleConfigProperties)[]) {
            // @ts-expect-error dynamic key assignment
            result[key] = key in data ? data[key] : defaultConfig[key]
        }
        return result
    }
}
