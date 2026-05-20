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

export const SOLAR_EVENT_LABELS: Record<SolarEventName, string> = {
    astronomical_dawn: 'Astronomical Dawn',
    nautical_dawn: 'Nautical Dawn',
    civil_dawn: 'Civil Dawn',
    sunrise: 'Sunrise',
    solar_noon: 'Solar Noon',
    sunset: 'Sunset',
    civil_dusk: 'Civil Dusk',
    nautical_dusk: 'Nautical Dusk',
    astronomical_dusk: 'Astronomical Dusk',
}

export const SOLAR_EVENT_NAMES: SolarEventName[] = [
    'astronomical_dawn',
    'nautical_dawn',
    'civil_dawn',
    'sunrise',
    'solar_noon',
    'sunset',
    'civil_dusk',
    'nautical_dusk',
    'astronomical_dusk',
]

export type AbsoluteTime = string // "HH:mm"

export interface SolarRelativeTime {
    event: SolarEventName
    offsetMinutes?: number
}

export type ScheduleTime = AbsoluteTime | SolarRelativeTime

export function isSolarRelativeTime(t: ScheduleTime): t is SolarRelativeTime {
    return typeof t === 'object' && 'event' in t
}

export interface DailyWindow {
    onTime: ScheduleTime
    offTime: ScheduleTime | null
}

export interface BrightnessKeyframe {
    time: ScheduleTime
    brightness: number
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

export interface ScheduleConfig {
    enabled: boolean
    location: { latitude: number | null; longitude: number | null }
    dailyWindows: DailyWindow[]
    brightnessKeyframes: BrightnessKeyframe[]
    calendarOverrides: CalendarOverride[]
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
    enabled: false,
    location: { latitude: null, longitude: null },
    dailyWindows: [],
    brightnessKeyframes: [],
    calendarOverrides: [],
}

// Preview types

export interface ResolvedSolarTimes {
    date: string
    times: Partial<Record<SolarEventName, string>>
}

export interface ResolvedBrightnessPoint {
    time: string
    brightness: number
    source: 'keyframe' | 'interpolated'
}

export interface ResolvedWindow {
    onTime: string | null
    offTime: string | null
}

export interface SchedulePreview {
    solarTimes: ResolvedSolarTimes
    brightnessSchedule: ResolvedBrightnessPoint[]
    resolvedWindows: ResolvedWindow[]
    activeOverride: CalendarOverride | null
}
