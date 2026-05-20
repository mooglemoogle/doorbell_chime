import { getSolarTimes, resolveTime, toMinutesSinceMidnight, formatTime } from '../../scheduler/solarTimes'
import type { SolarRelativeTime } from '../../scheduler/types'

// New York City coordinates, summer solstice date (all solar events present)
const NYC_LAT = 40.7128
const NYC_LNG = -74.006
const SUMMER_DATE = new Date('2024-06-21T12:00:00') // local noon

describe('getSolarTimes', () => {
    test('returns valid Date objects for all standard events at NYC in summer', () => {
        const times = getSolarTimes(SUMMER_DATE, NYC_LAT, NYC_LNG)
        expect(times.sunrise).toBeInstanceOf(Date)
        expect(times.sunset).toBeInstanceOf(Date)
        expect(times.civil_dawn).toBeInstanceOf(Date)
        expect(times.civil_dusk).toBeInstanceOf(Date)
        expect(times.nautical_dawn).toBeInstanceOf(Date)
        expect(times.nautical_dusk).toBeInstanceOf(Date)
        expect(times.solar_noon).toBeInstanceOf(Date)
        // astronomical events may or may not be present in summer at NYC
    })

    test('sunrise is before solar_noon which is before sunset', () => {
        const times = getSolarTimes(SUMMER_DATE, NYC_LAT, NYC_LNG)
        expect(times.sunrise!.getTime()).toBeLessThan(times.solar_noon!.getTime())
        expect(times.solar_noon!.getTime()).toBeLessThan(times.sunset!.getTime())
    })

    test('dawn order: astronomical < nautical < civil < sunrise', () => {
        const times = getSolarTimes(SUMMER_DATE, NYC_LAT, NYC_LNG)
        if (times.astronomical_dawn && times.nautical_dawn) {
            expect(times.astronomical_dawn.getTime()).toBeLessThan(times.nautical_dawn.getTime())
        }
        if (times.nautical_dawn && times.civil_dawn) {
            expect(times.nautical_dawn.getTime()).toBeLessThan(times.civil_dawn.getTime())
        }
        expect(times.civil_dawn!.getTime()).toBeLessThan(times.sunrise!.getTime())
    })

    test('does not include NaN dates', () => {
        // Extreme latitude where some events may not occur - just ensure no NaN values returned
        const extremeLat = 71 // Above Arctic Circle
        const winterDate = new Date('2024-12-21T12:00:00')
        const times = getSolarTimes(winterDate, extremeLat, 25)
        for (const [, val] of Object.entries(times)) {
            expect(isNaN((val as Date).getTime())).toBe(false)
        }
    })
})

describe('resolveTime', () => {
    const refDate = new Date('2024-06-21T00:00:00')
    const solarTimes = getSolarTimes(SUMMER_DATE, NYC_LAT, NYC_LNG)

    test('resolves absolute "HH:mm" to correct time on reference date', () => {
        const result = resolveTime('14:30', solarTimes, refDate)
        expect(result).not.toBeNull()
        expect(result!.getHours()).toBe(14)
        expect(result!.getMinutes()).toBe(30)
    })

    test('resolves solar event to the computed date', () => {
        const result = resolveTime({ event: 'sunrise' } as SolarRelativeTime, solarTimes, refDate)
        expect(result).not.toBeNull()
        expect(result!.getTime()).toBe(solarTimes.sunrise!.getTime())
    })

    test('applies positive offset minutes to solar event', () => {
        const result = resolveTime({ event: 'sunrise', offsetMinutes: 30 } as SolarRelativeTime, solarTimes, refDate)
        expect(result).not.toBeNull()
        expect(result!.getTime()).toBe(solarTimes.sunrise!.getTime() + 30 * 60_000)
    })

    test('applies negative offset minutes to solar event', () => {
        const result = resolveTime({ event: 'sunset', offsetMinutes: -15 } as SolarRelativeTime, solarTimes, refDate)
        expect(result).not.toBeNull()
        expect(result!.getTime()).toBe(solarTimes.sunset!.getTime() - 15 * 60_000)
    })

    test('returns null for absent solar event', () => {
        const emptySolarTimes = {}
        const result = resolveTime({ event: 'astronomical_dawn' } as SolarRelativeTime, emptySolarTimes, refDate)
        expect(result).toBeNull()
    })

    test('returns null for invalid absolute time format', () => {
        expect(resolveTime('25:00', solarTimes, refDate)).toBeNull()
        expect(resolveTime('abc', solarTimes, refDate)).toBeNull()
    })
})

describe('toMinutesSinceMidnight', () => {
    test('returns 0 for midnight', () => {
        const d = new Date('2024-01-01T00:00:00')
        expect(toMinutesSinceMidnight(d)).toBe(0)
    })

    test('returns 90 for 01:30', () => {
        const d = new Date('2024-01-01T01:30:00')
        expect(toMinutesSinceMidnight(d)).toBe(90)
    })
})

describe('formatTime', () => {
    test('formats with leading zeros', () => {
        const d = new Date('2024-01-01T07:05:00')
        expect(formatTime(d)).toBe('07:05')
    })
})
