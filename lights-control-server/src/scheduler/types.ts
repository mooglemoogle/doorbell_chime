export type SolarEventName =
    | 'astronomical_dawn'
    | 'nautical_dawn'
    | 'civil_dawn'
    | 'sunrise'
    | 'solar_noon'
    | 'sunset'
    | 'civil_dusk'
    | 'nautical_dusk'
    | 'astronomical_dusk'

/** Absolute 24-hour time as "HH:mm" */
export type AbsoluteTime = string

export interface SolarRelativeTime {
    event: SolarEventName
    offsetMinutes?: number // positive = after, negative = before
}

export type ScheduleTime = AbsoluteTime | SolarRelativeTime

export function isSolarRelativeTime(t: ScheduleTime): t is SolarRelativeTime {
    return typeof t === 'object' && 'event' in t
}

/** A single on/off window within a day. offTime null = runs until end of day */
export interface DailyWindow {
    onTime: ScheduleTime
    offTime: ScheduleTime | null
}

/** Array of windows; lights are on if now falls inside any window. Empty = always off */
export type DailySchedule = DailyWindow[]

export interface BrightnessKeyframe {
    time: ScheduleTime
    brightness: number // 0.0–1.0
}

export interface AnnualOverride {
    type: 'annual'
    date: string // "MM-DD"
    cycle: string | null
    priority: number
}

export interface RangeOverride {
    type: 'range'
    startDate: string // "MM-DD"
    endDate: string // "MM-DD"
    cycle: string | null
    priority: number
}

export interface SpecificOverride {
    type: 'specific'
    date: string // "YYYY-MM-DD"
    cycle: string | null
    priority: number
}

export type CalendarOverride = AnnualOverride | RangeOverride | SpecificOverride

export interface ScheduleConfigProperties {
    enabled: boolean
    location: { latitude: number | null; longitude: number | null }
    dailyWindows: DailySchedule
    brightnessKeyframes: BrightnessKeyframe[]
    calendarOverrides: CalendarOverride[]
}

// Preview API response types

export interface ResolvedSolarTimes {
    date: string // "YYYY-MM-DD"
    times: Partial<Record<SolarEventName, string>> // "HH:mm" or absent if event doesn't occur
}

export interface ResolvedBrightnessPoint {
    time: string // "HH:mm"
    brightness: number
    source: 'keyframe' | 'interpolated'
}

export interface ResolvedWindow {
    onTime: string | null // "HH:mm" or null if solar event absent
    offTime: string | null
}

export interface SchedulePreview {
    solarTimes: ResolvedSolarTimes
    brightnessSchedule: ResolvedBrightnessPoint[]
    resolvedWindows: ResolvedWindow[]
    activeOverride: CalendarOverride | null
}
