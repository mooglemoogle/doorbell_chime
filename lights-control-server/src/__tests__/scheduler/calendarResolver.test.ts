import { resolveCalendarOverride } from '../../scheduler/calendarResolver'
import type { CalendarOverride } from '../../scheduler/types'

function date(str: string): Date {
    // Parse as local date to avoid UTC offset issues
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
}

describe('resolveCalendarOverride', () => {
    describe('no match', () => {
        test('returns null when no overrides', () => {
            expect(resolveCalendarOverride(date('2024-06-15'), [])).toBeNull()
        })

        test('returns null when date does not match any override', () => {
            const overrides: CalendarOverride[] = [
                { type: 'annual', date: '12-25', cycle: 'christmas', priority: 0 },
            ]
            expect(resolveCalendarOverride(date('2024-06-15'), overrides)).toBeNull()
        })
    })

    describe('annual override', () => {
        test('matches MM-DD on any year', () => {
            const o: CalendarOverride = { type: 'annual', date: '12-25', cycle: 'christmas', priority: 0 }
            expect(resolveCalendarOverride(date('2024-12-25'), [o])).toBe(o)
            expect(resolveCalendarOverride(date('2023-12-25'), [o])).toBe(o)
        })

        test('does not match different date', () => {
            const o: CalendarOverride = { type: 'annual', date: '12-25', cycle: 'christmas', priority: 0 }
            expect(resolveCalendarOverride(date('2024-12-26'), [o])).toBeNull()
        })
    })

    describe('range override', () => {
        test('matches date within forward range', () => {
            const o: CalendarOverride = { type: 'range', startDate: '12-01', endDate: '12-31', cycle: 'christmas', priority: 0 }
            expect(resolveCalendarOverride(date('2024-12-15'), [o])).toBe(o)
            expect(resolveCalendarOverride(date('2024-12-01'), [o])).toBe(o)
            expect(resolveCalendarOverride(date('2024-12-31'), [o])).toBe(o)
        })

        test('does not match outside forward range', () => {
            const o: CalendarOverride = { type: 'range', startDate: '12-01', endDate: '12-31', cycle: 'christmas', priority: 0 }
            expect(resolveCalendarOverride(date('2024-11-30'), [o])).toBeNull()
            expect(resolveCalendarOverride(date('2025-01-01'), [o])).toBeNull()
        })

        test('matches date within wrap-around range (Dec into Jan)', () => {
            const o: CalendarOverride = { type: 'range', startDate: '12-26', endDate: '01-06', cycle: 'christmas', priority: 0 }
            expect(resolveCalendarOverride(date('2024-12-28'), [o])).toBe(o)
            expect(resolveCalendarOverride(date('2025-01-03'), [o])).toBe(o)
            expect(resolveCalendarOverride(date('2024-12-26'), [o])).toBe(o)
            expect(resolveCalendarOverride(date('2025-01-06'), [o])).toBe(o)
        })

        test('does not match outside wrap-around range', () => {
            const o: CalendarOverride = { type: 'range', startDate: '12-26', endDate: '01-06', cycle: 'christmas', priority: 0 }
            expect(resolveCalendarOverride(date('2024-12-25'), [o])).toBeNull()
            expect(resolveCalendarOverride(date('2025-01-07'), [o])).toBeNull()
        })
    })

    describe('specific override', () => {
        test('matches exact YYYY-MM-DD', () => {
            const o: CalendarOverride = { type: 'specific', date: '2024-07-04', cycle: 'usa_usa', priority: 0 }
            expect(resolveCalendarOverride(date('2024-07-04'), [o])).toBe(o)
        })

        test('does not match different year', () => {
            const o: CalendarOverride = { type: 'specific', date: '2024-07-04', cycle: 'usa_usa', priority: 0 }
            expect(resolveCalendarOverride(date('2025-07-04'), [o])).toBeNull()
        })
    })

    describe('priority resolution', () => {
        test('specific beats range beats annual', () => {
            const annual: CalendarOverride = { type: 'annual', date: '12-25', cycle: 'annual-cycle', priority: 10 }
            const range: CalendarOverride = { type: 'range', startDate: '12-01', endDate: '12-31', cycle: 'range-cycle', priority: 10 }
            const specific: CalendarOverride = { type: 'specific', date: '2024-12-25', cycle: 'specific-cycle', priority: 0 }
            const result = resolveCalendarOverride(date('2024-12-25'), [annual, range, specific])
            expect(result).toBe(specific)
        })

        test('range beats annual when no specific', () => {
            const annual: CalendarOverride = { type: 'annual', date: '12-25', cycle: 'annual-cycle', priority: 10 }
            const range: CalendarOverride = { type: 'range', startDate: '12-01', endDate: '12-31', cycle: 'range-cycle', priority: 0 }
            const result = resolveCalendarOverride(date('2024-12-25'), [annual, range])
            expect(result).toBe(range)
        })

        test('higher user priority wins within same type', () => {
            const low: CalendarOverride = { type: 'annual', date: '12-25', cycle: 'low', priority: 0 }
            const high: CalendarOverride = { type: 'annual', date: '12-25', cycle: 'high', priority: 5 }
            const result = resolveCalendarOverride(date('2024-12-25'), [low, high])
            expect(result).toBe(high)
        })

        test('first in definition order wins on equal priority within same type', () => {
            const first: CalendarOverride = { type: 'annual', date: '12-25', cycle: 'first', priority: 0 }
            const second: CalendarOverride = { type: 'annual', date: '12-25', cycle: 'second', priority: 0 }
            const result = resolveCalendarOverride(date('2024-12-25'), [first, second])
            expect(result).toBe(first)
        })

        test('cycle: null is a valid override (turn off)', () => {
            const o: CalendarOverride = { type: 'annual', date: '03-15', cycle: null, priority: 0 }
            const result = resolveCalendarOverride(date('2024-03-15'), [o])
            expect(result).not.toBeNull()
            expect(result!.cycle).toBeNull()
        })
    })
})
