import SunCalc from 'suncalc'
import type { SolarEventName, ScheduleTime, SolarRelativeTime } from './types'
import { isSolarRelativeTime } from './types'

const SUNCALC_MAP: Record<SolarEventName, keyof SunCalc.GetTimesResult> = {
    astronomical_dawn: 'nightEnd',
    nautical_dawn: 'nauticalDawn',
    civil_dawn: 'dawn',
    sunrise: 'sunrise',
    solar_noon: 'solarNoon',
    sunset: 'sunset',
    civil_dusk: 'dusk',
    nautical_dusk: 'nauticalDusk',
    astronomical_dusk: 'night',
}

export function getSolarTimes(
    date: Date,
    lat: number,
    lng: number,
): Partial<Record<SolarEventName, Date>> {
    const raw = SunCalc.getTimes(date, lat, lng)
    const result: Partial<Record<SolarEventName, Date>> = {}
    for (const [name, key] of Object.entries(SUNCALC_MAP) as [SolarEventName, keyof SunCalc.GetTimesResult][]) {
        const d = raw[key] as Date
        if (!isNaN(d.getTime())) {
            result[name] = d
        }
    }
    return result
}

/** Parse "HH:mm" and apply it as time-of-day on referenceDate (local time) */
function parseAbsoluteTime(hhmm: string, referenceDate: Date): Date | null {
    const match = hhmm.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return null
    const h = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    if (h > 23 || m > 59) return null
    const result = new Date(referenceDate)
    result.setHours(h, m, 0, 0)
    return result
}

export function resolveTime(
    t: ScheduleTime,
    solarTimes: Partial<Record<SolarEventName, Date>>,
    referenceDate: Date,
): Date | null {
    if (isSolarRelativeTime(t)) {
        const base = solarTimes[t.event]
        if (!base) return null
        const offset = (t as SolarRelativeTime).offsetMinutes ?? 0
        return new Date(base.getTime() + offset * 60_000)
    }
    return parseAbsoluteTime(t as string, referenceDate)
}

/** Convert a Date to minutes since midnight (local time) */
export function toMinutesSinceMidnight(d: Date): number {
    return d.getHours() * 60 + d.getMinutes()
}

/** Format a Date as "HH:mm" in local time */
export function formatTime(d: Date): string {
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
}
